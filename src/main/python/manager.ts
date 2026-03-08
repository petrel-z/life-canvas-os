/**
 * Python 进程管理器
 * 负责启动、停止和监控 Python 后端进程
 */
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'

import { app } from 'electron'

export class PythonManager {
  private process: ChildProcess | null = null
  private responseCallbacks = new Map<string, (response: any) => void>()
  private stdoutBuffer = Buffer.alloc(0) // 改用 Buffer
  public isReady = false

  /**
   * 启动 Python 后端进程
   */
  start() {
    const isDev = process.env.NODE_ENV === 'development'

    let pythonPath: string
    let args: string[]
    const userDataPath = app.getPath('userData')

    if (isDev) {
      // 开发环境：使用虚拟环境中的 Python
      // __dirname 在开发模式下指向 node_modules/.dev/main
      // 需要回到项目根目录
      const projectRoot = path.resolve(__dirname, '../../..')
      // Windows: venv/Scripts/python.exe, Linux/macOS: venv/bin/python3
      const isWindows = process.platform === 'win32'
      const pythonBinDir = isWindows ? 'Scripts' : 'bin'
      const pythonExe = isWindows ? 'python.exe' : 'python3'
      pythonPath = path.join(projectRoot, 'venv', pythonBinDir, pythonExe)
      const mainPyPath = path.join(projectRoot, 'backend', 'main.py')
      args = [mainPyPath, '--dev', '--data-dir', userDataPath]

      console.log('[Python Manager] Dev paths:', {
        projectRoot,
        pythonPath,
        mainPyPath,
        userDataPath,
      })
    } else {
      // 生产环境：使用打包的 Python 可执行文件
      // electron-builder extraResources 配置:
      // from: 'backend/dist/backend' -> to: 'python-runtime/backend'
      const backendName =
        process.platform === 'win32' ? 'backend.exe' : 'backend'
      pythonPath = path.join(
        process.resourcesPath,
        'python-runtime',
        backendName
      )
      // 传递 --data-dir 参数指定数据存储目录
      args = ['--data-dir', userDataPath]

      console.log('[Python Manager] Production mode, executable:', pythonPath)
    }

    console.log('[Python Manager] Starting Python:', {
      pythonPath,
      args,
      isDev,
    })

    this.process = spawn(pythonPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    // 监听 stdout（使用长度前缀协议）
    this.process.stdout?.on('data', data => {
      this.stdoutBuffer = Buffer.concat([this.stdoutBuffer, data])
      this.processBuffer()
    })

    // 监听 stderr（日志输出）
    this.process.stderr?.on('data', data => {
      try {
        console.error('[Python stderr]', data.toString())
      } catch (error) {
        // 忽略管道错误，防止应用崩溃
        if ((error as any)?.code !== 'EPIPE') {
          throw error
        }
      }
    })

    // 进程退出处理
    this.process.on('exit', code => {
      console.error(`[Python Manager] Process exited with code ${code}`)
      this.isReady = false

      // 非正常退出时自动重启
      if (code !== 0 && code !== null) {
        console.log('[Python Manager] Restarting in 2 seconds...')
        setTimeout(() => this.restart(), 2000)
      }
    })

    // 进程错误处理
    this.process.on('error', error => {
      console.error('[Python Manager] Process error:', error)
    })
  }

  /**
   * 处理 stdout 缓冲区（长度前缀协议）
   */
  private processBuffer() {
    while (true) {
      const newlineIndex = this.stdoutBuffer.indexOf('\n')
      if (newlineIndex === -1) break

      const lengthStr = this.stdoutBuffer
        .subarray(0, newlineIndex)
        .toString('utf-8')
      const length = parseInt(lengthStr, 10)

      if (Number.isNaN(length)) {
        // 不是长度前缀格式，可能是日志，跳过
        console.warn('[Python Manager] Skipping non-length line:', lengthStr)
        this.stdoutBuffer = this.stdoutBuffer.subarray(newlineIndex + 1)
        continue
      }

      const jsonStart = newlineIndex + 1
      const jsonEnd = jsonStart + length

      if (this.stdoutBuffer.length < jsonEnd) break // 数据不完整

      const jsonBytes = this.stdoutBuffer.subarray(jsonStart, jsonEnd)
      const jsonStr = jsonBytes.toString('utf-8')
      this.stdoutBuffer = this.stdoutBuffer.subarray(jsonEnd)

      try {
        const response = JSON.parse(jsonStr)
        this.handleResponse(response)
      } catch (e) {
        console.error('[Python Manager] Failed to parse response:', e)
        console.error('[Python Manager] Length:', length)
        console.error('[Python Manager] JSON bytes length:', jsonBytes.length)
        console.error(
          '[Python Manager] JSON string (first 500 chars):',
          jsonStr.substring(0, 500)
        )
        console.error(
          '[Python Manager] JSON string (last 100 chars):',
          jsonStr.substring(Math.max(0, jsonStr.length - 100))
        )
      }
    }
  }

  /**
   * 处理 Python 响应
   */
  private handleResponse(response: any) {
    // 处理健康检查响应
    if (response.action === 'pong') {
      this.isReady = true
      console.log('[Python Manager] Backend is ready')
      return
    }

    // 处理业务响应
    const callback = this.responseCallbacks.get(response.id)
    if (callback) {
      callback(response)
      this.responseCallbacks.delete(response.id)
    }
  }

  /**
   * 发送请求到 Python 后端
   */
  async sendRequest(
    action: string,
    params: any = {},
    timeout = 30000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${Math.random()}`
      const request = { id, action, params }

      // 设置超时
      const timer = setTimeout(() => {
        this.responseCallbacks.delete(id)
        reject(new Error(`Request timeout: ${action}`))
      }, timeout)

      // 注册回调
      this.responseCallbacks.set(id, response => {
        clearTimeout(timer)
        if (response.success) {
          resolve(response.data)
        } else {
          reject(new Error(response.error || 'Unknown error'))
        }
      })

      // 发送请求（长度前缀格式）
      const jsonStr = JSON.stringify(request)
      const jsonBytes = Buffer.from(jsonStr, 'utf-8')
      const lengthPrefix = Buffer.from(`${jsonBytes.length}\n`, 'utf-8')
      const message = Buffer.concat([lengthPrefix, jsonBytes])

      const process = this.process
      if (process?.stdin?.writable) {
        process.stdin.write(message, err => {
          // 处理 EPIPE 错误（管道已关闭）
          if (err && (err as any).code === 'EPIPE') {
            console.warn(
              '[Python Manager] EPIPE: Python process may have exited'
            )
            clearTimeout(timer)
            this.responseCallbacks.delete(id)
            reject(new Error('Python process is not running'))
          }
        })
      } else {
        clearTimeout(timer)
        this.responseCallbacks.delete(id)
        reject(new Error('Python process is not running'))
      }
    })
  }

  /**
   * 停止 Python 进程
   */
  stop() {
    if (this.process) {
      this.process.kill()
      this.process = null
      this.isReady = false
    }
  }

  /**
   * 重启 Python 进程
   */
  restart() {
    this.stop()
    setTimeout(() => this.start(), 1000)
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.sendRequest('ping', {}, 5000)
      return true
    } catch (_e) {
      return false
    }
  }
}

// 单例
export const pythonManager = new PythonManager()

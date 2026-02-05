/**
 * Python 进程管理器
 * 负责启动、停止和监控 Python 后端进程
 */
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { app } from 'electron'

export class PythonManager {
  private process: ChildProcess | null = null
  private responseCallbacks = new Map<string, (response: any) => void>()
  private stdoutBuffer = ''
  public isReady = false

  /**
   * 启动 Python 后端进程
   */
  start() {
    const isDev = process.env.NODE_ENV === 'development'

    let pythonPath: string
    let args: string[]

    if (isDev) {
      // 开发环境：使用虚拟环境中的 Python
      const projectRoot = path.resolve(__dirname, '../../..')
      pythonPath = path.join(projectRoot, 'venv', 'bin', 'python3')
      args = ['backend/main.py', '--dev']
    } else {
      // 生产环境：使用打包的 Python 可执行文件
      if (process.platform === 'darwin') {
        // macOS
        pythonPath = path.join(
          process.resourcesPath,
          'python-runtime',
          'backend'
        )
      } else if (process.platform === 'win32') {
        // Windows
        pythonPath = path.join(
          process.resourcesPath,
          'python-runtime',
          'backend.exe'
        )
      } else {
        // Linux
        pythonPath = path.join(
          process.resourcesPath,
          'python-runtime',
          'backend'
        )
      }
      // ⚠️ 临时使用 HTTP 模式便于测试（生产环境应该用 IPC）
      args = ['--dev']
    }

    console.log('[Python Manager] Starting Python:', { pythonPath, args, isDev })

    this.process = spawn(pythonPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    // 监听 stdout（使用长度前缀协议）
    this.process.stdout?.on('data', (data) => {
      this.stdoutBuffer += data.toString()
      this.processBuffer()
    })

    // 监听 stderr（日志输出）
    this.process.stderr?.on('data', (data) => {
      console.error('[Python stderr]', data.toString())
    })

    // 进程退出处理
    this.process.on('exit', (code) => {
      console.error(`[Python Manager] Process exited with code ${code}`)
      this.isReady = false

      // 非正常退出时自动重启
      if (code !== 0 && code !== null) {
        console.log('[Python Manager] Restarting in 2 seconds...')
        setTimeout(() => this.restart(), 2000)
      }
    })

    // 进程错误处理
    this.process.on('error', (error) => {
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

      const lengthStr = this.stdoutBuffer.slice(0, newlineIndex)
      const length = parseInt(lengthStr)

      if (isNaN(length)) {
        // 不是长度前缀格式，可能是日志，跳过
        this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1)
        continue
      }

      const jsonStart = newlineIndex + 1
      const jsonEnd = jsonStart + length

      if (this.stdoutBuffer.length < jsonEnd) break // 数据不完整

      const jsonStr = this.stdoutBuffer.slice(jsonStart, jsonEnd)
      this.stdoutBuffer = this.stdoutBuffer.slice(jsonEnd)

      try {
        const response = JSON.parse(jsonStr)
        this.handleResponse(response)
      } catch (e) {
        console.error('[Python Manager] Failed to parse response:', e)
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
      this.responseCallbacks.set(id, (response) => {
        clearTimeout(timer)
        if (response.success) {
          resolve(response.data)
        } else {
          reject(new Error(response.error || 'Unknown error'))
        }
      })

      // 发送请求（长度前缀格式）
      const jsonStr = JSON.stringify(request)
      const message = `${Buffer.byteLength(jsonStr)}\n${jsonStr}`

      if (this.process?.stdin.writable) {
        this.process.stdin.write(message)
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
    } catch (e) {
      return false
    }
  }
}

// 单例
export const pythonManager = new PythonManager()

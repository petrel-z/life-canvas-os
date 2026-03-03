/**
 * API 客户端 - 支持双模式（HTTP / IPC）
 * - 开发模式：使用 HTTP 请求到 localhost:8000
 * - 生产模式：通过 Electron IPC 调用 Python 后端
 */

const IS_DEV = process.env.NODE_ENV === 'development'

// HTTP 模式下的基础 URL
const HTTP_BASE_URL = 'http://127.0.0.1:8000'

/**
 * 执行 API 请求
 * @param endpoint - API 端点（如 '/api/user/profile'）
 * @param options - fetch 选项
 */
export async function apiRequest(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  // 生产模式：通过 IPC 调用后端
  if (!IS_DEV && window.App?.request) {
    const method = (options?.method || 'GET').toUpperCase()
    const body = options?.body ? JSON.parse(options.body as string) : {}

    // 使用通用 api_call action
    const result = await window.App.request('api_call', {
      action: `${method.toLowerCase()}_${endpoint.replace(/^\//, '').replace(/\//g, '_')}`,
      ...body,
    })

    if (result.success) {
      // 创建一个假的 Response 对象
      return new Response(JSON.stringify(result.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 处理错误响应
    // 检查 result.data 是否包含错误数据（有 code 字段）
    const errorData = result.data?.data || result.data || result.error
    const statusCode = errorData?.code || (result.data?.status === 'error' ? errorData?.code : 500)

    return new Response(JSON.stringify(errorData), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 开发模式：使用 HTTP
  const url = `${HTTP_BASE_URL}${endpoint}`
  return fetch(url, options)
}

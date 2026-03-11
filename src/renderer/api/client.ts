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
 * @param endpoint - API 端点（如 '/api/user/profile' 或 '/api/timeline?page=1&type=diary'）
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

    // 分离路径和查询参数
    const [path, queryString] = endpoint.split('?')
    const queryParams: Record<string, string> = {}
    if (queryString) {
      const searchParams = new URLSearchParams(queryString)
      searchParams.forEach((value, key) => {
        queryParams[key] = value
      })
    }

    // 使用通用 api_call action
    const action = `${method.toLowerCase()}_${path.replace(/^\//, '').replace(/\//g, '_')}`

    const result = await window.App.request('api_call', {
      action,
      ...queryParams, // 传递查询参数
      ...body,
    })

    console.log('[API] IPC Request:', { action, ...queryParams, ...body })
    console.log('[API] IPC Result:', result)

    // 修复：IPC 返回的数据可能包含 { success: true, data: ... } 的包装
    // 我们需要剥离这层包装，只返回真正的业务数据 (result.data)
    let responseBody = result
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      responseBody = result.data
    }

    return new Response(JSON.stringify(responseBody), {
      status: responseBody.code || 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 开发模式：使用 HTTP
  const url = `${HTTP_BASE_URL}${endpoint}`
  return fetch(url, options)
}

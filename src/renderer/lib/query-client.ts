/**
 * TanStack Query 客户端配置
 * 为未来的服务端状态管理准备
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * 创建 Query Client 实例
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据重新验证时间（毫秒）
      staleTime: 5 * 60 * 1000, // 5 分钟

      // 缓存时间（毫秒）
      gcTime: 10 * 60 * 1000, // 10 分钟

      // 重试配置
      retry: (failureCount, error: any) => {
        // 不重试 4xx 错误
        if (error?.code >= 400 && error?.code < 500) {
          return false;
        }
        // 最多重试 3 次
        return failureCount < 3;
      },

      // 重试延迟（毫秒）
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // 窗口聚焦时重新验证
      refetchOnWindowFocus: false,

      // 组件挂载时重新验证
      refetchOnMount: false,

      // 连接重连时重新验证
      refetchOnReconnect: true,
    },
    mutations: {
      // 变更重试
      retry: false,
    },
  },
});

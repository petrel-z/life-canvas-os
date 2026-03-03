import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 防抖 Hook
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒）
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖回调 Hook
 * @param callback 需要防抖的回调函数
 * @param delay 延迟时间（毫秒）
 * @param deps 依赖项数组
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500,
  deps: React.DependencyList = []
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  );
}

/**
 * 节流 Hook
 * @param value 需要节流的值
 * @param limit 时间间隔（毫秒）
 */
export function useThrottle<T>(value: T, limit: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * 节流回调 Hook
 * @param callback 需要节流的回调函数
 * @param limit 时间间隔（毫秒）
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number = 500
): (...args: Parameters<T>) => void {
  const lastRun = useRef<number>(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= limit) {
        callback(...args);
        lastRun.current = now;
      }
    },
    [callback, limit]
  );
}

/**
 * 防抖输入 Hook（专门用于搜索输入）
 * @param initialValue 初始值
 * @param delay 延迟时间（毫秒）
 */
export function useDebouncedInput(
  initialValue: string = '',
  delay: number = 500
) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  // 防抖更新
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [inputValue, delay]);

  return {
    inputValue,
    setInputValue,
    debouncedValue,
    // 检查是否正在等待防抖完成
    isDebouncing: inputValue !== debouncedValue,
  };
}

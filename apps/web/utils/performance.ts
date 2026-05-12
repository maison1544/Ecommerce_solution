import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 프로덕션 환경에서 console.log 비활성화
 */
const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDevelopment) console.warn(...args);
  },
  error: (...args: any[]) => {
    // 에러는 항상 기록
    console.error(...args);
  },
  debug: (...args: any[]) => {
    if (isDevelopment) console.debug(...args);
  },
};

/**
 * 디바운싱 훅 - 입력이 멈춘 후 지정된 시간이 지나면 함수 실행
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 디바운싱 콜백 훅 - 함수 실행을 지연
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * 쓰로틀링 훅 - 지정된 시간 간격으로만 함수 실행
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRun.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * Intersection Observer를 사용한 레이지 로딩 훅
 */
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  options?: IntersectionObserverInit
) {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
      }
    }, options);

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, callback, options]);
}

/**
 * 메모이제이션된 API 캐시
 */
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

export async function cachedFetch(
  url: string,
  options?: RequestInit,
  cacheKey?: string
): Promise<any> {
  const key = cacheKey || `${url}-${JSON.stringify(options)}`;
  const cached = apiCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return Promise.resolve(cached.data);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (response.ok) {
    apiCache.set(key, { data, timestamp: Date.now() });
  }

  return data;
}

/**
 * 캐시 클리어
 */
export function clearApiCache(pattern?: string) {
  if (pattern) {
    for (const key of apiCache.keys()) {
      if (key.includes(pattern)) {
        apiCache.delete(key);
      }
    }
  } else {
    apiCache.clear();
  }
}

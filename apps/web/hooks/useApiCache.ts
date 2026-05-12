import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  error?: Error;
}

interface UseApiCacheOptions {
  cacheTime?: number; // 캐시 유효 시간 (ms)
  staleTime?: number; // 데이터가 stale 되는 시간 (ms)
  retry?: number; // 재시도 횟수
  retryDelay?: number; // 재시도 지연 시간 (ms)
  enabled?: boolean; // API 호출 활성화 여부
}

// 전역 캐시 스토어
const globalCache = new Map<string, CacheEntry<any>>();

/**
 * API 캐싱 훅
 * - 중복 요청 방지
 * - 캐시 관리
 * - 자동 재시도
 * - 로딩 상태 관리
 */
export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiCacheOptions = {}
) {
  const {
    cacheTime = 5 * 60 * 1000, // 기본 5분
    staleTime = 30 * 1000, // 기본 30초
    retry = 3,
    retryDelay = 1000,
    enabled = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // 캐시에서 데이터 가져오기
  const getCachedData = useCallback(() => {
    const cached = globalCache.get(key);
    if (cached) {
      const now = Date.now();
      const age = now - cached.timestamp;

      if (age < cacheTime) {
        return {
          data: cached.data,
          isStale: age > staleTime,
        };
      }
    }
    return null;
  }, [key, cacheTime, staleTime]);

  // 데이터 페치
  const fetchData = useCallback(
    async (isBackground = false) => {
      // 이미 진행 중인 요청이 있으면 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      if (!isBackground) {
        setIsLoading(true);
      } else {
        setIsValidating(true);
      }

      setError(null);

      try {
        const result = await fetcher();

        // 캐시에 저장
        globalCache.set(key, {
          data: result,
          timestamp: Date.now(),
        });

        setData(result);
        retryCountRef.current = 0;

        return result;
      } catch (err) {
        const error = err as Error;

        // 재시도 로직
        if (retryCountRef.current < retry && error.name !== "AbortError") {
          retryCountRef.current++;
          setTimeout(() => {
            fetchData(isBackground);
          }, retryDelay * retryCountRef.current);
        } else {
          setError(error);
          retryCountRef.current = 0;
        }

        throw error;
      } finally {
        setIsLoading(false);
        setIsValidating(false);
      }
    },
    [fetcher, key, retry, retryDelay]
  );

  // 데이터 새로고침
  const refresh = useCallback(async () => {
    return fetchData(false);
  }, [fetchData]);

  // 백그라운드 재검증
  const revalidate = useCallback(async () => {
    return fetchData(true);
  }, [fetchData]);

  // 초기 데이터 로드
  useEffect(() => {
    if (!enabled) return;

    const cached = getCachedData();

    if (cached) {
      setData(cached.data);

      // stale 데이터면 백그라운드에서 재검증
      if (cached.isStale) {
        revalidate();
      }
    } else {
      // 캐시가 없으면 새로 페치
      fetchData(false);
    }

    // 클린업
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [key, enabled]); // fetcher는 의존성에서 제외 (무한 루프 방지)

  // 캐시 무효화
  const invalidate = useCallback(() => {
    globalCache.delete(key);
    return refresh();
  }, [key, refresh]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    refresh,
    revalidate,
    invalidate,
  };
}

/**
 * 캐시 관리 유틸리티
 */
export const cacheUtils = {
  // 특정 키의 캐시 삭제
  delete: (key: string) => {
    globalCache.delete(key);
  },

  // 패턴에 맞는 캐시 삭제
  deletePattern: (pattern: string | RegExp) => {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    for (const key of globalCache.keys()) {
      if (regex.test(key)) {
        globalCache.delete(key);
      }
    }
  },

  // 모든 캐시 삭제
  clear: () => {
    globalCache.clear();
  },

  // 캐시 크기 확인
  size: () => {
    return globalCache.size;
  },
};

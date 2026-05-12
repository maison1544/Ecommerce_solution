import { useState, useCallback } from 'react';

/**
 * 버튼 중복 클릭 방지를 위한 디바운스 훅
 * @param callback 실행할 함수
 * @param delay 지연 시간 (밀리초)
 * @returns [디바운스된 함수, 로딩 상태]
 */
export function useDebounceCallback<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delay: number = 1000
): [T, boolean] {
  const [isLoading, setIsLoading] = useState(false);

  const debouncedCallback = useCallback(
    async (...args: Parameters<T>) => {
      if (isLoading) return;
      
      setIsLoading(true);
      try {
        return await callback(...args);
      } finally {
        setTimeout(() => setIsLoading(false), delay);
      }
    },
    [callback, delay, isLoading]
  ) as T;

  return [debouncedCallback, isLoading];
}

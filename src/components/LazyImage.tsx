import { useState, useEffect, useRef, memo } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 최적화된 레이지 로딩 이미지 컴포넌트
 * - Intersection Observer를 사용한 레이지 로딩
 * - 로딩 중 placeholder 표시
 * - 에러 처리 및 fallback 이미지
 * - memo로 불필요한 리렌더링 방지
 */
export const LazyImage = memo(function LazyImage({
  src,
  alt,
  className = "",
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f0f0f0"/%3E%3C/svg%3E',
  onLoad,
  onError,
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 이미지 로드 시작
            const img = new Image();
            img.src = src;

            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
              onLoad?.();
            };

            img.onerror = () => {
              setHasError(true);
              setIsLoading(false);
              onError?.();
            };

            // 옵저버 해제
            if (imgRef.current) {
              observer.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: "50px", // 50px 전에 미리 로드 시작
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, onLoad, onError]);

  if (hasError) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
      >
        <span className="text-gray-400 text-sm">이미지 로드 실패</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoading ? "animate-pulse" : ""}`}
      loading="lazy"
    />
  );
});

/**
 * 배경 이미지용 레이지 로딩 컴포넌트
 */
export const LazyBackgroundImage = memo(function LazyBackgroundImage({
  src,
  className = "",
  children,
}: {
  src: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = src;
            img.onload = () => setIsLoaded(true);

            if (divRef.current) {
              observer.unobserve(divRef.current);
            }
          }
        });
      },
      {
        rootMargin: "50px",
        threshold: 0.01,
      }
    );

    if (divRef.current) {
      observer.observe(divRef.current);
    }

    return () => {
      if (divRef.current) {
        observer.unobserve(divRef.current);
      }
    };
  }, [src]);

  return (
    <div
      ref={divRef}
      className={className}
      style={{
        backgroundImage: isLoaded ? `url(${src})` : undefined,
        backgroundColor: isLoaded ? undefined : "#f0f0f0",
      }}
    >
      {children}
    </div>
  );
});

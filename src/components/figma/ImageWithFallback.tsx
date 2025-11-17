import React, { useState, useEffect } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

// Placeholder 이미지 - 상품 이미지 placeholder
const PLACEHOLDER_IMG_SRC = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop'

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)
  const [validSrc, setValidSrc] = useState(props.src)

  useEffect(() => {
    // figma:asset URL을 감지하고 placeholder로 교체
    if (props.src && props.src.startsWith('figma:asset')) {
      setValidSrc(PLACEHOLDER_IMG_SRC)
    } else {
      setValidSrc(props.src)
    }
  }, [props.src])

  const handleError = () => {
    setDidError(true)
  }

  // src, alt, style, className을 제외한 나머지 props에서 커스텀 prop 제거
  const { src, alt, style, className, ...restProps } = props
  
  // 유효한 img 속성만 필터링
  const validImgProps: React.ImgHTMLAttributes<HTMLImageElement> = {}
  const validAttributes = [
    'loading', 'decoding', 'width', 'height', 'crossOrigin', 
    'referrerPolicy', 'sizes', 'srcSet', 'useMap', 'onClick',
    'onLoad', 'onError', 'draggable', 'title', 'id', 'tabIndex',
    'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
    'data-testid'
  ]
  
  Object.keys(restProps).forEach((key) => {
    if (validAttributes.includes(key) || key.startsWith('data-') || key.startsWith('aria-')) {
      validImgProps[key as keyof React.ImgHTMLAttributes<HTMLImageElement>] = restProps[key as keyof typeof restProps]
    }
  })

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Error loading image" {...validImgProps} data-original-url={src} />
      </div>
    </div>
  ) : (
    <img 
      src={validSrc} 
      alt={alt} 
      className={className} 
      style={style} 
      {...validImgProps} 
      onError={handleError} 
    />
  )
}
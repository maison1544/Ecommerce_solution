/**
 * 전화번호 자동 하이픈 포맷팅 유틸리티
 */

/**
 * 전화번호에 하이픈을 자동으로 추가
 * 입력: 01012345678 → 출력: 010-1234-5678
 * 입력: 0212345678 → 출력: 02-1234-5678
 */
export function formatPhoneNumber(value: string): string {
  // 숫자만 추출
  const numbers = value.replace(/[^0-9]/g, "");

  // 빈 값이면 그대로 반환
  if (!numbers) return "";

  // 02로 시작하는 경우 (서울 지역번호)
  if (numbers.startsWith("02")) {
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 5) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    } else if (numbers.length <= 9) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(
        5
      )}`;
    } else {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(
        6,
        10
      )}`;
    }
  }

  // 일반 휴대폰/지역번호 (010, 011, 031 등)
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  } else if (numbers.length <= 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  } else {
    // 11자리 (010-1234-5678)
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(
      7,
      11
    )}`;
  }
}

/**
 * 전화번호에서 하이픈 제거 (저장용)
 */
export function unformatPhoneNumber(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

/**
 * 전화번호 유효성 검사
 */
export function isValidPhoneNumber(value: string): boolean {
  const numbers = unformatPhoneNumber(value);
  // 9자리(02-xxx-xxxx) ~ 11자리(010-xxxx-xxxx)
  return numbers.length >= 9 && numbers.length <= 11;
}

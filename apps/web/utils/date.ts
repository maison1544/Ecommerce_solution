type DateInput = string | number | Date | null | undefined;

export function formatKoreanDateTime(dateInput: DateInput, includeSeconds = false): string {
  if (!dateInput) return "";

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return String(dateInput);

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date).reduce<Record<string, string>>(
    (acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    },
    {},
  );

  const seconds = includeSeconds && parts.second ? `:${parts.second}` : "";
  return `${parts.year}. ${parts.month}. ${parts.day}. ${parts.hour}:${parts.minute}${seconds}`;
}

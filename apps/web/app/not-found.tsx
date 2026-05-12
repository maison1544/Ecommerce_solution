import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-5xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        요청하신 페이지를 찾을 수 없습니다.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md text-sm"
      >
        홈으로 이동
      </Link>
    </div>
  );
}

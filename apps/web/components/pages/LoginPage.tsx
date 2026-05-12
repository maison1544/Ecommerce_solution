import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const { login, isLoggedIn } = useAuth();

  // 🔥 세션 만료/비밀번호 변경 등의 이유로 리다이렉트된 경우 메시지 표시
  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_expired") {
      toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
    } else if (reason === "password_changed") {
      toast.info("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.");
    } else if (reason === "timeout") {
      toast.info("장시간 미활동으로 로그아웃되었습니다.");
    }
  }, [searchParams]);

  // 이미 로그인된 상태면 홈으로 리다이렉트 (마운트 시에만 체크)
  useEffect(() => {
    if (isLoggedIn) {
      toast.info("이미 로그인되어 있습니다");
      router.push("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 빈 배열 - 마운트 시에만 실행

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): string => {
    if (!email.trim()) return "이메일을 입력해주세요";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "올바른 이메일 형식이 아닙니다";
    return "";
  };

  const validatePassword = (password: string): string => {
    if (!password) return "비밀번호를 입력해주세요";
    // 로그인 시에는 비밀번호 규칙 검증하지 않음 (기존 비밀번호 허용)
    return "";
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });

    // Real-time validation
    let error = "";
    if (field === "email") error = validateEmail(value);
    else if (field === "password") error = validatePassword(value);

    setErrors({ ...errors, [field]: error });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const validationErrors = {
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
    };

    setErrors(validationErrors);

    if (validationErrors.email || validationErrors.password) {
      return;
    }
    setIsLoading(true);

    try {
      // Supabase 로그인
      const result = await login(formData.email.trim(), formData.password);

      if (result.success) {
        toast.success("로그인 성공!");
        router.push("/");
      } else {
        toast.error(result.message || "로그인 실패");
      }
    } catch (error) {
      toast.error("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-black font-bold tracking-wider uppercase mb-2">
            로그인
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            계정에 로그인하여 쇼핑을 시작하세요
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-bold mb-2">
              이메일
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="이메일을 입력하세요"
              required
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold mb-2">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="비밀번호를 입력하세요"
              required
            />
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">로그인 상태 유지</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] py-4 font-bold tracking-wider uppercase text-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-600">계정이 없으신가요? </span>
            <Link
              to="/signup"
              className="text-sm text-[#b78b1f] font-bold hover:underline"
            >
              회원가입
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

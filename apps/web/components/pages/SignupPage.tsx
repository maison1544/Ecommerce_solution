import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/utils/api";
import { formatPhoneNumber } from "../utils/phoneFormat";

export default function SignupPage() {
  const router = useRouter();
  const { register, isLoggedIn } = useAuth();
  const API_BASE = `${API_BASE_URL}`;

  // 이미 로그인된 상태면 홈으로 리다이렉트
  useEffect(() => {
    if (isLoggedIn) {
      toast.info("이미 로그인되어 있습니다");
      router.push("/", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Validation functions
  const validateName = (name: string): string => {
    if (!name.trim()) return "이름을 입력해주세요";
    if (name.length < 2) return "이름은 2자 이상이어야 합니다";
    if (!/^[가-힣a-zA-Z\s]+$/.test(name))
      return "이름은 한글 또는 영문만 가능합니다";
    return "";
  };

  const validateEmail = (email: string): string => {
    if (!email.trim()) return "이메일을 입력해주세요";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "올바른 이메일 형식이 아닙니다";
    return "";
  };

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) return "전화번호를 입력해주세요";
    if (!/^01[0-9]-\d{4}-\d{4}$/.test(phone))
      return "010-0000-0000 형식으로 입력해주세요";
    return "";
  };

  const validatePassword = (password: string): string => {
    if (!password) return "비밀번호를 입력해주세요";
    if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다";
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다";
    }
    return "";
  };

  // 이메일 중복 확인
  const checkEmailDuplicate = async (email: string): Promise<boolean> => {
    if (!email || validateEmail(email)) return false;

    try {
      const response = await fetch(`${API_BASE}/api/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (data.exists) {
        setErrors((prev) => ({ ...prev, email: data.message }));
        return false;
      }
      return true;
    } catch (error) {
      console.error("Email check error:", error);
      return false;
    }
  };

  // 휴대폰 중복 확인
  const checkPhoneDuplicate = async (phone: string): Promise<boolean> => {
    if (!phone || validatePhone(phone)) return false;

    try {
      const response = await fetch(`${API_BASE}/api/auth/check-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      if (data.exists) {
        setErrors((prev) => ({ ...prev, phone: data.message }));
        return false;
      }
      return true;
    } catch (error) {
      console.error("Phone check error:", error);
      return false;
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });

    // Real-time validation
    let error = "";
    if (field === "name") error = validateName(value);
    else if (field === "email") error = validateEmail(value);
    else if (field === "phone") error = validatePhone(value);
    else if (field === "password") error = validatePassword(value);
    else if (field === "confirmPassword") {
      error = value !== formData.password ? "비밀번호가 일치하지 않습니다" : "";
    }

    setErrors({ ...errors, [field]: error });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const validationErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
      password: validatePassword(formData.password),
      confirmPassword:
        formData.password !== formData.confirmPassword
          ? "비밀번호가 일치하지 않습니다"
          : "",
    };

    setErrors(validationErrors);

    if (Object.values(validationErrors).some((error) => error !== "")) {
      return;
    }

    if (!formData.agreeTerms || !formData.agreePrivacy) {
      toast.error("필수 약관에 동의해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // Supabase 회원가입
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });

      if (result.success) {
        toast.success("회원가입이 완료되었습니다!");
        router.push("/login");
      } else {
        toast.error(result.message || "회원가입 실패");
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-black font-bold tracking-wider uppercase mb-2">
            회원가입
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            새로운 계정을 만들어 쇼핑을 시작하세요
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-bold mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="이름을 입력하세요"
              required
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold mb-2">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={(e) => checkEmailDuplicate(e.target.value)}
              className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="example@email.com"
              required
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-bold mb-2">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) =>
                handleChange("phone", formatPhoneNumber(e.target.value))
              }
              onBlur={(e) => checkPhoneDuplicate(e.target.value)}
              className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="숫자만 입력"
              maxLength={13}
              required
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold mb-2">
              비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="비밀번호를 입력하세요"
              required
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              8자 이상, 영문, 숫자, 특수문자 포함
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-bold mb-2"
            >
              비밀번호 확인 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="비밀번호를 다시 입력하세요"
              required
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="space-y-3 pt-4">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={formData.agreeTerms}
                onChange={(e) =>
                  setFormData({ ...formData, agreeTerms: e.target.checked })
                }
                className="mt-1 rounded"
              />
              <span className="text-sm">
                <Link href="/terms" className="text-[#b78b1f] hover:underline">
                  이용약관
                </Link>
                에 동의합니다 <span className="text-red-500">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={formData.agreePrivacy}
                onChange={(e) =>
                  setFormData({ ...formData, agreePrivacy: e.target.checked })
                }
                className="mt-1 rounded"
              />
              <span className="text-sm">
                <Link href="/privacy" className="text-[#b78b1f] hover:underline">
                  개인정보처리방침
                </Link>
                에 동의합니다 <span className="text-red-500">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={formData.agreeMarketing}
                onChange={(e) =>
                  setFormData({ ...formData, agreeMarketing: e.target.checked })
                }
                className="mt-1 rounded"
              />
              <span className="text-sm">
                마케팅 정보 수신에 동의합니다 (선택)
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] py-4 font-bold tracking-wider uppercase text-center hover:bg-gray-800"
            disabled={isLoading}
          >
            {isLoading ? "회원가입 중..." : "회원가입"}
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              이미 계정이 있으신가요?{" "}
            </span>
            <Link
              to="/login"
              className="text-sm text-[#b78b1f] font-bold hover:underline"
            >
              로그인
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

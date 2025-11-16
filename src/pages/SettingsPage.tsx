import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner@2.0.3";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isLoggedIn, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  // 로그인 체크
  useEffect(() => {
    if (!isLoggedIn || !currentUser) {
      toast.error("로그인이 필요합니다");
      navigate("/login");
    }
  }, [isLoggedIn, currentUser, navigate]);

  if (!currentUser) {
    return null;
  }
  
  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone,
    birthDate: currentUser.birthDate || ""
  });

  const [profileErrors, setProfileErrors] = useState({
    name: "",
    email: "",
    phone: ""
  });

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Validation functions
  const validateName = (name: string): string => {
    if (!name.trim()) return "이름을 입력해주세요";
    if (name.length < 2) return "이름은 2자 이상이어야 합니다";
    if (!/^[가-힣a-zA-Z\s]+$/.test(name)) return "이름은 한글 또는 영문만 가능합니다";
    return "";
  };

  const validateEmail = (email: string): string => {
    if (!email.trim()) return "이메일을 입력해주세요";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "올바른 이메일 형식이 아닙니다";
    return "";
  };

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) return "전화번호를 입력해주세요";
    if (!/^01[0-9]-\d{4}-\d{4}$/.test(phone)) return "010-0000-0000 형식으로 입력해주세요";
    return "";
  };

  const validatePassword = (password: string): string => {
    if (!password) return "비밀번호를 입력해주세요";
    if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다";
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return "영문 대소문자와 숫자를 포함해야 합니다";
    }
    return "";
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfileForm({ ...profileForm, [field]: value });
    
    // Real-time validation
    let error = "";
    if (field === "name") error = validateName(value);
    else if (field === "email") error = validateEmail(value);
    else if (field === "phone") error = validatePhone(value);
    
    setProfileErrors({ ...profileErrors, [field]: error });
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm({ ...passwordForm, [field]: value });
    
    // Real-time validation
    let error = "";
    if (field === "newPassword") {
      error = validatePassword(value);
    } else if (field === "confirmPassword") {
      error = value !== passwordForm.newPassword ? "비밀번호가 일치하지 않습니다" : "";
    }
    
    setPasswordErrors({ ...passwordErrors, [field]: error });
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const errors = {
      name: validateName(profileForm.name),
      email: validateEmail(profileForm.email),
      phone: validatePhone(profileForm.phone)
    };
    
    setProfileErrors(errors);
    
    if (errors.name || errors.email || errors.phone) {
      return;
    }

    // SQL로 전달할 데이터
    const profileData = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim(),
      birthDate: profileForm.birthDate
    };
    
    console.log("프로필 업데이트 데이터:", profileData);
    // TODO: SQL INSERT/UPDATE 쿼리 실행
    alert("프로필이 업데이트되었습니다!");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const errors = {
      currentPassword: !passwordForm.currentPassword ? "현재 비밀번호를 입력해주세요" : "",
      newPassword: validatePassword(passwordForm.newPassword),
      confirmPassword: passwordForm.newPassword !== passwordForm.confirmPassword ? "비밀번호가 일치하지 않습니다" : ""
    };
    
    setPasswordErrors(errors);
    
    if (errors.currentPassword || errors.newPassword || errors.confirmPassword) {
      return;
    }

    // SQL로 전달할 데이터
    const passwordData = {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    };
    
    console.log("비밀번호 변경 데이터:", passwordData);
    // TODO: SQL UPDATE 쿼리 실행
    alert("비밀번호가 변경되었습니다!");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setPasswordErrors({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  };

  return (
    <main className="container mx-auto px-4 lg:px-8 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-4xl text-[#b78b1f] font-bold tracking-wider uppercase mb-2">
            계정 설정
          </h1>
          <p className="text-sm lg:text-base text-black font-bold tracking-wider uppercase">
            회원 정보와 설정을 관리하세요
          </p>
          <div className="h-px bg-black mt-5" />
        </div>

        {/* Tabs */}
        <div className="border-b mb-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-4 font-bold transition-colors flex items-center gap-2 ${
                activeTab === "profile"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <User size={18} />
              프로필
            </button>
            <button
              onClick={() => setActiveTab("password")}
              className={`pb-4 font-bold transition-colors flex items-center gap-2 ${
                activeTab === "password"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Lock size={18} />
              비밀번호 변경
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white border rounded-lg p-6 lg:p-8">
          {activeTab === "profile" && (
            <form onSubmit={handleProfileSave} className="space-y-6">
              <h2 className="font-bold text-lg mb-4">프로필 정보</h2>

              <div>
                <label className="block text-sm font-bold mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => handleProfileChange("name", e.target.value)}
                  className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                    profileErrors.name ? "border-red-500" : "border-[#eeeeee]"
                  }`}
                  required
                />
                {profileErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{profileErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                  className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                    profileErrors.email ? "border-red-500" : "border-[#eeeeee]"
                  }`}
                  required
                />
                {profileErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{profileErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => handleProfileChange("phone", e.target.value)}
                  className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black ${
                    profileErrors.phone ? "border-red-500" : "border-[#eeeeee]"
                  }`}
                  placeholder="010-0000-0000"
                  required
                />
                {profileErrors.phone && (
                  <p className="text-red-500 text-xs mt-1">{profileErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">생년월일</label>
                <input
                  type="date"
                  value={profileForm.birthDate}
                  onChange={(e) => setProfileForm({ ...profileForm, birthDate: e.target.value })}
                  className="w-full bg-[#eeeeee] rounded border border-[#eeeeee] px-4 py-3 text-sm outline-none focus:border-black"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center bg-black text-white rounded-[10px] py-4 font-bold tracking-wider uppercase hover:bg-gray-800"
              >
                프로필 저장
              </button>
            </form>
          )}

          {activeTab === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <h2 className="font-bold text-lg mb-4">비밀번호 변경</h2>

              <div>
                <label className="block text-sm font-bold mb-2">
                  현재 비밀번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                    className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black pr-12 ${
                      passwordErrors.currentPassword ? "border-red-500" : "border-[#eeeeee]"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                  >
                    {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  새 비밀번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword.new ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                    className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black pr-12 ${
                      passwordErrors.newPassword ? "border-red-500" : "border-[#eeeeee]"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                  >
                    {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">8자 이상, 영문 대소문자와 숫자 포함</p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  새 비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                    className={`w-full bg-[#eeeeee] rounded border px-4 py-3 text-sm outline-none focus:border-black pr-12 ${
                      passwordErrors.confirmPassword ? "border-red-500" : "border-[#eeeeee]"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                  >
                    {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center bg-black text-white rounded-[10px] py-4 font-bold tracking-wider uppercase hover:bg-gray-800"
              >
                비밀번호 변경
              </button>
            </form>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link
            to="/account"
            className="inline-block text-gray-600 hover:text-black font-bold"
          >
            ← 내 계정으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
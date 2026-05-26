import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { createClient, resetClient } from "@/lib/supabase/client";
import { clearStaleSupabaseAuthCookies } from "@/lib/supabase/cookies";
import { useAppScope } from "@/context/AppScopeContext";
import { API_BASE_URL } from "@/utils/api";

// ✅ User 인터페이스 (보안 강화: app_metadata.role만 사용)
export interface User {
  id: string; // UUID
  name: string;
  email: string;
  phone: string | null;
  birthDate?: string | null;
  createdAt: string;
  role: "customer" | "admin"; // ✅ app_metadata.role (클라이언트 수정 불가능)
}

interface AuthContextType {
  isLoggedIn: boolean;
  currentUser: User | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    birthDate?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  getAccessToken: () => Promise<string | null>;
  isAuthLoading: boolean; // 🔥 세션 초기화 로딩 상태
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { appScope } = useAppScope();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // 🔥 초기 로딩 상태
  const loginPath = appScope === "admin" ? "/admin/login" : "/login";
  const expectedRole = appScope === "admin" ? "admin" : "customer";

  // ✅ 세션 타임아웃 설정 (30분 미활동 시 로그아웃)
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30분
  const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1분마다 체크

  // ✅ 세션 타임아웃 및 유효성 관리
  useEffect(() => {
    if (!isLoggedIn) return;

    let lastActivity = Date.now();
    let timeoutId: ReturnType<typeof setInterval>;

    const updateActivity = () => {
      lastActivity = Date.now();
    };

    const checkSessionAndInactivity = async () => {
      const now = Date.now();

      // 1. 미활동 시간 초과 체크
      if (now - lastActivity > SESSION_TIMEOUT) {
        console.log("세션 타임아웃: 30분 미활동으로 로그아웃됩니다.");
        const supabase = createClient(appScope);
        await supabase.auth.signOut();
        resetClient(appScope);
        setCurrentUser(null);
        setIsLoggedIn(false);
        window.location.href = `${loginPath}?reason=timeout`;
        return;
      }

      // 2. 🔥 세션 유효성 검사 (비밀번호 변경 등으로 무효화된 경우 감지)
      try {
        const supabase = createClient(appScope);

        // getUser()를 사용해 서버에서 최신 사용자 정보 확인 (캐시가 아닌 실시간 데이터)
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          // 사용자 정보를 가져올 수 없으면 세션 갱신 시도
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.log("세션 만료 감지: 자동 로그아웃됩니다.");
            await supabase.auth.signOut();
            resetClient(appScope);
            setCurrentUser(null);
            setIsLoggedIn(false);
            window.location.href = `${loginPath}?reason=session_expired`;
            return;
          }
        }

        // 3. force_logout 플래그 확인 (서버에서 가져온 최신 데이터)
        if (user?.app_metadata?.force_logout) {
          console.log("강제 로그아웃: 비밀번호가 변경되었습니다.");
          await supabase.auth.signOut();
          resetClient(appScope);
          setCurrentUser(null);
          setIsLoggedIn(false);
          window.location.href = `${loginPath}?reason=password_changed`;
          return;
        }
      } catch (e) {
        // 네트워크 오류 등은 무시
      }
    };

    // 활동 감지 이벤트 리스너
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    events.forEach((event) => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // 주기적으로 세션 및 미활동 체크
    timeoutId = setInterval(checkSessionAndInactivity, ACTIVITY_CHECK_INTERVAL);

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(timeoutId);
    };
  }, [appScope, isLoggedIn, loginPath]);

  // ✅ 세션 복원 with optimization + force_logout 체크
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const supabase = createClient(appScope);

        // 🔥 1단계: 먼저 로컬 세션 확인 (캐시)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        // 세션이 없으면 로그아웃 상태로 처리
        if (sessionError || !session) {
          setCurrentUser(null);
          setIsLoggedIn(false);
          setIsAuthLoading(false);
          return;
        }

        // 🔥 2단계: 세션이 있으면 서버에서 최신 사용자 정보 확인 (force_logout 체크)
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        // 서버 확인 실패 시 로컬 세션 데이터 사용 (네트워크 오류 등)
        if (userError || !user) {
          // 로컬 세션 데이터로 폴백
          const sessionUser = session.user;
          const role = sessionUser.app_metadata?.role || "customer";
          if (role !== expectedRole) {
            await supabase.auth.signOut();
            resetClient(appScope);
            setCurrentUser(null);
            setIsLoggedIn(false);
            setIsAuthLoading(false);
            return;
          }
          const currentUserData: User = {
            id: sessionUser.id,
            name: sessionUser.user_metadata?.name || "",
            email: sessionUser.email || "",
            phone: sessionUser.user_metadata?.phone || null,
            birthDate: sessionUser.user_metadata?.birthDate || null,
            createdAt: sessionUser.created_at || new Date().toISOString(),
            role: role as "customer" | "admin",
          };
          setCurrentUser(currentUserData);
          setIsLoggedIn(true);
          setIsAuthLoading(false);
          return;
        }

        // 🔥 3단계: force_logout 체크 (관리자가 비밀번호 변경 시)
        if (user.app_metadata?.force_logout) {
          console.log("강제 로그아웃: 비밀번호가 변경되었습니다.");
          await supabase.auth.signOut();
          resetClient(appScope);
          setCurrentUser(null);
          setIsLoggedIn(false);
          setIsAuthLoading(false);
          window.location.href = `${loginPath}?reason=password_changed`;
          return;
        }

        // 🔥 4단계: 정상 로그인 상태 설정
        const role = user.app_metadata?.role || "customer";
        if (role !== expectedRole) {
          await supabase.auth.signOut();
          resetClient(appScope);
          setCurrentUser(null);
          setIsLoggedIn(false);
          setIsAuthLoading(false);
          return;
        }
        const currentUserData: User = {
          id: user.id,
          name: user.user_metadata?.name || "",
          email: user.email || "",
          phone: user.user_metadata?.phone || null,
          birthDate: user.user_metadata?.birthDate || null,
          createdAt: user.created_at || new Date().toISOString(),
          role: role as "customer" | "admin",
        };
        setCurrentUser(currentUserData);
        setIsLoggedIn(true);
      } catch (error) {
        // Silently handle errors
        if (mounted) {
          setCurrentUser(null);
          setIsLoggedIn(false);
        }
      } finally {
        // 🔥 세션 초기화 완료 - 로딩 상태 해제
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [appScope, expectedRole, loginPath]);

  // ✅ 로그인 (Supabase Auth 사용) - useCallback으로 최적화
  const login = useCallback(async (email: string, password: string) => {
    const API_BASE = `${API_BASE_URL}`;
    const genericLoginError = "이메일 또는 비밀번호가 올바르지 않습니다.";

    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (!trimmedEmail || !trimmedPassword) {
        return {
          success: false,
          message: "이메일과 비밀번호를 입력해주세요.",
        };
      }

      const checkResponse = await fetch(
        `${API_BASE}/api/auth/check-login-attempts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail }),
        }
      );

      const checkData = await checkResponse.json();
      if (checkData.locked) {
        return {
          success: false,
          message: checkData.message,
        };
      }

      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
          scope: appScope,
        }),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.session?.access_token || !result?.session?.refresh_token) {
        return {
          success: false,
          message: genericLoginError,
        };
      }

      clearStaleSupabaseAuthCookies(appScope);
      resetClient(appScope);
      const supabase = createClient(appScope);
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (sessionError) {
        resetClient(appScope);
        return {
          success: false,
          message: genericLoginError,
        };
      }

      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser) {
        await supabase.auth.signOut();
        resetClient(appScope);
        return {
          success: false,
          message: genericLoginError,
        };
      }

      const role = authUser.app_metadata?.role || "customer";
      if (role !== expectedRole) {
        await supabase.auth.signOut();
        resetClient(appScope);
        return {
          success: false,
          message: genericLoginError,
        };
      }

      const user: User = {
        id: authUser.id,
        name: authUser.user_metadata?.name || "",
        email: authUser.email || "",
        phone: authUser.user_metadata?.phone || null,
        birthDate: authUser.user_metadata?.birthDate || null,
        createdAt: authUser.created_at || new Date().toISOString(),
        role: role as "customer" | "admin",
      };

      setCurrentUser(user);
      setIsLoggedIn(true);

      try {
        await fetch(`${API_BASE}/api/auth/record-login-ip`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${result.session.access_token}`,
          },
        });
      } catch (ipError) {
        console.error("Failed to record login IP:", ipError);
      }

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "로그인 중 오류가 발생했습니다." };
    }
  }, [appScope, expectedRole]);
  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    birthDate?: string;
  }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: userData.name,
          phone: userData.phone,
          birthDate: userData.birthDate || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        if (
          result.error?.includes("already registered") ||
          result.error?.includes("User already registered")
        ) {
          return { success: false, message: "이미 사용 중인 이메일입니다." };
        }
        return {
          success: false,
          message: result.error || "회원가입 중 오류가 발생했습니다.",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, message: "회원가입 중 오류가 발생했습니다." };
    }
  };

  // ✅ 로그아웃 - useCallback으로 최적화
  const logout = useCallback(async () => {
    try {
      const supabase = createClient(appScope);
      await supabase.auth.signOut();
      resetClient(appScope); // 클라이언트 인스턴스 재설정
      setCurrentUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [appScope]);

  // ✅ 액세스 토큰 가져오기 - useCallback으로 최적화 + 세션 갱신 지원 + 자동 로그아웃
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = createClient(appScope);

      // 🔥 먼저 서버에서 최신 사용자 정보로 force_logout 확인
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // 사용자 정보를 가져올 수 없으면 세션 갱신 시도
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          if (isLoggedIn) {
            console.log("세션 만료: 자동 로그아웃됩니다.");
            await supabase.auth.signOut();
            resetClient(appScope);
            setCurrentUser(null);
            setIsLoggedIn(false);
            window.location.href = `${loginPath}?reason=session_expired`;
          }
          return null;
        }
        return refreshData.session.access_token;
      }

      // 🔥 force_logout 플래그 확인 (서버에서 가져온 최신 데이터)
      if (user.app_metadata?.force_logout) {
        console.log("강제 로그아웃: 비밀번호가 변경되었습니다.");
        await supabase.auth.signOut();
        resetClient(appScope);
        setCurrentUser(null);
        setIsLoggedIn(false);
        window.location.href = `${loginPath}?reason=password_changed`;
        return null;
      }

      const role = user.app_metadata?.role || "customer";
      if (role !== expectedRole) {
        await supabase.auth.signOut();
        resetClient(appScope);
        setCurrentUser(null);
        setIsLoggedIn(false);
        window.location.href = loginPath;
        return null;
      }

      // 세션 가져오기
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          if (isLoggedIn) {
            console.log("세션 만료: 자동 로그아웃됩니다.");
            await supabase.auth.signOut();
            resetClient(appScope);
            setCurrentUser(null);
            setIsLoggedIn(false);
            window.location.href = `${loginPath}?reason=session_expired`;
          }
          return null;
        }
        return refreshData.session.access_token;
      }

      // 토큰 만료 시간 체크 (5분 이내 만료 예정이면 갱신)
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      if (expiresAt && expiresAt - now < 300) {
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          if (isLoggedIn) {
            console.log("세션 갱신 실패: 자동 로그아웃됩니다.");
            await supabase.auth.signOut();
            resetClient(appScope);
            setCurrentUser(null);
            setIsLoggedIn(false);
            window.location.href = `${loginPath}?reason=session_expired`;
          }
          return null;
        }
        return refreshData.session.access_token;
      }

      return session.access_token;
    } catch (error) {
      // 🔥 에러 발생 시에도 자동 로그아웃
      if (isLoggedIn) {
        console.log("세션 오류: 자동 로그아웃됩니다.");
        const supabase = createClient(appScope);
        await supabase.auth.signOut();
        resetClient(appScope);
        setCurrentUser(null);
        setIsLoggedIn(false);
        window.location.href = `${loginPath}?reason=session_expired`;
      }
      return null;
    }
  }, [appScope, expectedRole, isLoggedIn, loginPath]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isAuthLoading, // 🔥 세션 초기화 로딩 상태
        currentUser,
        login,
        logout,
        register,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

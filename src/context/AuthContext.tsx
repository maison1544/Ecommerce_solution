import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createClient } from "../utils/supabase/client";

// User 인터페이스 (Supabase DB 스키마와 동일)
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  phone: string | null;
  birthDate?: string | null;
  createdAt: string;
  role: "customer" | "admin";
  isBlocked?: boolean;
  blockedIp?: string | null;
}

interface AuthContextType {
  isLoggedIn: boolean;
  currentUser: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  register: (userData: { name: string; email: string; password: string; phone: string; birthDate?: string }) => Promise<{ success: boolean; message?: string }>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const supabase = createClient();

  // 로컬스토리지에서 유저 정보 복원
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem("currentUser");
      }
    }
  }, []);

  // 로그인 함수 (Supabase Auth 사용)
  const login = async (email: string, password: string) => {
    try {
      // Supabase Auth로 로그인
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        return { success: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." };
      }

      // 사용자 메타데이터에서 추가 정보 가져오기
      const userMetadata = authData.user.user_metadata;
      
      // User 타입으로 변환
      const user: User = {
        id: parseInt(authData.user.id) || 0,
        name: userMetadata.name || '',
        email: authData.user.email || '',
        password: '', // 비밀번호는 저장하지 않음
        phone: userMetadata.phone || null,
        birthDate: userMetadata.birthDate || null,
        createdAt: authData.user.created_at || new Date().toISOString(),
        role: userMetadata.role || 'customer',
        isBlocked: userMetadata.isBlocked || false,
        blockedIp: userMetadata.blockedIp || null,
      };

      // 차단된 사용자 확인
      if (user.isBlocked) {
        await supabase.auth.signOut();
        return { success: false, message: "차단된 계정입니다. 고객센터에 문의해주세요." };
      }

      setCurrentUser(user);
      setIsLoggedIn(true);
      localStorage.setItem("currentUser", JSON.stringify(user));

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: "로그인 중 오류가 발생했습니다." };
    }
  };

  // 회원가입 함수 (Supabase Auth 사용)
  const register = async (userData: { name: string; email: string; password: string; phone: string; birthDate?: string }) => {
    try {
      // Supabase Auth로 회원가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone,
            birthDate: userData.birthDate || null,
            role: 'customer',
            isBlocked: false,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          return { success: false, message: "이미 사용 중인 이메일입니다." };
        }
        return { success: false, message: authError.message };
      }

      if (!authData.user) {
        return { success: false, message: "회원가입 중 오류가 발생했습니다." };
      }

      return { success: true };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: "회원가입 중 오류가 발생했습니다." };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("currentUser");
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('Failed to get access token:', error);
        return null;
      }
      
      return session.access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, currentUser, login, logout, register, getAccessToken }}>
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
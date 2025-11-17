import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createClient } from "../utils/supabase/client";
import { projectId } from "../utils/supabase/info";

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

  // ✅ 세션 복원
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setCurrentUser(null);
          setIsLoggedIn(false);
          return;
        }
        
        // ✅ 차단 확인 (banned_until)
        const bannedUntil = session.user.banned_until;
        if (bannedUntil && new Date(bannedUntil) > new Date()) {
          await supabase.auth.signOut();
          setCurrentUser(null);
          setIsLoggedIn(false);
          return;
        }
        
        // ✅ app_metadata.role만 사용 (클라이언트 수정 불가능)
        const role = session.user.app_metadata?.role || 'customer';
        
        const user: User = {
          id: session.user.id,
          name: session.user.user_metadata?.name || '',
          email: session.user.email || '',
          phone: session.user.user_metadata?.phone || null,
          birthDate: session.user.user_metadata?.birthDate || null,
          createdAt: session.user.created_at || new Date().toISOString(),
          role: role as "customer" | "admin",
        };
        
        setCurrentUser(user);
        setIsLoggedIn(true);
      } catch (e) {
        console.error('Session check error:', e);
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    };
    
    checkSession();
    
    // ✅ Auth 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setCurrentUser(null);
        setIsLoggedIn(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const bannedUntil = session.user.banned_until;
        if (bannedUntil && new Date(bannedUntil) > new Date()) {
          await supabase.auth.signOut();
          setCurrentUser(null);
          setIsLoggedIn(false);
          return;
        }
        
        const role = session.user.app_metadata?.role || 'customer';
        const user: User = {
          id: session.user.id,
          name: session.user.user_metadata?.name || '',
          email: session.user.email || '',
          phone: session.user.user_metadata?.phone || null,
          birthDate: session.user.user_metadata?.birthDate || null,
          createdAt: session.user.created_at || new Date().toISOString(),
          role: role as "customer" | "admin",
        };
        
        setCurrentUser(user);
        setIsLoggedIn(true);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ✅ 로그인 (Supabase Auth 사용)
  const login = async (email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        return { success: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." };
      }

      // ✅ 차단 확인
      const bannedUntil = authData.user.banned_until;
      if (bannedUntil && new Date(bannedUntil) > new Date()) {
        await supabase.auth.signOut();
        return { success: false, message: "차단된 계정입니다. 고객센터에 문의해주세요." };
      }

      // ✅ app_metadata.role만 사용
      const role = authData.user.app_metadata?.role || 'customer';
      
      const user: User = {
        id: authData.user.id,
        name: authData.user.user_metadata?.name || '',
        email: authData.user.email || '',
        phone: authData.user.user_metadata?.phone || null,
        birthDate: authData.user.user_metadata?.birthDate || null,
        createdAt: authData.user.created_at || new Date().toISOString(),
        role: role as "customer" | "admin",
      };

      setCurrentUser(user);
      setIsLoggedIn(true);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: "로그인 중 오류가 발생했습니다." };
    }
  };

  // ✅ 회원가입 (Edge Function 호출)
  const register = async (userData: { name: string; email: string; password: string; phone: string; birthDate?: string }) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-94a0507e/api/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            name: userData.name,
            phone: userData.phone,
            birthDate: userData.birthDate || null
          })
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        if (result.error?.includes('already registered') || result.error?.includes('User already registered')) {
          return { success: false, message: "이미 사용 중인 이메일입니다." };
        }
        return { success: false, message: result.error || "회원가입 중 오류가 발생했습니다." };
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
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
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
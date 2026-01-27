import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from '../services/auth/firebase';
import { userService } from '../services/auth/userService';
import { toast } from 'sonner';

interface UserInfo {
  uid: string;
  email?: string;
  display_name?: string;
  photo_url?: string;
}

interface AuthContextType {
  user: User | null;
  userInfo: UserInfo | null;
  loading: boolean;
  jwtReady: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserInfo: () => Promise<void>;
  loginPromptOpen: boolean;
  openLoginPrompt: () => void;
  closeLoginPrompt: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [jwtReady, setJwtReady] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  useEffect(() => {
    // Firebase 인증 상태 확인 (개발/프로덕션 모두)
    if (!auth) {
      console.warn("AuthContext: Firebase auth not initialized");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setJwtReady(false);
      if (currentUser) {
        try {
          // 백엔드 JWT 토큰 발급 (멤버십 정보 포함)
          await userService.verifyFirebaseToken(currentUser);
          setJwtReady(true);
          // Firestore 동기화 제거 (Postgres에서 사용자 프로필 관리)
          // 저장된 사용자 정보 로드
          const saved = localStorage.getItem('weav_user_info');
          if (saved) {
            try {
              setUserInfo(JSON.parse(saved));
            } catch (e) {
              console.error('Failed to parse user info:', e);
            }
          }
        } catch (error) {
          console.error("Failed to sync user or verify token:", error);
          setJwtReady(false);
          toast.error('인증 처리에 실패했습니다.', { description: '백엔드 연결 상태를 확인해주세요.' });
        }
      } else {
        // 로그아웃 시 토큰 및 사용자 정보 정리
        userService.clearAuth();
        localStorage.removeItem('weav_user_info');
        setUserInfo(null);
        setJwtReady(false);
        setLoginPromptOpen(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    // 실제 Firebase Google 로그인 사용 (개발/프로덕션 모두)
    if (!auth) {
      console.error("Firebase auth not initialized. Please check your Firebase configuration.");
      return;
    }

    try {
      const firebaseUser = await loginWithGoogle();
      if (firebaseUser) {
        // 백엔드 JWT 토큰 발급 먼저 처리
        await userService.verifyFirebaseToken(firebaseUser);
        setJwtReady(true);
        setLoginPromptOpen(false);
        // Firestore 동기화 제거 (Postgres에서 사용자 프로필 관리)
      }
    } catch (error) {
      console.error("Login failed", error);
      toast.error('로그인에 실패했습니다.', { description: '인증 또는 네트워크 상태를 확인해주세요.' });
      throw error; // 에러를 상위로 전파하여 UI에서 처리할 수 있도록
    }
  };

  const signOut = async () => {
    // 실제 Firebase 로그아웃 사용 (개발/프로덕션 모두)
    if (!auth) {
      console.warn("Firebase auth not initialized");
      setUser(null);
      return;
    }

    try {
      // 로그아웃 전에 현재 사용자 데이터 정리 (선택사항)
      const currentUser = user;
      
      await logout();
      setUser(null);
      setUserInfo(null);
      localStorage.removeItem('weav_user_info');
      setJwtReady(false);
      setLoginPromptOpen(false);
      
      // 로그아웃 후 채팅 상태 초기화는 ChatContext에서 처리
      // 여기서는 사용자 상태만 관리
    } catch (error) {
      console.error("Logout failed", error);
      toast.error('로그아웃에 실패했습니다.');
      throw error;
    }
  };

  const refreshUserInfo = async () => {
    if (!user) return;
    
    try {
      const updatedUserInfo = await userService.refreshUserProfile();
      if (updatedUserInfo) {
        setUserInfo(updatedUserInfo);
      }
    } catch (error) {
      console.error("Failed to refresh user info:", error);
      toast.error('사용자 정보를 갱신할 수 없습니다.', { description: '백엔드 연결 상태를 확인해주세요.' });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userInfo,
      loading,
      jwtReady,
      signIn,
      signOut,
      refreshUserInfo,
      loginPromptOpen,
      openLoginPrompt: () => setLoginPromptOpen(true),
      closeLoginPrompt: () => setLoginPromptOpen(false)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

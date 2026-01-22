import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from '../services/firebase';
import { userService } from '../services/userService';

// 개발 환경용 모의 사용자
const mockUser: User = {
  uid: 'dev-user-123',
  email: 'developer@weav-ai.dev',
  displayName: '개발자',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [{
    uid: 'dev-user-123',
    email: 'developer@weav-ai.dev',
    displayName: '개발자',
    photoURL: null,
    providerId: 'google.com',
  }],
  refreshToken: 'mock-refresh-token',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'mock-id-token',
  getIdTokenResult: async () => ({
    token: 'mock-id-token',
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    signInProvider: 'google.com',
    signInSecondFactor: null,
    claims: {},
  }),
  reload: async () => {},
  toJSON: () => ({}),
  phoneNumber: null,
  providerId: 'firebase',
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (import.meta.env.DEV) {
      // 개발 환경: 로그인 없이 바로 사용 가능하도록 null 유지
      setUser(null);
      setLoading(false);
      return;
    }

    // 프로덕션 환경에서는 Firebase 인증 상태 확인
    if (!auth) {
      console.warn("AuthContext: Firebase auth not initialized");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await userService.syncUserToFirestore(currentUser);
        } catch (error) {
          console.error("Failed to sync user to Firestore:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    // 개발 환경에서는 모의 로그인, 프로덕션에서는 실제 Firebase 로그인
    if (import.meta.env.DEV) {
      // 개발 환경: 모의 사용자 로그인
      console.log("🔧 개발 환경: 모의 로그인 실행");
      setUser(mockUser);
      setLoading(false);
    } else {
      // 프로덕션 환경: 실제 Firebase 로그인
      try {
        await loginWithGoogle();
      } catch (error) {
        console.error("Login failed", error);
      }
    }
  };

  const signOut = async () => {
    if (import.meta.env.DEV) {
      // 개발 환경: 모의 로그아웃
      console.log("🔧 개발 환경: 모의 로그아웃 실행");
      setUser(null);
    } else {
      // 프로덕션 환경: 실제 Firebase 로그아웃
      await logout();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
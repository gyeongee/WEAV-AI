import { User } from 'firebase/auth';
import { apiClient, tokenManager, API_BASE_URL } from '../api/apiClient';

export const userService = {
    /**
     * Firebase ID Token을 백엔드로 전송하여 JWT 토큰 발급
     */
    verifyFirebaseToken: async (user: User): Promise<void> => {
        if (!user) return;

        try {
            // Firebase ID Token 가져오기
            const idToken = await user.getIdToken();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            let response: Response;
            try {
                // 백엔드에 토큰 검증 요청 (인증 없이 호출)
                response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-firebase-token/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id_token: idToken,
                    }),
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeoutId);
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // JWT 토큰 저장
            tokenManager.setAccessToken(data.access);
            tokenManager.setRefreshToken(data.refresh);
            
            // 사용자 정보 저장
            if (data.user) {
                localStorage.setItem('weav_user_info', JSON.stringify(data.user));
            }
            
            console.log('[UserService] JWT tokens issued successfully');
        } catch (error) {
            console.error('[UserService] Failed to verify Firebase token:', error);
            // Firestore 동기화는 계속 진행 (백엔드 실패해도 프론트엔드는 작동)
        }
    },
    
    /**
     * 사용자 프로필 정보 갱신
     */
    refreshUserProfile: async (): Promise<any> => {
        try {
            const response = await apiClient.get<Record<string, unknown>>('/api/v1/auth/profile/');
            const userInfo = response?.user ? (response.user as Record<string, unknown>) : (response as Record<string, unknown>);
            if (userInfo && typeof userInfo === 'object') {
                if (!('uid' in userInfo) && 'username' in userInfo) (userInfo as any).uid = userInfo.username;
                localStorage.setItem('weav_user_info', JSON.stringify(userInfo));
            }
            return userInfo;
        } catch (error) {
            console.error('[UserService] Failed to refresh user profile:', error);
            throw error;
        }
    },
    
    /**
     * 로그아웃 시 토큰 정리
     */
    clearAuth: (): void => {
        tokenManager.clearTokens();
    }
};

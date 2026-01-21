import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User, Auth } from "firebase/auth";

// Firebase Configuration
// Vite exposes env variables via import.meta.env and requires VITE_ prefix
const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: env?.VITE_FIREBASE_API_KEY,
  authDomain: env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env?.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let googleProvider: GoogleAuthProvider | undefined;

// Initialize Firebase safely
// Only attempt to initialize if apiKey exists
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    // Prevent double initialization
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
  }
} else {
  console.warn("Firebase configuration missing or invalid keys provided.");
}

export { auth, googleProvider };

// Auth Functions
export const loginWithGoogle = async (): Promise<User | null> => {
  if (!auth || !googleProvider) {
    alert("로그인 기능을 사용하려면 .env 파일에 VITE_FIREBASE_... 설정을 확인해주세요.");
    console.warn("Firebase is not initialized.");
    return null;
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Login Error:", error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
    throw error;
  }
};
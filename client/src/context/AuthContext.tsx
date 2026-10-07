import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import axios from 'axios';

// Define Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if variables are present
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

let authInstance: any = null;

if (isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      initializeApp(firebaseConfig);
    }
    authInstance = getAuth();
  } catch (error) {
    console.error('Firebase client initialization error:', error);
  }
} else {
  console.warn(
    'VITE_FIREBASE_* variables are missing. AuthContext will run in developer bypass mock mode.'
  );
}

export interface User {
  id: string;
  firebaseUID: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'user' | 'analyst';
  organizationId?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (name: string, photoURL?: string) => Promise<void>;
  isDevBypass: boolean;
  devLogin: (email: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Setup Axios Authorization Defaults
  const setAuthHeader = (token: string | null) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('auth_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('auth_token');
    }
  };

  // Perform backend token validation
  const validateSession = async (token: string) => {
    try {
      setAuthHeader(token);
      const res = await axios.get('/api/auth/validate');
      if (res.data && res.data.data && res.data.data.user) {
        setUser(res.data.data.user);
      } else {
        setAuthHeader(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      setAuthHeader(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const localToken = localStorage.getItem('auth_token');
    if (localToken) {
      validateSession(localToken);
    } else {
      setLoading(false);
    }
  }, []);

  const handleBackendLogin = async (idToken: string) => {
    try {
      const res = await axios.post('/api/auth/login', { idToken });
      const { token, data } = res.data;
      setAuthHeader(token);
      setUser(data.user);
    } catch (error) {
      console.error('Backend login check failed:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && authInstance) {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(authInstance, provider);
        const idToken = await result.user.getIdToken();
        await handleBackendLogin(idToken);
      } else {
        // Dev Bypass Mode: Simulate Google Sign-In with a prompt or default
        const email = prompt('Enter a mock email for dev mode:', 'analytics-expert@example.com') || 'dev-user@example.com';
        const name = email.split('@')[0].toUpperCase();
        await devLogin(email, name);
      }
    } catch (error) {
      console.error('Sign-in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const devLogin = async (email: string, name: string) => {
    setLoading(true);
    try {
      const idToken = `dev-token-${email}-${name}`;
      await handleBackendLogin(idToken);
    } catch (error) {
      console.error('Dev bypass sign-in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isFirebaseConfigured && authInstance) {
        await firebaseSignOut(authInstance);
      }
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthHeader(null);
      setUser(null);
      setLoading(false);
    }
  };

  const updateUserProfile = async (name: string, photoURL?: string) => {
    try {
      const res = await axios.put('/api/users/profile', { name, photoURL });
      if (res.data && res.data.data && res.data.data.user) {
        setUser(res.data.data.user);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        logout,
        updateUserProfile,
        isDevBypass: !isFirebaseConfigured,
        devLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

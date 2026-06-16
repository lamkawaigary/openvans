import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, role: 'owner' | 'renter') => Promise<void>;
  signInWithGoogle: (role: 'owner' | 'renter') => Promise<void>;
  /** Initialize GIS + render a real Google Sign-In button into the given container. */
  renderGoogleButton: (
    container: HTMLElement,
    onError?: (message: string) => void
  ) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Google Identity Services (GIS) — loaded dynamically to bypass Firebase Auth's OAuth popup issues
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string; error?: string }) => void;
          }) => void;
          requestIdToken: (config: {
            client_id: string;
            callback: (response: { credential?: string; error?: string }) => void;
          }) => void;
          prompt: () => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'small' | 'medium' | 'large';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

let gisLoadPromise: Promise<void> | null = null;

function loadGIS(): Promise<void> {
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUserLoading(true);
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() } as User);
        } else {
          const savedRole = sessionStorage.getItem('google_signin_role') as 'owner' | 'renter' | null;
          const role = savedRole || 'renter';
          sessionStorage.removeItem('google_signin_role');
          const newUser: Omit<User, 'uid'> = {
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            phone: '',
            role,
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser({ uid: firebaseUser.uid, ...newUser });
        }
        setUserLoading(false);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    role: 'owner' | 'renter'
  ) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(firebaseUser, { displayName: name });

    const newUser: Omit<User, 'uid'> = {
      name,
      email,
      phone,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
    setUser({ uid: firebaseUser.uid, ...newUser });
  };

  const signInWithGoogle = async (role: 'owner' | 'renter') => {
    // Kept for backward compatibility — LoginPage now uses renderGoogleButton().
    // Triggers the One Tap flow directly (no rendering required).
    sessionStorage.setItem('google_signin_role', role);
    await loadGIS();
    const clientId = await getGoogleClientId();
    if (!clientId) {
      throw new Error('Google OAuth client ID not found.');
    }
    return new Promise<void>((resolve, reject) => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          if (!response.credential) {
            reject(new Error('No credential received from Google'));
            return;
          }
          try {
            const credential = GoogleAuthProvider.credential(response.credential);
            await signInWithCredential(auth, credential);
            resolve();
          } catch (err: any) {
            reject(err);
          }
        },
      });
      window.google.accounts.id.prompt();
    });
  };

  /**
   * Initialize Google Identity Services and render a real Google Sign-In button
   * into the given container. Clicking the button opens Google's standard
   * sign-in popup and returns the credential via the internal callback.
   *
   * This replaces the previous One Tap UX (accounts.id.prompt) which was
   * 1) hidden in the corner (easy to miss) and
   * 2) could leave the loading state stuck forever if dismissed.
   */
  const renderGoogleButton = async (
    container: HTMLElement,
    onError?: (message: string) => void
  ): Promise<void> => {
    await loadGIS();
    const clientId = await getGoogleClientId();
    if (!clientId) {
      const msg = 'Google OAuth client ID not found.';
      onError?.(msg);
      throw new Error(msg);
    }

    // Idempotent: if already initialized for this clientId, just re-render.
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (response.error) {
          const msg = response.error || 'unknown_error';
          console.error('[GoogleLogin] GIS callback error:', msg);
          onError?.(msg);
          return;
        }
        if (!response.credential) {
          const msg = 'No credential received from Google';
          console.error('[GoogleLogin]', msg);
          onError?.(msg);
          return;
        }
        try {
          const credential = GoogleAuthProvider.credential(response.credential);
          await signInWithCredential(auth, credential);
        } catch (err: any) {
          console.error('[GoogleLogin] Firebase signInWithCredential error:', err);
          onError?.(err?.message || 'Firebase sign-in failed');
        }
      },
    });

    // Clear any previous render before re-rendering (React strict mode + HMR safe)
    container.innerHTML = '';

    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.max(240, container.offsetWidth || 320),
    });
  };

  const signOutUser = async () => {
    await signOut(auth);
    setUser(null);
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!auth.currentUser) return;
    await setDoc(doc(db, 'users', auth.currentUser.uid), data, { merge: true });
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  const isLoading = authLoading || userLoading;

  return (
    <AuthContext.Provider value={{ user, loading: isLoading, signIn, signUp, signInWithGoogle, renderGoogleButton, signOutUser, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Helper: get Google OAuth client_id for the Firebase project
// Priority: 1) VITE_GOOGLE_CLIENT_ID env var (set by developer from Firebase Console)
//           2) Constructed from Firebase app ID (may not match actual OAuth client)
async function getGoogleClientId(): Promise<string | null> {
  // First, check if developer explicitly set GOOGLE_CLIENT_ID in env
  const envClientId = (window as any).__ENV?.VITE_GOOGLE_CLIENT_ID ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID);
  if (envClientId) {
    sessionStorage.setItem('google_client_id', envClientId);
    return envClientId;
  }

  // Fallback: construct from Firebase config
  // Format: {messagingSenderId}-{appIdSuffix}.apps.googleusercontent.com
  try {
    const config = (auth as any).app.options;
    const { messagingSenderId } = config;
    const appId = config.appId; // e.g. "1:828737485195:web:e34fb1246e9e363dabd78e"
    const appIdSuffix = appId.split(':')[2]; // "e34fb1246e9e363dabd78e"
    const constructedClientId = `${messagingSenderId}-${appIdSuffix}.apps.googleusercontent.com`;
    sessionStorage.setItem('google_client_id', constructedClientId);
    return constructedClientId;
  } catch (e) {
    console.warn('[GoogleLogin] Could not determine client_id:', e);
    return null;
  }
}

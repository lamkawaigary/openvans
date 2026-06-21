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
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string, role: 'driver' | 'renter') => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  /** Initialize GIS + render a real Google Sign-In button into the given container. */
  renderGoogleButton: (
    container: HTMLElement,
    onError?: (message: string) => void
  ) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Normalize legacy role values to the current UserRole enum.
 * - 'owner' → 'driver' (legacy: car owner role was renamed to driver)
 * - unknown values → 'renter' (safe default; admin role only set explicitly)
 * Returns null if input is null/undefined.
 */
function normalizeRole(role: unknown): UserRole | null {
  if (role == null) return null;
  if (role === 'driver' || role === 'renter' || role === 'admin') return role;
  if (role === 'owner') return 'driver';
  return 'renter';
}

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
let gisInitPromise: Promise<string> | null = null;
let gisInitializedClientId: string | null = null;

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

/**
 * Initialize Google Identity Services exactly once at module scope.
 * This guarantees the callback is registered before any page-load fragment
 * (#id_token=...) is parsed, which is essential for the incognito / ITP
 * fallback where Google opens a NEW tab and navigates it back to the
 * origin with the id_token in the URL fragment.
 */
async function ensureGISInitialized(
  clientId: string,
  onError?: (message: string) => void
): Promise<string> {
  if (gisInitPromise && gisInitializedClientId === clientId) {
    return gisInitPromise;
  }

  gisInitPromise = (async () => {
    await loadGIS();
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        // GIS calls this for both popup mode and redirect-mode fragment
        // delivery. The fragment path is what fires in incognito.
        console.log('[GoogleLogin] GIS callback fired', {
          hasCredential: !!response.credential,
          error: response.error,
        });
        // Notify legacy signInWithGoogle() consumers via a DOM event.
        window.dispatchEvent(
          new CustomEvent('google-signin-result', { detail: response })
        );
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
          // Lazy import to avoid circular deps and to keep this module
          // loadable outside of the React tree (e.g. from main.tsx).
          const { auth } = await import('../firebase/config');
          const { GoogleAuthProvider, signInWithCredential: fbSignIn } =
            await import('firebase/auth');
          const credential = GoogleAuthProvider.credential(response.credential);
          await fbSignIn(auth, credential);
          console.log('[GoogleLogin] Firebase signInWithCredential OK');
        } catch (err: any) {
          console.error('[GoogleLogin] Firebase signInWithCredential error:', err);
          onError?.(err?.message || 'Firebase sign-in failed');
        }
      },
    });
    gisInitializedClientId = clientId;
    return clientId;
  })();

  return gisInitPromise;
}

/**
 * Parse #id_token=... on page load. GIS library should normally do this
 * itself, but in some browser/storage contexts (incognito, third-party
 * cookie blocking) it silently drops the fragment. This is a safety net.
 */
export async function handleAuthFragmentOnLoad(): Promise<void> {
  if (!window.location.hash.includes('id_token=')) return;
  try {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const idToken = params.get('id_token');
    if (!idToken) return;
    // Ensure GIS is loaded so the singleton callback can also process the
    // same fragment (idempotent). Then immediately call our handler.
    await loadGIS();
    const { auth } = await import('../firebase/config');
    const { GoogleAuthProvider, signInWithCredential: fbSignIn } =
      await import('firebase/auth');
    const credential = GoogleAuthProvider.credential(idToken);
    await fbSignIn(auth, credential);
    console.log('[GoogleLogin] handleAuthFragmentOnLoad: signed in');
    // Clean the URL fragment so a refresh doesn't re-trigger.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch (err) {
    console.error('[GoogleLogin] handleAuthFragmentOnLoad error:', err);
  }
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
          const rawData = userDoc.data();
          const normalizedRole = normalizeRole(rawData.role);
          // Self-heal legacy 'owner' role (or unknown values) in Firestore.
          if (normalizedRole !== rawData.role) {
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), { role: normalizedRole }, { merge: true });
            } catch (err) {
              console.warn('[Auth] Failed to normalize user role:', err);
            }
          }
          setUser({ uid: firebaseUser.uid, ...rawData, role: normalizedRole! } as User);
        } else {
          // New Google sign-in: create user doc with default role 'renter'.
          // Caller is expected to redirect to /onboarding to let the user pick.
          const newUser: Omit<User, 'uid'> = {
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            phone: '',
            role: 'renter',
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
    role: 'driver' | 'renter'
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

  const signInWithGoogle = async (): Promise<void> => {
    // Sign in with Google using One Tap. No role parameter is required —
    // existing users have their role stored in Firestore and the onAuthStateChanged
    // listener will load it automatically. New users get a default 'renter' role
    // and should be redirected to /onboarding by the caller to pick their role.
    const clientId = await getGoogleClientId();
    if (!clientId) {
      throw new Error('Google OAuth client ID not found.');
    }
    // Reuse the hoisted singleton init so the callback is shared with
    // renderGoogleButton. We then wait for our singleton callback to
    // resolve the promise.
    await ensureGISInitialized(clientId);
    return new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error('Google sign-in timed out (no callback fired)')),
        60_000
      );
      const handler = async (response: { credential?: string; error?: string }) => {
        window.clearTimeout(timer);
        window.removeEventListener('google-signin-result', handler as any);
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
      };
      window.addEventListener('google-signin-result', handler as any);
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

    // Hoist GIS initialize to module level so the callback is registered
    // before React useEffect runs. This is critical for incognito / ITP
    // fallback: when GIS opens a new tab with #id_token=... and the page
    // reloads, the callback must already be listening for the fragment.
    await ensureGISInitialized(clientId, onError);

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

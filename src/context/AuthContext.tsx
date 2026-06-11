import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
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
  signOutUser: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // authLoading: true while Firebase auth state is being resolved
  // userLoading: true while Firestore user profile is being fetched
  // total loading = authLoading || userLoading
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
          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            phone: '',
            role: 'renter',
            isActive: true,
            createdAt: new Date().toISOString(),
          });
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
    const provider = new GoogleAuthProvider();
    try {
      const { user: firebaseUser } = await signInWithPopup(auth, provider);

      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        const newUser: Omit<User, 'uid'> = {
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          phone: '',
          role,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      }
    } catch (error: any) {
      // Handle popup blocked or other errors
      if (error.code === 'auth/popup-blocked' || error.message?.includes('popup')) {
        throw new Error('popup_blocked');
      }
      if (error.code === 'auth/unauthorized-domain') {
        throw new Error('unauthorized_domain');
      }
      throw error;
    }
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
    <AuthContext.Provider value={{ user, loading: isLoading, signIn, signUp, signInWithGoogle, signOutUser, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

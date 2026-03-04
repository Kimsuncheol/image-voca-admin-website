'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import {
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  signOut as firebaseSignOut,
  onAuthChange,
} from '@/lib/firebase/auth';
import { getUserById, createOrUpdateUser } from '@/lib/firebase/users';
import type { AppUser } from '@/types/user';

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, photoURL?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const appUser = await getUserById(fbUser.uid);
        setUser(
          appUser || {
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || '',
            photoURL: fbUser.photoURL || undefined,
            role: 'user',
          }
        );
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const fbUser = await firebaseSignIn(email, password);
    const appUser = await getUserById(fbUser.uid);
    const role = appUser?.role;
    if (role !== 'admin' && role !== 'super-admin') {
      await firebaseSignOut();
      throw Object.assign(new Error('Insufficient role'), { code: 'auth/insufficient-role' });
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    photoURL?: string
  ) => {
    const fbUser = await firebaseSignUp(email, password, displayName, photoURL);
    await createOrUpdateUser({
      uid: fbUser.uid,
      email: fbUser.email || email,
      displayName,
      photoURL,
      role: 'user',
    });
  };

  const signOut = async () => {
    await firebaseSignOut();
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'user' | 'admin';
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Admin emails list - эдгээр и-мэйл автоматаар admin болно
const ADMIN_EMAILS = [
  'admin@sainleague.mn',
  // Та өөрийн и-мэйлийг энд нэмж болно
];

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Firestore-д хэрэглэгчийн мэдээлэл хадгалах
  async function createUserDocument(user: User, additionalData?: { displayName?: string }) {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const { email, photoURL } = user;
      const displayName = additionalData?.displayName || user.displayName;
      
      // Check if email is in admin list
      const isAdmin = email && ADMIN_EMAILS.includes(email.toLowerCase());

      try {
        await setDoc(userRef, {
          uid: user.uid,
          email,
          displayName,
          photoURL,
          role: isAdmin ? 'admin' : 'user',
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error creating user document:', error);
      }
    }
  }

  // Хэрэглэгчийн мэдээлэл авах
  async function fetchUserData(uid: string) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      setUserData(userSnap.data() as UserData);
    }
  }

  // Sign up
  async function signUp(email: string, password: string, displayName: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    await createUserDocument(user, { displayName });
    await fetchUserData(user.uid);
  }

  // Log in
  async function logIn(email: string, password: string) {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserData(user.uid);
  }

  // Log out
  async function logOut() {
    await signOut(auth);
    setUser(null);
    setUserData(null);
  }

  // Google Sign In
  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    await createUserDocument(user);
    await fetchUserData(user.uid);
  }

  // Get ID Token for API authentication
  async function getIdToken(): Promise<string | null> {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchUserData(user.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    loading,
    signUp,
    logIn,
    logOut,
    signInWithGoogle,
    getIdToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

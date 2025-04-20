
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type UserProfile = {
  uid: string;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
};

type AuthContextType = {
  currentUser: User | null;
  userProfile: UserProfile | null;
  signup: (email: string, password: string, username: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserProfile(user: User) {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          uid: user.uid,
          email: user.email,
          username: data.username || null,
          avatarUrl: data.avatarUrl || null,
        });
      } else {
        setUserProfile({
          uid: user.uid,
          email: user.email,
          username: null,
          avatarUrl: null,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signup(email: string, password: string, username: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      username,
      email,
      created_at: new Date().toISOString(),
      avatarUrl: null
    });
    
    // Update Firebase Auth profile
    await updateProfile(user, { displayName: username });
    
    // Update local state
    setUserProfile({
      uid: user.uid,
      email: user.email,
      username,
      avatarUrl: null
    });
    
    return user;
  }

  async function login(email: string, password: string) {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserProfile(user);
    return user;
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function updateUserProfile(data: Partial<UserProfile>) {
    if (!currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.uid);
    
    // Update Firestore
    await setDoc(userRef, {
      ...data,
      updated_at: new Date().toISOString()
    }, { merge: true });
    
    // Update local state
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        ...data
      });
    }
    
    // Update Firebase Auth profile
    if (data.username) {
      await updateProfile(currentUser, { displayName: data.username });
    }
    
    if (data.avatarUrl) {
      await updateProfile(currentUser, { photoURL: data.avatarUrl });
    }
  }

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

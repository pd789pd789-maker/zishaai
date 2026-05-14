import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  role: 'user' | 'admin';
  phone: string | null;
  email: string | null;
  points: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isBeta: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
  isBeta: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBeta, setIsBeta] = useState(false);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await docRef.get();
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        const newProfile: UserProfile = {
          uid,
          role: 'user',
          phone: null,
          email: null,
          points: 50,
          createdAt: new Date().toISOString() as any,
          updatedAt: new Date().toISOString() as any,
        } as any;
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // Check beta token first
    const betaToken = localStorage.getItem('beta_token');
    const betaUid = localStorage.getItem('beta_uid') || 'beta-user';
    const betaIdToken = localStorage.getItem('beta_id_token') || 'beta-' + betaUid;
    if (betaToken === 'active') {
      setIsBeta(true);
      setUser({ uid: betaUid } as unknown as User);
      setProfile({
        uid: betaUid,
        role: 'user',
        phone: null,
        email: null,
        points: 99999,
      });
      setLoading(false);
      return;
    }

    // Normal Firebase auth
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (isBeta) {
      localStorage.removeItem('beta_token');
      localStorage.removeItem('beta_uid');
      setIsBeta(false);
      setUser(null);
      setProfile(null);
      window.location.href = '/login';
    } else {
      await signOut(auth);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile, isBeta }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
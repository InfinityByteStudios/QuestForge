import { createContext, useContext, useEffect, useState } from 'react';
import { type User } from 'firebase/auth';
import { onAuth, signInAnon, signInWithGithub, signInWithGoogle, signOutUser } from '@/lib/firebase';

type AuthCtx = {
  user: User | null;
  signInGoogle: () => Promise<void>;
  signInGithub: () => Promise<void>;
  signInAnonymous: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuth(setUser);
    return () => unsub();
  }, []);

  const value: AuthCtx = {
    user,
    signInGoogle: async () => { await signInWithGoogle(); },
    signInGithub: async () => { await signInWithGithub(); },
    signInAnonymous: async () => { await signInAnon(); },
    signOut: async () => { await signOutUser(); }
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

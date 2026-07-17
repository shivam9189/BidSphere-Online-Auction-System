import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser } from '../api';

const UserContext = createContext(null);

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await getCurrentUser().catch(() => null);
        if (!mounted) return;
        setUser(res?.user || res || null);
        // Clear localStorage if backend confirms no user
        if (!res?.user) {
          try { localStorage.removeItem("bidsphere_user"); } catch {}
        }
      } catch (err) {
        console.error('UserProvider getCurrentUser error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export default UserContext;

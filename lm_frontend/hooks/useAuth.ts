import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth } from '../firebaseConfig';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth(); // lazy init aici
    console.log("[DEBUG] getFirebaseAuth:", auth);
    console.log("[DEBUG] onAuthStateChanged hook triggered");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("[DEBUG] User in hook:", firebaseUser);
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}
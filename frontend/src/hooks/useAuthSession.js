import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

export const useAuthSession = (initialUser, navigate) => {
  const [user, setUser] = useState(initialUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Battement de cœur (Heartbeat) de sécurité : vérifie périodiquement la validité de la session
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const checkSession = async () => {
      if (document.hidden) return;

      try {
        const token = localStorage.getItem('token');
        const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const { data: updatedUser } = await axios.get(`${API_URL}/api/auth/me`, headers);
        if (updatedUser && isMounted) {
          setUser((prev) => {
            const hasChanged = JSON.stringify(prev) !== JSON.stringify(updatedUser);
            if (hasChanged) {
              localStorage.setItem('user', JSON.stringify(updatedUser));
              return updatedUser;
            }
            return prev;
          });
        }
      } catch (e) {
        // Déconnecté automatiquement par l'intercepteur global si token expiré
      }
    };

    const heartbeat = setInterval(checkSession, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Déconnexion unifiée avec notification SLO (Single Logout)
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.post(`${API_URL}/api/auth/logout`, {}, headers);
    } catch (e) {
      console.error('Erreur lors de la déconnexion backend:', e);
    }

    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login', {
        state: {
          sloMessage: 'Déconnexion globale réussie : vos sessions actives sur le HUB et toutes les applications connectées ont été révoquées simultanément.'
        }
      });
    }, 700);
  }, [navigate]);

  return {
    user,
    setUser,
    isLoggingOut,
    handleLogout
  };
};

export default useAuthSession;

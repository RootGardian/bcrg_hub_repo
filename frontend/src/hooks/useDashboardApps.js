import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

export const useDashboardApps = (user, navigate) => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApps = useCallback(async (signal) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const config = {
        withCredentials: true,
        signal,
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      };
      const { data } = await axios.get(`${API_URL}/api/apps/my-apps`, config);
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('Erreur chargement apps:', err);
      setError(err.response?.data?.message || "Impossible de charger les applications.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    fetchApps(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchApps]);

  // Calcul dérivé instantané : pas d'état dupliqué pour le filtre de recherche
  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((app) =>
      app.name?.toLowerCase().includes(q) ||
      app.description?.toLowerCase().includes(q)
    );
  }, [apps, searchQuery]);

  // Logique d'ouverture sécurisée d'une application (SSO, Maintenance, Lien direct)
  const openApp = useCallback((app) => {
    if (app.status === 'En maintenance') {
      navigate(`/maintenance?appName=${encodeURIComponent(app.name)}&appId=${app.id}&desc=${encodeURIComponent(app.description || '')}`);
      return;
    }

    if (app.status !== 'Actif') {
      return;
    }

    const isNone = String(app.auth_type).toUpperCase() === 'NONE';
    if (isNone) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert("Votre session BCRG HUB a expiré. Veuillez vous reconnecter.");
      localStorage.removeItem('user');
      navigate('/login');
      return;
    }

    const ssoRedirectUrl = `${API_URL}/api/apps/${app.id}/sso-redirect?token=${encodeURIComponent(token)}`;
    window.open(ssoRedirectUrl, '_blank', 'noopener,noreferrer');
  }, [navigate]);

  return {
    apps,
    filteredApps,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    refetch: fetchApps,
    openApp
  };
};

export default useDashboardApps;

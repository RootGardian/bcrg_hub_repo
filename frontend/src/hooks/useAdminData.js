import { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export const useAdminData = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ users: 0, applications: 0, roles: 0 });
  const [usersList, setUsersList] = useState([]);
  const [apps, setApps] = useState([]);
  const [roles, setRoles] = useState([]);

  // Données LDAP & Active Directory
  const [ldapUsers, setLdapUsers] = useState([]);
  const [ldapGroups, setLdapGroups] = useState([]);
  const [ldapOUs, setLdapOUs] = useState([]);
  const [loadingLdap, setLoadingLdap] = useState(false);
  const [ldapError, setLdapError] = useState(null);

  // --- FETCHERS ---
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/stats`, getAuthConfig());
      setStats(data || { users: 0, applications: 0, roles: 0 });
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/admin/users`, getAuthConfig());
      setUsersList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/admin/applications`, getAuthConfig());
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/admin/roles`, getAuthConfig());
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement rôles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLdapEntities = useCallback(async () => {
    setLoadingLdap(true);
    setLdapError(null);
    try {
      const [resUsers, resGroups] = await Promise.all([
        axios.get(`${API_URL}/api/ldap-config/users`, getAuthConfig()).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/ldap-config/groups`, getAuthConfig())
      ]);
      setLdapUsers(resUsers.data || []);
      setLdapGroups(resGroups.data || []);

      try {
        const resOus = await axios.get(`${API_URL}/api/ldap-config/ous`, getAuthConfig());
        setLdapOUs(resOus.data || []);
      } catch {
        // Optionnel : les OUs sont déduites des DN des groupes
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de l'AD", err);
      setLdapError(
        "Serveur Active Directory injoignable (172.16.100.3:389). Vérifiez la connectivité réseau."
      );
    } finally {
      setLoadingLdap(false);
    }
  }, []);

  // --- MUTATIONS APPLICATIONS ---
  const saveApp = useCallback(async (appData, editingId) => {
    if (editingId) {
      await axios.put(`${API_URL}/api/admin/applications/${editingId}`, appData, getAuthConfig());
    } else {
      await axios.post(`${API_URL}/api/admin/applications`, appData, getAuthConfig());
    }
    await Promise.all([fetchApps(), fetchStats()]);
  }, [fetchApps, fetchStats]);

  const deleteApp = useCallback(async (appId) => {
    await axios.delete(`${API_URL}/api/admin/applications/${appId}`, getAuthConfig());
    await Promise.all([fetchApps(), fetchStats()]);
  }, [fetchApps, fetchStats]);

  // --- MUTATIONS UTILISATEURS ---
  const saveUser = useCallback(async (userData, userId) => {
    await axios.put(`${API_URL}/api/admin/users/${userId}`, userData, getAuthConfig());
    await Promise.all([fetchUsers(), fetchStats()]);
  }, [fetchUsers, fetchStats]);

  const deleteUser = useCallback(async (userId) => {
    await axios.delete(`${API_URL}/api/admin/users/${userId}`, getAuthConfig());
    await Promise.all([fetchUsers(), fetchStats()]);
  }, [fetchUsers, fetchStats]);

  const revokeUserSessions = useCallback(async (userId) => {
    const res = await axios.post(`${API_URL}/api/admin/users/${userId}/revoke-sessions`, {}, getAuthConfig());
    return res.data?.message;
  }, []);

  // --- MUTATIONS RÔLES ---
  const saveRole = useCallback(async (roleData, editingId) => {
    if (editingId) {
      await axios.put(`${API_URL}/api/admin/roles/${editingId}`, roleData, getAuthConfig());
    } else {
      await axios.post(`${API_URL}/api/admin/roles`, roleData, getAuthConfig());
    }
    await Promise.all([fetchRoles(), fetchStats()]);
  }, [fetchRoles, fetchStats]);

  const deleteRole = useCallback(async (roleId) => {
    await axios.delete(`${API_URL}/api/admin/roles/${roleId}`, getAuthConfig());
    await Promise.all([fetchRoles(), fetchStats()]);
  }, [fetchRoles, fetchStats]);

  const revokeLdapMapping = useCallback(async (mappingId) => {
    await axios.delete(`${API_URL}/api/admin/roles/mapping/${mappingId}`, getAuthConfig());
    await fetchRoles();
  }, [fetchRoles]);

  // --- ASSIGNATIONS ---
  const assignApp = useCallback(async (assignData) => {
    if (assignData.targetType === 'user') {
      const { data } = await axios.post(
        `${API_URL}/api/admin/users/assign-app`,
        {
          user_id: assignData.user_id,
          app_id: assignData.app_id
        },
        getAuthConfig()
      );
      return data.message;
    }

    if (assignData.targetType === 'group') {
      const { data } = await axios.post(
        `${API_URL}/api/admin/groups/assign-app`,
        {
          ldap_identifier: assignData.ldap_identifier,
          ldap_name: assignData.ldap_name,
          app_id: assignData.app_id
        },
        getAuthConfig()
      );
      return data.message;
    }

    if (assignData.targetType === 'role') {
      const { data } = await axios.post(
        `${API_URL}/api/admin/roles/assign-app`,
        {
          role_id: assignData.role_id,
          app_id: assignData.app_id
        },
        getAuthConfig()
      );
      await fetchRoles();
      return data.message;
    }

    throw new Error('Type de cible non reconnu');
  }, [fetchRoles]);

  const assignRoleToLdap = useCallback(async (assignRoleData) => {
    const { data } = await axios.post(
      `${API_URL}/api/admin/roles/assign-ldap`,
      assignRoleData,
      getAuthConfig()
    );
    await fetchRoles();
    return data;
  }, [fetchRoles]);

  return {
    loading,
    stats,
    usersList,
    apps,
    roles,
    ldapUsers,
    ldapGroups,
    ldapOUs,
    loadingLdap,
    ldapError,
    fetchStats,
    fetchUsers,
    fetchApps,
    fetchRoles,
    fetchLdapEntities,
    saveApp,
    deleteApp,
    saveUser,
    deleteUser,
    revokeUserSessions,
    saveRole,
    deleteRole,
    revokeLdapMapping,
    assignApp,
    assignRoleToLdap
  };
};

export default useAdminData;

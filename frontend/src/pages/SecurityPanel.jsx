import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  Radio,
  ShieldCheck,
  Key,
  FileText,
  Smartphone,
  RefreshCw,
  Download,
  Copy,
  Server,
  LogOut,
  ExternalLink,
  Users,
  Activity,
  Trash2,
  ArrowRight,
  Check,
  QrCode,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
  Terminal,
  Crosshair,
  Cpu,
  Layers,
  Globe,
  Flame,
  CheckCircle2,
  XCircle,
  Hash
} from 'lucide-react';
import './SecurityPanel.css';

const SecurityPanel = () => {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [testingSlo, setTestingSlo] = useState(false);
  const [sloTestResult, setSloTestResult] = useState(null);
  const [revokingSessionId, setRevokingSessionId] = useState(null);
  const [revokingAppSessionId, setRevokingAppSessionId] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString('fr-FR'));
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  // États spécifiques au tableau de bord BCRG_SIEM
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [siemFilterCategory, setSiemFilterCategory] = useState('ALL');
  const [siemSearchTerm, setSiemSearchTerm] = useState('');
  const [inspectorView, setInspectorView] = useState('table'); // 'table' | 'json'

  // Helper BCRG_SIEM : Détermination du niveau de sévérité (Levels 1 à 15)
  const getBcrgSiemEventLevel = (log) => {
    const action = (log.action || '').toLowerCase();
    const status = (log.status || '').toUpperCase();
    const type = (log.type || '').toUpperCase();

    if (status.includes('ÉCHEC') || status.includes('FAIL') || type === 'ALERT') {
      if (action.includes('brute') || action.includes('attaque') || action.includes('non autorisé')) return 12;
      return 10;
    }
    if (type === 'ADMIN' || action.includes('révocation') || action.includes('suppression') || action.includes('purge')) {
      return 8;
    }
    if (type === 'SSO' || type === 'SLO') {
      return 5;
    }
    return 3;
  };

  // Helper BCRG_SIEM : Classification MITRE ATT&CK
  const getBcrgSiemMitreTag = (log) => {
    const action = (log.action || '').toLowerCase();
    const type = (log.type || '').toUpperCase();
    const status = (log.status || '').toUpperCase();

    if (status.includes('ÉCHEC') || action.includes('brute')) {
      return { id: 'T1110', name: 'Brute Force', tactic: 'Credential Access' };
    }
    if (action.includes('révocation') || action.includes('déconnexion') || type === 'SLO') {
      return { id: 'T1531', name: 'Account Access Removal', tactic: 'Impact' };
    }
    if (type === 'ADMIN' || action.includes('mise à jour') || action.includes('paramètre')) {
      return { id: 'T1098', name: 'Account Manipulation', tactic: 'Persistence' };
    }
    if (type === 'SSO' || action.includes('jeton') || action.includes('token')) {
      return { id: 'T1550.001', name: 'Application Token', tactic: 'Defense Evasion' };
    }
    return { id: 'T1078', name: 'Valid Accounts', tactic: 'Initial Access' };
  };

  const getLevelBadgeClass = (level) => {
    if (level >= 12) return 'bcrg-siem-lvl-crit';
    if (level >= 8) return 'bcrg-siem-lvl-high';
    if (level >= 5) return 'bcrg-siem-lvl-med';
    return 'bcrg-siem-lvl-low';
  };

  // Données réelles issues de PostgreSQL
  const [securityStatus, setSecurityStatus] = useState({
    active_sessions: 0,
    active_app_sessions: 0,
    total_users: 0,
    mfa_enrolled_users: 0,
    total_apps: 0,
    slo_apps_count: 0,
    active_sessions_list: [],
    active_app_sessions_list: [],
    mfa_enforced: false,
    jwks_url: ''
  });

  const [settings, setSettings] = useState({
    sso_token_lifetime: 60,
    sso_mode: 'CODE_EXCHANGE',
    mfa_enforced: false
  });

  const [auditLogs, setAuditLogs] = useState([]);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };



  // Récupération des données réelles
  const fetchSecurityData = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      // 1. Statut & Sessions en temps réel
      const statusRes = await axios.get(`${API_URL}/api/security/status`, getAuthConfig());
      if (statusRes.data) {
        setSecurityStatus(statusRes.data);
      }

      // 2. Paramètres réels
      const settingsRes = await axios.get(`${API_URL}/api/security/settings`, getAuthConfig());
      if (settingsRes.data) {
        setSettings(prev => ({
          ...prev,
          ...settingsRes.data,
          mfa_enforced: settingsRes.data.mfa_enforced === 'true' || settingsRes.data.mfa_enforced === true
        }));
      }

      // 3. Vrais événements SIEM
      const logsRes = await axios.get(`${API_URL}/api/security/audit-logs`, getAuthConfig());
      if (logsRes.data) {
        setAuditLogs(logsRes.data);
      }

      setLastSyncTime(new Date().toLocaleTimeString('fr-FR'));
    } catch (err) {
      console.error("Erreur lors de la synchronisation de sécurité :", err);
    } finally {
      if (isManual) setLoading(false);
    }
  }, [API_URL]);

  // Surveillance en temps réel avec intervalle automatique
  useEffect(() => {
    fetchSecurityData(true);

    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchSecurityData(false);
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchSecurityData, isAutoRefresh]);

  // Révocation d'une session en temps réel
  const handleRevokeSession = (sessionId, userEmail) => {
    setConfirmModal({
      title: "Révocation de Session (SLO)",
      message: `Confirmez-vous la révocation immédiate de la session de "${userEmail || 'cet utilisateur'}" ?`,
      subtext: "Le jeton de session sera immédiatement invalidé en base et le signal de Single Logout (SLO) sera envoyé aux applications connectées pour déconnecter cet utilisateur.",
      confirmText: "Révoquer la session",
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setRevokingSessionId(sessionId);
        try {
          const res = await axios.post(`${API_URL}/api/security/revoke-session/${sessionId}`, {}, getAuthConfig());
          setMessage(`✓ ${res.data?.message || 'Session fermée avec succès en direct'}`);
          setTimeout(() => setMessage(''), 4000);
          fetchSecurityData(false);
        } catch (err) {
          setMessage("❌ Erreur lors de la fermeture de la session.");
          setTimeout(() => setMessage(''), 3500);
        } finally {
          setRevokingSessionId(null);
        }
      }
    });
  };

  // Révocation d'une session applicative spécifique en temps réel
  const handleRevokeAppSession = (sessionId, appName, userEmail) => {
    setConfirmModal({
      title: "Révocation d'Accès Applicatif (SLO)",
      message: `Voulez-vous révoquer l'accès à "${appName || 'cette application'}" pour ${userEmail || 'cet utilisateur'} ?`,
      subtext: "La session applicative sera invalidée et le signal de déconnexion Back-Channel sera transmis à l'application cible.",
      confirmText: "Révoquer l'accès",
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setRevokingAppSessionId(sessionId);
        try {
          const res = await axios.post(`${API_URL}/api/security/revoke-app-session/${sessionId}`, {}, getAuthConfig());
          setMessage(`✓ ${res.data?.message || 'Accès applicatif révoqué avec succès'}`);
          setTimeout(() => setMessage(''), 4000);
          fetchSecurityData(false);
        } catch (err) {
          setMessage("❌ Erreur lors de la révocation de l'accès applicatif.");
          setTimeout(() => setMessage(''), 3500);
        } finally {
          setRevokingAppSessionId(null);
        }
      }
    });
  };

  // Suppression d'un log spécifique
  const handleDeleteAuditLog = (logId) => {
    setConfirmModal({
      title: "Suppression d'un Événement",
      message: "Voulez-vous supprimer cet événement du journal de sécurité ?",
      subtext: "Cette action retirera la ligne sélectionnée du journal d'audit.",
      confirmText: "Supprimer l'événement",
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await axios.delete(`${API_URL}/api/security/audit-logs/${logId}`, getAuthConfig());
          setMessage("✓ Événement supprimé avec succès");
          setTimeout(() => setMessage(''), 3000);
          fetchSecurityData(false);
        } catch (err) {
          setMessage("❌ Erreur lors de la suppression de l'événement.");
          setTimeout(() => setMessage(''), 3500);
        }
      }
    });
  };

  // Purge complète du journal d'audit
  const handleClearAuditLogs = () => {
    setConfirmModal({
      title: "Purger tout le Journal d'Audit",
      message: "Êtes-vous sûr de vouloir supprimer TOUS les événements du journal d'audit ?",
      subtext: "L'ensemble de l'historique d'audit sera définitivement effacé.",
      confirmText: "Purger tout le journal",
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await axios.delete(`${API_URL}/api/security/audit-logs`, getAuthConfig());
          setMessage("✓ Journal d'audit purgé avec succès");
          setTimeout(() => setMessage(''), 3000);
          fetchSecurityData(false);
        } catch (err) {
          setMessage("❌ Erreur lors de la purge du journal.");
          setTimeout(() => setMessage(''), 3500);
        }
      }
    });
  };

  // Enregistrement des paramètres réels
  const handleSaveSettings = async (sectionName) => {
    try {
      await axios.put(`${API_URL}/api/security/settings`, settings, getAuthConfig());
      setMessage(`✓ ${sectionName} appliqué(e) avec succès !`);
      setTimeout(() => setMessage(''), 3500);
      fetchSecurityData(false);
    } catch (err) {
      setMessage("❌ Erreur lors de l'enregistrement des paramètres.");
      setTimeout(() => setMessage(''), 3500);
    }
  };

  // Copie de l'endpoint JWKS public
  const handleCopyKey = () => {
    if (!securityStatus.jwks_url) return;
    navigator.clipboard.writeText(securityStatus.jwks_url);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Test en direct du Single Logout (SLO)
  const handleTestSlo = async () => {
    setTestingSlo(true);
    try {
      const res = await axios.post(`${API_URL}/api/security/test-slo`, {}, getAuthConfig());
      setSloTestResult(res.data?.slo);
      setMessage(`✓ Signal SLO diffusé : ${res.data?.slo?.notified_count || 0} application(s) notifiée(s)`);
      setTimeout(() => setMessage(''), 4000);
      fetchSecurityData(false);
    } catch (err) {
      setMessage("❌ Erreur lors du test de révocation SLO.");
      setTimeout(() => setMessage(''), 3500);
    } finally {
      setTestingSlo(false);
    }
  };

  // Export CSV du journal d'audit réel
  const handleExportCSV = () => {
    if (auditLogs.length === 0) return;
    const headers = ["ID", "Type", "Action", "Utilisateur", "IP", "Cible", "Statut", "Date"];
    const rows = auditLogs.map(l => [
      l.id,
      l.type,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      l.user,
      l.ip,
      `"${(l.app || '').replace(/"/g, '""')}"`,
      l.status,
      l.createdAt || new Date().toISOString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bcrg_hub_security_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="security-panel-container">
      {/* Toast Feedback */}
      {message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: message.includes('❌') ? '#ef4444' : '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999
        }}>
          {message}
        </div>
      )}

      {/* Barre de navigation uniquement avec les fonctionnalités réelles */}
      <div className="security-subtabs">
        <button
          className={`security-subtab-btn ${activeSubTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('overview')}
        >
          <Radio size={16} /> Surveillance en Temps Réel
        </button>
        <button
          className={`security-subtab-btn ${activeSubTab === 'sso' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('sso')}
        >
          <Key size={16} /> Single Logout (SLO) & Fédération SSO
        </button>
        <button
          className={`security-subtab-btn ${activeSubTab === 'mfa' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('mfa')}
        >
          <Smartphone size={16} /> Sécurité Double Auth (MFA)
        </button>
        <button
          className={`security-subtab-btn ${activeSubTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('audit')}
        >
          <FileText size={16} /> Journal d'Audit & SIEM ({auditLogs.length})
        </button>
      </div>

      {/* --- SOUS-ONGLET 1: SURVEILLANCE EN TEMPS RÉEL (100% DONNÉES RÉELLES) --- */}
      {activeSubTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Barre de statut direct */}
          <div className="realtime-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="realtime-status-badge">
                <span className="pulsing-dot"></span>
                SURVEILLANCE EN DIRECT (POSTGRESQL)
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Dernière synchro : <strong>{lastSyncTime}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="btn-security-outline"
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                style={{ fontSize: '0.8rem' }}
                title="Activer ou suspendre la mise à jour automatique"
              >
                {isAutoRefresh ? 'Pause auto-refresh (8s)' : 'Reprendre auto-refresh'}
              </button>
              <button
                className="btn-security-outline"
                onClick={() => fetchSecurityData(true)}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
                Actualiser maintenant
              </button>
            </div>
          </div>

          {/* 4 Cartes KPI 100% Dynamiques */}
          <div className="security-kpi-grid">
            <div className="security-kpi-card">
              <div className="kpi-content">
                <span className="kpi-title">Sessions HUB Actives</span>
                <span className="kpi-value">{securityStatus.active_sessions || 0}</span>
                <span className="kpi-subtext">Utilisateurs connectés en direct</span>
              </div>
              <div className="kpi-icon-wrap green">
                <Activity size={22} />
              </div>
            </div>

            <div className="security-kpi-card">
              <div className="kpi-content">
                <span className="kpi-title">Sessions SSO Applicatives</span>
                <span className="kpi-value">{securityStatus.active_app_sessions || 0}</span>
                <span className="kpi-subtext">Accès actifs aux applications du HUB</span>
              </div>
              <div className="kpi-icon-wrap blue">
                <ExternalLink size={22} />
              </div>
            </div>

            <div className="security-kpi-card">
              <div className="kpi-content">
                <span className="kpi-title">Adoption MFA</span>
                <span className="kpi-value">
                  {securityStatus.mfa_enrolled_users || 0} / {securityStatus.total_users || 0}
                </span>
                <span className="kpi-subtext">
                  {settings.mfa_enforced ? "Obligatoire sur tout le HUB" : "Mode optionnel"}
                </span>
              </div>
              <div className="kpi-icon-wrap purple">
                <Smartphone size={22} />
              </div>
            </div>

            <div className="security-kpi-card">
              <div className="kpi-content">
                <span className="kpi-title">Applications avec SLO</span>
                <span className="kpi-value">
                  {securityStatus.slo_apps_count || 0} / {securityStatus.total_apps || 0}
                </span>
                <span className="kpi-subtext">Déconnexion Back-Channel active</span>
              </div>
              <div className="kpi-icon-wrap amber">
                <LogOut size={22} />
              </div>
            </div>
          </div>

          {/* Tableau 1 : Sessions HUB Actives en Direct avec bouton de révocation immédiate */}
          <div className="security-card">
            <div className="security-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={18} color="#059669" />
                <span className="security-card-title">
                  Sessions Utilisateurs en Cours sur le HUB ({securityStatus.active_sessions || 0})
                </span>
              </div>
              <span className="status-pill success">TEMPS RÉEL</span>
            </div>

            <div className="audit-table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Département</th>
                    <th>Adresse IP</th>
                    <th>Connexion</th>
                    <th>Dernière Activité</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(!securityStatus.active_sessions_list || securityStatus.active_sessions_list.length === 0) ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        Aucun utilisateur actuellement en ligne sur le HUB.
                      </td>
                    </tr>
                  ) : (
                    securityStatus.active_sessions_list.map((session) => {
                      const user = session.User || {};
                      const initials = `${(user.first_name || 'U')[0]}${(user.last_name || '')[0] || ''}`.toUpperCase();
                      const isRevoking = revokingSessionId === session.id;

                      return (
                        <tr key={session.id}>
                          <td>
                            <div className="user-info-cell">
                              <div className="user-avatar-badge">{initials}</div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                  {user.first_name} {user.last_name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {user.email || user.matricule}
                                  {user.is_admin && (
                                    <span style={{ marginLeft: '6px', fontSize: '0.68rem', background: '#e0e7ff', color: '#3730a3', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{user.department || 'Non renseigné'}</td>
                          <td>
                            <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                              {session.ip_address || '127.0.0.1'}
                            </code>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {session.createdAt ? new Date(session.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Récemment'}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 500 }}>
                            {session.updatedAt ? new Date(session.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'À l\'instant'}
                          </td>
                          <td>
                            <span className="status-pill success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}></span>
                              En Ligne
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-revoke-session"
                              onClick={() => handleRevokeSession(session.id, user.email || user.matricule)}
                              disabled={isRevoking}
                              title="Révoquer cette session immédiatement et diffuser le signal SLO"
                            >
                              <Trash2 size={13} />
                              {isRevoking ? 'Révocation...' : 'Révoquer'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tableau 2 : Sessions Applicatives SSO Ouvertes */}
          <div className="security-card">
            <div className="security-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ExternalLink size={18} color="#0284c7" />
                <span className="security-card-title">
                  Sessions Applicatives SSO Ouvertes ({securityStatus.active_app_sessions || 0})
                </span>
              </div>
              <span className="status-pill success">TEMPS RÉEL</span>
            </div>

            <div className="audit-table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Application Connectée</th>
                    <th>Type d'Accès</th>
                    <th>Endpoint SLO (Révocation)</th>
                    <th>Lancé le</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(!securityStatus.active_app_sessions_list || securityStatus.active_app_sessions_list.length === 0) ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        Aucune application externe ouverte via SSO actuellement.
                      </td>
                    </tr>
                  ) : (
                    securityStatus.active_app_sessions_list.map((appSession) => {
                      const user = appSession.User || {};
                      const app = appSession.Application || {};
                      const isRevokingApp = revokingAppSessionId === appSession.id;

                      return (
                        <tr key={appSession.id}>
                          <td style={{ fontWeight: 600 }}>
                            {user.first_name} {user.last_name} ({user.email || user.matricule})
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#0369a1' }}>{app.name || 'Application'}</span>
                          </td>
                          <td>
                            <span className="audit-badge sso">{app.auth_type || 'SSO'}</span>
                          </td>
                          <td>
                            {app.slo_url ? (
                              <code style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                {app.slo_url}
                              </code>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Non configuré</span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {appSession.created_at ? new Date(appSession.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Récemment'}
                          </td>
                          <td>
                            <span className="status-pill success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }}></span>
                              Active
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-revoke-session"
                              onClick={() => handleRevokeAppSession(appSession.id, app.name, user.email || user.matricule)}
                              disabled={isRevokingApp}
                              title="Révoquer l'accès à cette application et envoyer le signal SLO"
                            >
                              <Trash2 size={13} />
                              {isRevokingApp ? 'Révocation...' : 'Révoquer'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tableau 3 : Aperçu des Derniers Événements SIEM */}
          <div className="security-card">
            <div className="security-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={18} color="#0f172a" />
                <span className="security-card-title">Derniers Événements du Journal de Sécurité (SIEM)</span>
              </div>
              <button className="btn-security-outline" onClick={() => setActiveSubTab('audit')}>
                Voir tous les logs <ArrowRight size={14} />
              </button>
            </div>

            <div className="audit-table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th>Événement</th>
                    <th>Utilisateur</th>
                    <th>IP Source</th>
                    <th>Date</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.slice(0, 5).map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span className={`audit-badge ${log.type === 'SSO' ? 'sso' : log.type === 'AUTH' ? 'auth' : log.type === 'ALERT' ? 'alert' : 'admin'}`}>
                          {log.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.action}</td>
                      <td>{log.user}</td>
                      <td><code>{log.ip}</code></td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('fr-FR') : 'Récemment'}
                      </td>
                      <td>
                        <span className={`status-pill ${log.status?.includes('SUCCÈS') ? 'success' : 'warning'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- SOUS-ONGLET 2: SINGLE LOGOUT (SLO) & FÉDÉRATION SSO --- */}
      {activeSubTab === 'sso' && (
        <div className="security-grid-2">
          {/* Carte Single Logout (SLO) */}
          <div className="security-card" style={{ gridColumn: 'span 2' }}>
            <div className="security-card-header">
              <span className="security-card-title">
                <LogOut size={18} color="#dc2626" /> Déconnexion Globale (Single Logout - SLO) & Révocation Back-Channel
              </span>
              <span className="status-pill success">CONFORME RFC 8693 / RS256</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: '1.5' }}>
              Quand un employé clique sur <strong>"Déconnexion"</strong> dans le HUB, un jeton de révocation standardisé (Logout Token JWT signé en RS256) est diffusé automatiquement en <strong>Back-Channel (Serveur-à-Serveur)</strong> vers les applications connectées pour clôturer instantanément l'ensemble de ses sessions actives.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Protocole Standard</span>
                <span style={{ fontSize: '0.92rem', color: '#1e293b', fontWeight: 700 }}>OIDC Back-Channel Logout</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Sessions HUB Actives</span>
                <span style={{ fontSize: '0.92rem', color: '#059669', fontWeight: 700 }}>{securityStatus.active_sessions || 0} session(s)</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Applications Configurées SLO</span>
                <span style={{ fontSize: '0.92rem', color: '#0284c7', fontWeight: 700 }}>{securityStatus.slo_apps_count || 0} application(s)</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                🛡️ Révocation en cascade : refresh tokens invalidés, cookies HttpOnly purgés, et traçabilité SIEM.
              </div>
              <button
                className="btn-security-action"
                onClick={handleTestSlo}
                disabled={testingSlo}
                style={{ backgroundColor: '#dc2626' }}
              >
                {testingSlo ? <RefreshCw size={14} className="spin-icon" /> : <LogOut size={14} />} Tester l'émission du signal SLO
              </button>
            </div>

            {sloTestResult && (
              <div style={{ marginTop: '16px', padding: '14px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '4px' }}>
                  ✓ Simulation SLO terminée avec succès : {sloTestResult.notified_count} application(s) notifiée(s) sur {sloTestResult.total_targets} ciblée(s)
                </span>
                {sloTestResult.details && sloTestResult.details.length > 0 && (
                  <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: '0.82rem', color: '#15803d', lineHeight: '1.6' }}>
                    {sloTestResult.details.map((d, i) => (
                      <li key={i}>
                        <strong>{d.app_name}</strong> : <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{d.status}</span> {d.slo_url ? `(${d.slo_url})` : '(pas d\'endpoint SLO configuré)'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Paramètres d'Émission des Jetons SSO */}
          <div className="security-card">
            <div className="security-card-header">
              <span className="security-card-title"><Key size={18} color="#059669" /> Paramètres des Jetons SSO</span>
            </div>

            <div className="security-form-group">
              <label>Durée de validité du jeton de lancement SSO : <strong>{settings.sso_token_lifetime} secondes</strong></label>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={settings.sso_token_lifetime}
                onChange={(e) => setSettings({ ...settings, sso_token_lifetime: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
              <small>Recommandation bancaire : Moins de 60 secondes pour neutraliser tout rejeu.</small>
            </div>

            <button className="btn-security-action" onClick={() => handleSaveSettings('Politique SSO')}>
              Enregistrer la politique SSO
            </button>
          </div>

          {/* Fédération OIDC & JWKS */}
          <div className="security-card">
            <div className="security-card-header">
              <span className="security-card-title"><Server size={18} color="#0284c7" /> Fédération OIDC & Clé Publique (JWKS)</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: '1.5' }}>
              Les applications connectées au HUB vérifient la signature des jetons de manière autonome via ce point de terminaison public.
            </p>

            <div className="security-form-group" style={{ marginTop: '15px' }}>
              <label>Endpoint JWKS Public (RFC 7517)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={securityStatus.jwks_url}
                  className="security-input"
                  style={{ backgroundColor: '#f8fafc', fontFamily: 'monospace', fontSize: '0.82rem' }}
                />
                <button className="btn-security-outline" onClick={handleCopyKey}>
                  <Copy size={16} /> {copiedKey ? 'Copié !' : 'Copier'}
                </button>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '15px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Algorithme de Signature :</span>
              <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700 }}>RS256 (RSA Signature with SHA-256 - 2048 bits)</span>
            </div>
          </div>
        </div>
      )}

      {/* --- SOUS-ONGLET 3: SÉCURITÉ DOUBLE AUTH (MFA) --- */}
      {activeSubTab === 'mfa' && (
        <div className="security-grid-2">
          {/* Carte Interrupteur Global */}
          <div className="security-card">
            <div className="security-card-header">
              <span className="security-card-title">
                <Smartphone size={20} color="#059669" /> Politique Globale MFA (Microsoft Authenticator)
              </span>
              <span className={`status-pill ${settings.mfa_enforced ? "success" : "neutral"}`}>
                {settings.mfa_enforced ? "OBLIGATOIRE POUR TOUS" : "DÉSACTIVÉ POUR TOUS"}
              </span>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: '1.5', marginBottom: '20px' }}>
              Cette option permet à l'administrateur d'imposer ou de désactiver la double authentification (2FA TOTP) pour <strong>l'ensemble des utilisateurs du HUB</strong> en un seul clic.
            </p>

            <div style={{
              background: settings.mfa_enforced ? '#f0fdf4' : '#f8fafc',
              border: `2px solid ${settings.mfa_enforced ? '#86efac' : '#e2e8f0'}`,
              borderRadius: '10px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              transition: 'all 0.3s'
            }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>
                  {settings.mfa_enforced ? " Double authentification ACTIVÉE pour tous" : " Double authentification DÉSACTIVÉE pour tous"}
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  {settings.mfa_enforced
                    ? "Tous les agents (comptes locaux et LDAP AD) doivent valider un code à 6 chiffres émis par Microsoft Authenticator."
                    : "Les agents se connectent directement avec leur identifiant et mot de passe habituels sans étape 2FA."}
                </p>
              </div>

              <label style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px', cursor: 'pointer', flexShrink: 0, marginLeft: '16px' }}>
                <input
                  type="checkbox"
                  checked={settings.mfa_enforced}
                  onChange={(e) => setSettings({ ...settings, mfa_enforced: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: settings.mfa_enforced ? '#059669' : '#cbd5e1',
                  transition: '0.3s',
                  borderRadius: '30px'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '22px',
                    width: '22px',
                    left: settings.mfa_enforced ? '28px' : '4px',
                    bottom: '4px',
                    backgroundColor: 'white',
                    transition: '0.3s',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>

            <button
              className="btn-security-action"
              onClick={() => handleSaveSettings('Politique MFA')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Appliquer la politique MFA sur tout le HUB
            </button>
          </div>

          {/* Carte Taux d'Adoption & Fonctionnement */}
          <div className="security-card">
            <div className="security-card-header">
              <span className="security-card-title">
                <Users size={20} color="#0284c7" /> Enrôlement des Utilisateurs
              </span>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Agents ayant configuré le MFA :</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
                  {securityStatus.mfa_enrolled_users || 0} / {securityStatus.total_users || 0} agents
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${securityStatus.total_users > 0 ? ((securityStatus.mfa_enrolled_users || 0) / securityStatus.total_users) * 100 : 0}%`,
                  height: '100%',
                  background: '#059669',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ background: '#e0f2fe', color: '#0369a1', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <h5 style={{ margin: '0 0 2px 0', color: '#1e293b' }}>Application Mobile Compatible</h5>
                  <p style={{ margin: 0, color: '#64748b' }}>L'employé installe <strong>Microsoft Authenticator</strong> (ou Google Authenticator) sur son smartphone professionnel ou personnel.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ background: '#e0f2fe', color: '#0369a1', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <h5 style={{ margin: '0 0 2px 0', color: '#1e293b' }}>Enrôlement Automatique</h5>
                  <p style={{ margin: 0, color: '#64748b' }}>À sa première connexion, le HUB affiche un QR Code unique chiffré en AES-256. L'agent le scanne une seule fois.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ background: '#e0f2fe', color: '#0369a1', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <h5 style={{ margin: '0 0 2px 0', color: '#1e293b' }}>Code Temporaire TOTP (RFC 6238)</h5>
                  <p style={{ margin: 0, color: '#64748b' }}>À chaque connexion future, un code à 6 chiffres renouvelé toutes les 30 secondes est demandé pour déverrouiller le HUB.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SOUS-ONGLET 4: BCRG_SIEM & THREAT DETECTION --- */}
      {activeSubTab === 'audit' && (() => {
        // Calculs analytiques BCRG_SIEM
        const totalLogs = auditLogs.length;
        const criticalCount = auditLogs.filter(l => getBcrgSiemEventLevel(l) >= 12).length;
        const highCount = auditLogs.filter(l => {
          const lvl = getBcrgSiemEventLevel(l);
          return lvl >= 8 && lvl < 12;
        }).length;
        const medCount = auditLogs.filter(l => {
          const lvl = getBcrgSiemEventLevel(l);
          return lvl >= 5 && lvl < 8;
        }).length;
        const lowCount = auditLogs.filter(l => getBcrgSiemEventLevel(l) < 5).length;

        const uniqueIps = Array.from(new Set(auditLogs.map(l => l.ip).filter(Boolean)));
        const uniqueUsers = Array.from(new Set(auditLogs.map(l => l.user).filter(Boolean)));
        const successCount = auditLogs.filter(l => (l.status || '').includes('SUCCÈS')).length;
        const successRate = totalLogs > 0 ? Math.round((successCount / totalLogs) * 100) : 100;

        // Top Applications
        const appCounts = {};
        auditLogs.forEach(l => {
          const app = l.app || 'BCRG HUB';
          appCounts[app] = (appCounts[app] || 0) + 1;
        });
        const topApps = Object.entries(appCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

        // Top MITRE ATT&CK
        const mitreCounts = {};
        auditLogs.forEach(l => {
          const tag = getBcrgSiemMitreTag(l);
          const key = `${tag.id}|${tag.name}|${tag.tactic}`;
          mitreCounts[key] = (mitreCounts[key] || 0) + 1;
        });
        const topMitre = Object.entries(mitreCounts).map(([key, count]) => {
          const [id, name, tactic] = key.split('|');
          return { id, name, tactic, count };
        }).sort((a, b) => b.count - a.count).slice(0, 4);

        // Filtrage des événements
        const filteredLogs = auditLogs.filter(log => {
          const lvl = getBcrgSiemEventLevel(log);
          const mitre = getBcrgSiemMitreTag(log);

          // Filtre catégorie
          if (siemFilterCategory === 'CRITICAL' && lvl < 12) return false;
          if (siemFilterCategory === 'HIGH' && (lvl < 8 || lvl >= 12)) return false;
          if (siemFilterCategory === 'AUTH' && log.type !== 'AUTH') return false;
          if (siemFilterCategory === 'SSO' && log.type !== 'SSO' && log.type !== 'SLO') return false;
          if (siemFilterCategory === 'FAIL' && !log.status?.includes('ÉCHEC') && log.type !== 'ALERT') return false;

          // Filtre texte
          if (siemSearchTerm.trim()) {
            const s = siemSearchTerm.toLowerCase();
            const matchUser = (log.user || '').toLowerCase().includes(s);
            const matchIp = (log.ip || '').toLowerCase().includes(s);
            const matchAction = (log.action || '').toLowerCase().includes(s);
            const matchApp = (log.app || '').toLowerCase().includes(s);
            const matchMitre = mitre.id.toLowerCase().includes(s) || mitre.name.toLowerCase().includes(s);
            const matchLvl = `lvl ${lvl}`.includes(s) || `level ${lvl}`.includes(s);
            if (!matchUser && !matchIp && !matchAction && !matchApp && !matchMitre && !matchLvl) {
              return false;
            }
          }

          return true;
        });

        return (
          <div className="bcrg-siem-soc-container">
            {/* 1. Header BCRG_SIEM SOC */}
            <div className="bcrg-siem-header-card">
              <div className="bcrg-siem-title-box">
                <ShieldAlert size={26} color="#0284c7" />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      Console SIEM & Threat Intelligence
                    </h3>
                    <span className="bcrg-siem-badge-live">
                      <span className="pulsing-dot" style={{ width: '7px', height: '7px' }}></span> EN DIRECT
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Surveillance temps réel des identités, règles de conformité BCRG et corrélation des événements MITRE ATT&CK.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn-security-outline" onClick={() => fetchSecurityData(true)}>
                  <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Actualiser
                </button>
                <button className="btn-security-outline" onClick={handleExportCSV}>
                  <Download size={14} /> Exporter (CSV / SIEM)
                </button>
                <button
                  className="btn-security-outline"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={handleClearAuditLogs}
                  title="Purger l'intégralité du journal de sécurité"
                >
                  <Trash2 size={14} /> Purger
                </button>
              </div>
            </div>

            {/* 2. BCRG_SIEM SOC KPI Tiles (4 Cards - Styled like img 2) */}
            <div className="bcrg-siem-kpi-grid">
              <div className="bcrg-siem-kpi-tile">
                <div className="bcrg-siem-kpi-header">
                  <span className="bcrg-siem-kpi-label">Événements Totaux</span>
                  <div className="bcrg-siem-kpi-icon blue">
                    <Activity size={18} />
                  </div>
                </div>
                <div className="bcrg-siem-kpi-num">{totalLogs}</div>
                <span className="bcrg-siem-kpi-badge blue">Journal d'audit BCRG</span>
              </div>

              <div className="bcrg-siem-kpi-tile">
                <div className="bcrg-siem-kpi-header">
                  <span className="bcrg-siem-kpi-label">Alertes Critiques (Level 10+)</span>
                  <div className="bcrg-siem-kpi-icon red">
                    <Flame size={18} />
                  </div>
                </div>
                <div className="bcrg-siem-kpi-num" style={{ color: criticalCount > 0 ? '#dc2626' : '#0f172a' }}>
                  {criticalCount}
                </div>
                <span className={`bcrg-siem-kpi-badge ${criticalCount > 0 ? 'red' : 'green'}`}>
                  {criticalCount > 0 ? 'Intervention requise' : 'Aucune menace active'}
                </span>
              </div>

              <div className="bcrg-siem-kpi-tile">
                <div className="bcrg-siem-kpi-header">
                  <span className="bcrg-siem-kpi-label">Agents & Sources Actives</span>
                  <div className="bcrg-siem-kpi-icon purple">
                    <Cpu size={18} />
                  </div>
                </div>
                <div className="bcrg-siem-kpi-num">{uniqueIps.length}</div>
                <span className="bcrg-siem-kpi-badge purple">{uniqueUsers.length} comptes distincts</span>
              </div>

              <div className="bcrg-siem-kpi-tile">
                <div className="bcrg-siem-kpi-header">
                  <span className="bcrg-siem-kpi-label">Taux d'Accès Valides</span>
                  <div className="bcrg-siem-kpi-icon green">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div className="bcrg-siem-kpi-num">{successRate}%</div>
                <span className="bcrg-siem-kpi-badge green">{successCount} accès réussis</span>
              </div>
            </div>

            {/* 3. BCRG_SIEM Visualizations Analytics Grid (3 columns) */}
            <div className="bcrg-siem-visuals-grid">
              {/* Widget 1: Distribution Sévérité BCRG_SIEM */}
              <div className="bcrg-siem-vis-card">
                <div className="bcrg-siem-vis-header">
                  <span className="bcrg-siem-vis-title">
                    <Crosshair size={16} color="#0284c7" /> Sévérité BCRG_SIEM (Levels 1 - 15)
                  </span>
                  <span className="bcrg-siem-vis-badge">Règles actives</span>
                </div>
                <div className="bcrg-siem-level-bars">
                  <div className="bcrg-siem-bar-row">
                    <div className="bcrg-siem-bar-meta">
                      <span style={{ fontWeight: 600, color: '#dc2626' }}>Level 12-15 (Critique)</span>
                      <span>{criticalCount} ({totalLogs > 0 ? Math.round((criticalCount / totalLogs) * 100) : 0}%)</span>
                    </div>
                    <div className="bcrg-siem-bar-track">
                      <div className="bcrg-siem-bar-fill crit" style={{ width: `${totalLogs > 0 ? (criticalCount / totalLogs) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div className="bcrg-siem-bar-row">
                    <div className="bcrg-siem-bar-meta">
                      <span style={{ fontWeight: 600, color: '#c2410c' }}>Level 8-11 (Élevé)</span>
                      <span>{highCount} ({totalLogs > 0 ? Math.round((highCount / totalLogs) * 100) : 0}%)</span>
                    </div>
                    <div className="bcrg-siem-bar-track">
                      <div className="bcrg-siem-bar-fill high" style={{ width: `${totalLogs > 0 ? (highCount / totalLogs) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div className="bcrg-siem-bar-row">
                    <div className="bcrg-siem-bar-meta">
                      <span style={{ fontWeight: 600, color: '#b45309' }}>Level 5-7 (Moyen / SSO)</span>
                      <span>{medCount} ({totalLogs > 0 ? Math.round((medCount / totalLogs) * 100) : 0}%)</span>
                    </div>
                    <div className="bcrg-siem-bar-track">
                      <div className="bcrg-siem-bar-fill med" style={{ width: `${totalLogs > 0 ? (medCount / totalLogs) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div className="bcrg-siem-bar-row">
                    <div className="bcrg-siem-bar-meta">
                      <span style={{ fontWeight: 600, color: '#15803d' }}>Level 1-4 (Information)</span>
                      <span>{lowCount} ({totalLogs > 0 ? Math.round((lowCount / totalLogs) * 100) : 0}%)</span>
                    </div>
                    <div className="bcrg-siem-bar-track">
                      <div className="bcrg-siem-bar-fill low" style={{ width: `${totalLogs > 0 ? (lowCount / totalLogs) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Widget 2: Top Applications Cibles */}
              <div className="bcrg-siem-vis-card">
                <div className="bcrg-siem-vis-header">
                  <span className="bcrg-siem-vis-title">
                    <Globe size={16} color="#0284c7" /> Cibles & Applications
                  </span>
                  <span className="bcrg-siem-vis-badge">Top Endpoints</span>
                </div>
                <div className="bcrg-siem-level-bars">
                  {topApps.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '10px 0' }}>Aucune cible enregistrée</div>
                  ) : (
                    topApps.map(([app, count]) => (
                      <div key={app} className="bcrg-siem-bar-row">
                        <div className="bcrg-siem-bar-meta">
                          <span style={{ fontWeight: 600, color: '#334155' }}>{app}</span>
                          <span>{count} req</span>
                        </div>
                        <div className="bcrg-siem-bar-track">
                          <div className="bcrg-siem-bar-fill blue" style={{ width: `${totalLogs > 0 ? (count / totalLogs) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Widget 3: MITRE ATT&CK Matrix */}
              <div className="bcrg-siem-vis-card">
                <div className="bcrg-siem-vis-header">
                  <span className="bcrg-siem-vis-title">
                    <Layers size={16} color="#0284c7" /> Matrice MITRE ATT&CK
                  </span>
                  <span className="bcrg-siem-vis-badge">Framework SOC</span>
                </div>
                <div className="bcrg-siem-mitre-list">
                  {topMitre.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '10px 0' }}>Aucune détection MITRE</div>
                  ) : (
                    topMitre.map((item) => (
                      <div key={item.id} className="bcrg-siem-mitre-item">
                        <div className="bcrg-siem-mitre-tech">
                          <span className="bcrg-siem-mitre-id">{item.id}</span>
                          <span>{item.name}</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          {item.count} occ.
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 4. BCRG_SIEM Search & Filter Toolbar */}
            <div className="bcrg-siem-search-toolbar">
              <div className="bcrg-siem-query-input-wrap">
                <Search size={16} className="bcrg-siem-query-icon" />
                <input
                  type="text"
                  className="bcrg-siem-query-input"
                  placeholder="Recherche KQL BCRG_SIEM (ex: IP, utilisateur, application, 'lvl 12', T1110, mot clé...)"
                  value={siemSearchTerm}
                  onChange={(e) => setSiemSearchTerm(e.target.value)}
                />
                {siemSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setSiemSearchTerm('')}
                    style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="bcrg-siem-filter-chips">
                <button
                  type="button"
                  className={`bcrg-siem-filter-chip ${siemFilterCategory === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSiemFilterCategory('ALL')}
                >
                  Tous ({totalLogs})
                </button>
                <button
                  type="button"
                  className={`bcrg-siem-filter-chip ${siemFilterCategory === 'CRITICAL' ? 'active-crit' : ''}`}
                  onClick={() => setSiemFilterCategory('CRITICAL')}
                >
                  <Flame size={12} color={siemFilterCategory === 'CRITICAL' ? '#fff' : '#ef4444'} />
                  Critiques Level 12+ ({criticalCount})
                </button>
                <button
                  type="button"
                  className={`bcrg-siem-filter-chip ${siemFilterCategory === 'HIGH' ? 'active' : ''}`}
                  onClick={() => setSiemFilterCategory('HIGH')}
                >
                  Élevés Level 8+ ({highCount})
                </button>
                <button
                  type="button"
                  className={`bcrg-siem-filter-chip ${siemFilterCategory === 'AUTH' ? 'active' : ''}`}
                  onClick={() => setSiemFilterCategory('AUTH')}
                >
                  Authentifications ({auditLogs.filter(l => l.type === 'AUTH').length})
                </button>
                <button
                  type="button"
                  className={`bcrg-siem-filter-chip ${siemFilterCategory === 'SSO' ? 'active' : ''}`}
                  onClick={() => setSiemFilterCategory('SSO')}
                >
                  SSO & SLO ({auditLogs.filter(l => l.type === 'SSO' || l.type === 'SLO').length})
                </button>
                <button
                  type="button"
                  className={`bcrg-siem-filter-chip ${siemFilterCategory === 'FAIL' ? 'active' : ''}`}
                  onClick={() => setSiemFilterCategory('FAIL')}
                >
                  <AlertTriangle size={12} /> Échecs / Alertes ({auditLogs.filter(l => l.status?.includes('ÉCHEC') || l.type === 'ALERT').length})
                </button>
              </div>
            </div>

            {/* 5. BCRG_SIEM Discover Events Explorer Table */}
            <div className="bcrg-siem-table-card">
              <div className="bcrg-siem-table-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={16} color="#0284c7" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                    Explorateur d'Événements (BCRG_SIEM Discover)
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    — Affichage de <strong>{filteredLogs.length}</strong> événement(s)
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Cliquez sur une ligne pour inspecter le document JSON
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="bcrg-siem-events-table">
                  <thead>
                    <tr>
                      <th style={{ width: '32px' }}></th>
                      <th>Sévérité</th>
                      <th>Date & Heure</th>
                      <th>Règle & Action</th>
                      <th>Acteur / Compte</th>
                      <th>IP Source</th>
                      <th>Application Cible</th>
                      <th>MITRE ATT&CK</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          <ShieldCheck size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
                          <div>Aucun événement ne correspond à ce filtre ou recherche.</div>
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => {
                        const level = getBcrgSiemEventLevel(log);
                        const mitre = getBcrgSiemMitreTag(log);
                        const isExpanded = expandedLogId === log.id;
                        const lvlClass = getLevelBadgeClass(level);

                        const bcrgSiemDocJson = {
                          "_id": `bcrg-log-${log.id}`,
                          "@timestamp": log.createdAt || new Date().toISOString(),
                          "agent": {
                            "id": "001",
                            "name": "bcrg-hub-auth-server",
                            "ip": "127.0.0.1"
                          },
                          "manager": {
                            "name": "bcrg-siem-master"
                          },
                          "rule": {
                            "id": 100000 + Number(log.id),
                            "level": level,
                            "description": log.action,
                            "groups": [log.type || 'authentication', "pci_dss_10.2.4", "pci_dss_10.2.5"],
                            "mitre": {
                              "id": [mitre.id],
                              "tactic": [mitre.tactic],
                              "technique": [mitre.name]
                            }
                          },
                          "data": {
                            "user": log.user,
                            "srcip": log.ip,
                            "target_application": log.app,
                            "outcome": log.status,
                            "auth_type": log.type
                          }
                        };

                        return (
                          <React.Fragment key={log.id}>
                            <tr
                              className={`bcrg-siem-row-clickable ${isExpanded ? 'bcrg-siem-row-expanded' : ''}`}
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            >
                              <td>
                                {isExpanded ? (
                                  <ChevronDown size={15} color="#0284c7" />
                                ) : (
                                  <ChevronRight size={15} color="#94a3b8" />
                                )}
                              </td>
                              <td>
                                <span className={`bcrg-siem-lvl-badge ${lvlClass}`}>
                                  LVL {level}
                                </span>
                              </td>
                              <td style={{ whiteSpace: 'nowrap', color: '#475569', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                {log.createdAt ? new Date(log.createdAt).toLocaleString('fr-FR', {
                                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                }) : 'Récemment'}
                              </td>
                              <td>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{log.action}</span>
                              </td>
                              <td>
                                <span style={{ fontWeight: 500 }}>{log.user}</span>
                              </td>
                              <td>
                                <code style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a' }}>
                                  {log.ip}
                                </code>
                              </td>
                              <td>
                                <span style={{ color: '#0284c7', fontWeight: 600 }}>{log.app}</span>
                              </td>
                              <td>
                                <span className="bcrg-siem-mitre-pill" title={`${mitre.name} (${mitre.tactic})`}>
                                  {mitre.id}
                                </span>
                              </td>
                              <td>
                                <span className={`status-pill ${log.status?.includes('SUCCÈS') ? 'success' : 'warning'}`}>
                                  {log.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="btn-revoke-session"
                                  onClick={() => handleDeleteAuditLog(log.id)}
                                  title="Supprimer cet événement d'audit"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>

                            {/* Ligne Dépliée : Inspecteur de Document BCRG_SIEM */}
                            {isExpanded && (
                              <tr className="bcrg-siem-inspector-row">
                                <td colSpan={10}>
                                  <div className="bcrg-siem-inspector-box">
                                    <div className="bcrg-siem-inspector-topbar">
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                                          Document SIEM : <code>bcrg-log-{log.id}</code>
                                        </span>
                                        <span className={`bcrg-siem-lvl-badge ${lvlClass}`}>Règle BCRG_SIEM #{100000 + Number(log.id)}</span>
                                      </div>

                                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <div className="bcrg-siem-inspector-tabs">
                                          <button
                                            type="button"
                                            className={`bcrg-siem-inspect-tab-btn ${inspectorView === 'table' ? 'active' : ''}`}
                                            onClick={() => setInspectorView('table')}
                                          >
                                            Vue Document
                                          </button>
                                          <button
                                            type="button"
                                            className={`bcrg-siem-inspect-tab-btn ${inspectorView === 'json' ? 'active' : ''}`}
                                            onClick={() => setInspectorView('json')}
                                          >
                                            <Terminal size={13} /> JSON Brut
                                          </button>
                                        </div>

                                        <button
                                          type="button"
                                          className="btn-security-outline"
                                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                          onClick={() => {
                                            navigator.clipboard.writeText(JSON.stringify(bcrgSiemDocJson, null, 2));
                                            setMessage("✓ JSON copié dans le presse-papier");
                                            setTimeout(() => setMessage(''), 2500);
                                          }}
                                        >
                                          <Copy size={12} /> Copier JSON
                                        </button>
                                      </div>
                                    </div>

                                    {inspectorView === 'table' ? (
                                      <div className="bcrg-siem-doc-grid">
                                        <div className="bcrg-siem-field-row">
                                          <span className="bcrg-siem-field-key">@timestamp</span>
                                          <span className="bcrg-siem-field-val"><code>{bcrgSiemDocJson['@timestamp']}</code></span>
                                        </div>
                                        <div className="bcrg-siem-field-row">
                                          <span className="bcrg-siem-field-key">rule.description</span>
                                          <span className="bcrg-siem-field-val" style={{ fontWeight: 600 }}>{log.action}</span>
                                        </div>
                                        <div className="bcrg-siem-field-row">
                                          <span className="bcrg-siem-field-key">data.user</span>
                                          <span className="bcrg-siem-field-val"><strong>{log.user}</strong></span>
                                        </div>
                                        <div className="bcrg-siem-field-row">
                                          <span className="bcrg-siem-field-key">data.srcip</span>
                                          <span className="bcrg-siem-field-val"><code>{log.ip}</code></span>
                                        </div>
                                        <div className="bcrg-siem-field-row">
                                          <span className="bcrg-siem-field-key">data.application</span>
                                          <span className="bcrg-siem-field-val">{log.app}</span>
                                        </div>
                                        <div className="bcrg-siem-field-row">
                                          <span className="bcrg-siem-field-key">data.outcome</span>
                                          <span className="bcrg-siem-field-val">
                                            <span className={`status-pill ${log.status?.includes('SUCCÈS') ? 'success' : 'warning'}`}>
                                              {log.status}
                                            </span>
                                          </span>
                                        </div>
                                        <div className="bcrg-siem-field-row">
                                          <span className="bcrg-siem-field-key">mitre.tactic</span>
                                          <span className="bcrg-siem-field-val">{mitre.tactic}</span>
                                        </div>
                                        <div className="bcrg-siem-field-row">
                                          <span className="bcrg-siem-field-key">mitre.technique</span>
                                          <span className="bcrg-siem-field-val"><code>{mitre.id}</code> — {mitre.name}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <pre className="bcrg-siem-json-block">
                                        {JSON.stringify(bcrgSiemDocJson, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pop-up de confirmation in-app (remplace window.confirm) */}
      {confirmModal && (
        <div
          onClick={() => setConfirmModal(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.70)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '24px 28px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: confirmModal.isDanger ? '#fee2e2' : '#fef3c7',
                color: confirmModal.isDanger ? '#dc2626' : '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {confirmModal.title}
                </h3>
                <p style={{ margin: '8px 0 0 0', color: '#334155', fontSize: '0.92rem', lineHeight: '1.4' }}>
                  {confirmModal.message}
                </p>
                {confirmModal.subtext && (
                  <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '0.8rem', lineHeight: '1.4', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    {confirmModal.subtext}
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmModal(null);
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  confirmModal.onConfirm();
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: confirmModal.isDanger ? '#dc2626' : 'var(--bcrg-green, #166534)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {confirmModal.confirmText || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityPanel;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  Users,
  AppWindow,
  ShieldCheck,
  BarChart3,
  Upload,
  Plus,
  Key,
  AlertTriangle,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  CheckCircle2,
  Lock,
  ExternalLink,
  UserCheck,
  Edit,
  Trash2,
  Database,
  UserX,
  FolderTree,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Server,
  Box,
  Check,
  RefreshCw
} from 'lucide-react';
import './AdminPanel.css';
import LdapConfigPanel from './LdapConfigPanel';
import SecurityPanel from './SecurityPanel';

const AppLogo = ({ app, size = 24 }) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const getSources = () => {
    const sources = [];
    if (app && app.icon_url) sources.push(app.icon_url);
    if (app && app.url) {
      try {
        const urlObj = new URL(app.url);
        // DuckDuckGo is generally very reliable for favicons
        sources.push(`https://icons.duckduckgo.com/ip3/${urlObj.hostname}.ico`);
        // Google fallback
        sources.push(`https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`);
        // Direct root checks for PWA/standard icons
        sources.push(`${urlObj.origin}/favicon.ico`);
        sources.push(`${urlObj.origin}/logo192.png`);
        sources.push(`${urlObj.origin}/apple-touch-icon.png`);
      } catch (e) {
        // ignore invalid URL
      }
    }
    return sources;
  };

  const sources = getSources();

  if (srcIndex >= sources.length || sources.length === 0) {
    return <AppWindow size={size} />;
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={app ? app.name : 'App'}
      onError={() => setSrcIndex(prev => prev + 1)}
      style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', borderRadius: '6px' }}
    />
  );
};

const AdminPanel = ({ activeTab: propActiveTab, setActiveTab: propSetActiveTab, hideTabsHeader = false }) => {
  const [internalActiveTab, setInternalActiveTab] = useState('stats');
  const activeTab = propActiveTab || internalActiveTab;
  const setActiveTab = propSetActiveTab || setInternalActiveTab;

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // UI States for in-app popups
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const requestConfirm = (message, onConfirm) => {
    setConfirmDialog({ message, onConfirm });
  };

  const [stats, setStats] = useState({ users: 0, applications: 0, roles: 0 });
  const [usersList, setUsersList] = useState([]);
  const [apps, setApps] = useState([]);
  const [roles, setRoles] = useState([]);

  const [showAppModal, setShowAppModal] = useState(false);
  const [editingAppId, setEditingAppId] = useState(null);
  const [newApp, setNewApp] = useState({ name: '', url: '', description: '', auth_type: 'SSO', status: 'Actif', icon_url: '', slo_url: '' });

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  const [showRoleMembersModal, setShowRoleMembersModal] = useState(false);
  const [selectedRoleForMembers, setSelectedRoleForMembers] = useState(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', matricule: '', department: '', role_id: '', is_admin: false });

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ targetType: 'role', user_id: '', role_id: '', ldap_identifier: '', ldap_name: '', app_id: '' });
  const [assignGroupSearch, setAssignGroupSearch] = useState('');
  const [isAssignGroupDropdownOpen, setIsAssignGroupDropdownOpen] = useState(false);
  const [assignResult, setAssignResult] = useState(null);

  const [showAssignRoleModal, setShowAssignRoleModal] = useState(false);
  const [assignRoleForm, setAssignRoleForm] = useState({ ldap_type: 'USER', ldap_identifier: '', role_id: '', ldap_name: '' });
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isLdapDropdownOpen, setIsLdapDropdownOpen] = useState(false);

  const [ldapUsers, setLdapUsers] = useState([]);
  const [ldapGroups, setLdapGroups] = useState([]);
  const [ldapOUs, setLdapOUs] = useState([]);
  const [loadingLdap, setLoadingLdap] = useState(false);
  const [ldapError, setLdapError] = useState(null);
  const [assignRoleResult, setAssignRoleResult] = useState(null);

  // Arborescence Active Directory (OUs & Sous-groupes)
  const [adTreePickerMode, setAdTreePickerMode] = useState('tree'); // 'tree' | 'search'
  const [adTreeSearchQuery, setAdTreeSearchQuery] = useState('');
  const [adExpandedNodes, setAdExpandedNodes] = useState(new Set(['ROOT']));

  const [activeActionMenu, setActiveActionMenu] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-menu-wrapper')) {
        setActiveActionMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getConfig = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };
  const config = getConfig();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/admin/stats`, getConfig());
      setStats(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/admin/users`, getConfig());
      setUsersList(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchApps = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/admin/applications`, getConfig());
      setApps(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/admin/roles`, getConfig());
      setRoles(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
      fetchApps();
    }
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'apps') fetchApps();
    if (activeTab === 'roles') fetchRoles();
  }, [activeTab]);

  const handleCreateApp = async (e) => {
    e.preventDefault();
    try {
      if (editingAppId) {
        await axios.put(`${API_URL}/api/admin/applications/${editingAppId}`, newApp, getConfig());
      } else {
        await axios.post(`${API_URL}/api/admin/applications`, newApp, getConfig());
      }
      setShowAppModal(false); setEditingAppId(null); showToast("Application sauvegardée avec succès");
      setNewApp({ name: '', url: '', description: '', auth_type: 'SSO', status: 'Actif', icon_url: '', slo_url: '' });
      fetchApps(); fetchStats();
    } catch (err) { showToast("Erreur lors de la sauvegarde de l'application", "error"); }
  };


  const handleAssignApp = async (e) => {
    e.preventDefault();
    try {
      if (assignForm.targetType === 'user') {
        const { data } = await axios.post(`${API_URL}/api/admin/users/assign-app`, {
          user_id: assignForm.user_id,
          app_id: assignForm.app_id
        }, getConfig());
        setAssignResult(data.message);
      } else if (assignForm.targetType === 'group') {
        if (!assignForm.ldap_identifier) {
          showToast("Veuillez sélectionner un groupe Active Directory", "error");
          return;
        }
        const { data } = await axios.post(`${API_URL}/api/admin/groups/assign-app`, {
          ldap_identifier: assignForm.ldap_identifier,
          ldap_name: assignForm.ldap_name,
          app_id: assignForm.app_id
        }, getConfig());
        setAssignResult(data.message);
      } else {
        const { data } = await axios.post(`${API_URL}/api/admin/roles/assign-app`, {
          role_id: assignForm.role_id,
          app_id: assignForm.app_id
        }, getConfig());
        setAssignResult(data.message);
      }
      setTimeout(() => {
        setShowAssignModal(false);
        setAssignResult(null);
        setAssignForm({ targetType: 'role', user_id: '', role_id: '', ldap_identifier: '', ldap_name: '', app_id: '' });
        setAssignGroupSearch('');
        fetchApps();
        fetchRoles();
      }, 1500);
    } catch (err) {
      showToast(err.response?.data?.message || "Erreur lors de l'assignation de l'application", "error");
    }
  };

  const parseDnHierarchy = (dn, isContainerOnly = false) => {
    if (!dn) return [];
    const parts = dn.split(/(?<!\\),/).map(p => p.trim());
    if (parts.length === 0) return [];

    const firstDcIndex = parts.findIndex(p => p.toUpperCase().startsWith('DC='));
    const maxContainerIndex = firstDcIndex !== -1 ? firstDcIndex : parts.length;
    const startIndex = isContainerOnly ? 0 : 1;

    if (startIndex >= maxContainerIndex) return [];

    const segments = [];
    for (let i = maxContainerIndex - 1; i >= startIndex; i--) {
      const part = parts[i];
      const isOu = part.toUpperCase().startsWith('OU=');
      const isCn = part.toUpperCase().startsWith('CN=');
      if (isOu || isCn) {
        const type = isOu ? 'OU' : 'CONTAINER';
        const name = part.substring(3);
        const fullDn = parts.slice(i).join(',');
        segments.push({
          raw: part,
          name,
          type,
          dn: fullDn
        });
      }
    }
    return segments;
  };

  const getOuPath = (dn) => {
    if (!dn) return 'Racine du domaine';
    const segments = parseDnHierarchy(dn, false);
    if (segments.length === 0) return 'Racine du domaine';
    return segments.map(s => s.name).join(' › ');
  };

  const buildEntityTree = (items = [], ous = []) => {
    let domainName = 'BCRG.LOCAL';
    const sampleDn = (items[0]?.dn || ous[0]?.dn || '');
    const dcMatches = sampleDn.match(/DC=([^,]+)/gi);
    if (dcMatches && dcMatches.length > 0) {
      domainName = dcMatches.map(m => m.replace(/DC=/i, '')).join('.').toUpperCase();
    }

    const rootNode = {
      id: 'ROOT',
      name: domainName,
      type: 'DOMAIN',
      dn: null,
      children: {},
      items: []
    };

    // 1. OUs connues
    ous.forEach(ou => {
      if (!ou.dn) return;
      const hierarchy = parseDnHierarchy(ou.dn, true);
      let current = rootNode;
      hierarchy.forEach(seg => {
        if (!current.children[seg.name]) {
          current.children[seg.name] = {
            id: seg.dn,
            name: seg.name,
            type: seg.type,
            dn: seg.dn,
            children: {},
            items: []
          };
        }
        current = current.children[seg.name];
      });
    });

    // 2. Éléments (groupes ou utilisateurs)
    items.forEach(item => {
      if (!item.dn) {
        rootNode.items.push(item);
        return;
      }
      const hierarchy = parseDnHierarchy(item.dn, false);
      let current = rootNode;
      hierarchy.forEach(seg => {
        if (!current.children[seg.name]) {
          current.children[seg.name] = {
            id: seg.dn,
            name: seg.name,
            type: seg.type,
            dn: seg.dn,
            children: {},
            items: []
          };
        }
        current = current.children[seg.name];
      });
      current.items.push(item);
    });

    return rootNode;
  };

  const countItemsInNode = (node) => {
    let count = (node.items || []).length;
    Object.values(node.children || {}).forEach(child => {
      count += countItemsInNode(child);
    });
    return count;
  };

  const toggleAdTreeNode = (nodeId) => {
    setAdExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAllAdTreeNodes = (rootNode) => {
    const ids = new Set(['ROOT']);
    const collect = (n) => {
      ids.add(n.id);
      Object.values(n.children || {}).forEach(collect);
    };
    collect(rootNode);
    setAdExpandedNodes(ids);
  };

  const collapseAllAdTreeNodes = () => {
    setAdExpandedNodes(new Set(['ROOT']));
  };

  const renderAdTreeNode = (node, level = 0, selectedId, onSelect, entityType = 'GROUP') => {
    const childrenKeys = Object.keys(node.children || {});
    const hasChildren = childrenKeys.length > 0;
    const hasItems = (node.items || []).length > 0;
    const isExpanded = adExpandedNodes.has(node.id);
    const totalCount = countItemsInNode(node);

    // Filtrage recherche
    const q = adTreeSearchQuery.trim().toLowerCase();
    if (q) {
      const matchNode = node.name.toLowerCase().includes(q);
      const matchAnyItem = (node.items || []).some(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.identifier || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
      const matchChildren = (n) => {
        if (n.name.toLowerCase().includes(q)) return true;
        if ((n.items || []).some(i => (i.name || '').toLowerCase().includes(q) || (i.identifier || '').toLowerCase().includes(q))) return true;
        return Object.values(n.children || {}).some(matchChildren);
      };

      if (!matchNode && !matchAnyItem && !matchChildren(node)) {
        return null;
      }
    }

    return (
      <div key={node.id || node.name} style={{ marginLeft: level > 0 ? '12px' : '0' }}>
        {/* Ligne Dossier / OU */}
        <div
          className="ad-tree-node-row"
          onClick={() => toggleAdTreeNode(node.id)}
          title={node.dn || node.name}
        >
          {(hasChildren || hasItems) ? (
            <span
              className="ad-tree-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleAdTreeNode(node.id);
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span style={{ width: 18, height: 18, display: 'inline-block' }} />
          )}

          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {node.type === 'DOMAIN' ? (
              <Server size={15} color="#0284c7" />
            ) : node.type === 'CONTAINER' ? (
              <Box size={15} color="#8b5cf6" />
            ) : isExpanded ? (
              <FolderOpen size={15} color="#f59e0b" />
            ) : (
              <Folder size={15} color="#f59e0b" />
            )}
          </span>

          <span style={{ fontWeight: 600, color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>

          {totalCount > 0 && (
            <span className="ad-tree-badge-count">{totalCount}</span>
          )}
        </div>

        {/* Contenu déplié (Sous-dossiers & Groupes / Utilisateurs) */}
        {isExpanded && (
          <div style={{ borderLeft: '1px dashed #cbd5e1', marginLeft: '9px', paddingLeft: '8px' }}>
            {/* 1. Sous-dossiers */}
            {childrenKeys
              .sort((a, b) => a.localeCompare(b))
              .map(childKey => renderAdTreeNode(node.children[childKey], level + 1, selectedId, onSelect, entityType))}

            {/* 2. Groupes ou Utilisateurs directement dans ce dossier */}
            {(node.items || [])
              .filter(item => {
                if (!q) return true;
                return (
                  (item.name || '').toLowerCase().includes(q) ||
                  (item.identifier || '').toLowerCase().includes(q) ||
                  (item.description || '').toLowerCase().includes(q)
                );
              })
              .map(item => {
                const isSelected = selectedId === item.identifier;
                return (
                  <div
                    key={item.identifier}
                    className={`ad-tree-item-row ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item);
                    }}
                    title={item.dn || item.name}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <span style={{ color: isSelected ? '#1d4ed8' : '#0284c7', display: 'flex' }}>
                        {entityType === 'GROUP' ? <Users size={14} /> : <UserCheck size={14} />}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: isSelected ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name || item.identifier}
                          {item.name && item.identifier !== item.name && (
                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px', fontWeight: 'normal' }}>
                              ({item.identifier})
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected ? (
                      <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={12} /> Choisi
                      </span>
                    ) : (
                      <button
                        type="button"
                        style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: '#0284c7', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Sélectionner
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  const renderAdEntityPicker = ({
    items = [],
    selectedId = '',
    selectedName = '',
    onSelect,
    onClear,
    entityType = 'GROUP'
  }) => {
    const tree = buildEntityTree(items, ldapOUs);
    const selectedItem = items.find(i => i.identifier === selectedId);

    return (
      <div className="ad-tree-picker-container">
        {/* Onglets Mode Arborescence vs Recherche */}
        <div className="ad-tree-tabs">
          <button
            type="button"
            className={`ad-tree-tab-btn ${adTreePickerMode === 'tree' ? 'active' : ''}`}
            onClick={() => setAdTreePickerMode('tree')}
          >
            <FolderTree size={14} /> Arborescence AD (OUs & Sous-groupes)
          </button>
          <button
            type="button"
            className={`ad-tree-tab-btn ${adTreePickerMode === 'search' ? 'active' : ''}`}
            onClick={() => setAdTreePickerMode('search')}
          >
            <Search size={14} /> Recherche directe
          </button>
        </div>

        {/* Mode 1: Arborescence Interactive */}
        {adTreePickerMode === 'tree' && (
          <div>
            <div className="ad-tree-toolbar">
              <div className="ad-tree-search-box">
                <Search size={13} color="#94a3b8" />
                <input
                  type="text"
                  placeholder={`Filtrer l'arborescence (${entityType === 'GROUP' ? 'groupe, sous-dossier' : 'utilisateur'})...`}
                  value={adTreeSearchQuery}
                  onChange={(e) => setAdTreeSearchQuery(e.target.value)}
                />
                {adTreeSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAdTreeSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#94a3b8' }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '3px 7px', fontSize: '11px', color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  onClick={() => expandAllAdTreeNodes(tree)}
                  title="Tout déplier"
                >
                  <FolderOpen size={13} /> Déplier
                </button>
                <button
                  type="button"
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '3px 7px', fontSize: '11px', color: '#475569', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                  onClick={collapseAllAdTreeNodes}
                  title="Tout replier"
                >
                  <Folder size={13} /> Replier
                </button>
              </div>
            </div>

            <div className="ad-tree-scroll-area">
              {renderAdTreeNode(tree, 0, selectedId, onSelect, entityType)}
            </div>
          </div>
        )}

        {/* Mode 2: Recherche directe par mot-clé */}
        {adTreePickerMode === 'search' && (
          <div style={{ padding: '10px' }}>
            <input
              type="text"
              placeholder={`Tapez un nom pour filtrer les ${entityType === 'GROUP' ? 'groupes' : 'utilisateurs'}...`}
              value={adTreeSearchQuery}
              onChange={(e) => setAdTreeSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }}
            />
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '6px' }}>
              {(() => {
                const q = adTreeSearchQuery.trim().toLowerCase();
                const filtered = items.filter(i =>
                  !q ||
                  (i.name || '').toLowerCase().includes(q) ||
                  (i.identifier || '').toLowerCase().includes(q) ||
                  (i.description || '').toLowerCase().includes(q) ||
                  getOuPath(i.dn).toLowerCase().includes(q)
                );

                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '16px', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>
                      Aucun élément correspondant trouvé.
                    </div>
                  );
                }

                return filtered.map(item => {
                  const isSelected = selectedId === item.identifier;
                  return (
                    <div
                      key={item.identifier}
                      className={`ad-tree-item-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSelect(item)}
                      style={{ padding: '8px 10px', borderBottom: '1px solid #f8fafc' }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: isSelected ? '#1d4ed8' : '#0284c7' }}>
                            {entityType === 'GROUP' ? <Users size={14} /> : <UserCheck size={14} />}
                          </span>
                          <span style={{ fontWeight: 600 }}>{item.name || item.identifier}</span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>({item.identifier})</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Folder size={11} /> Emplacement : {getOuPath(item.dn)}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                          ✓ Choisi
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Récapitulatif sélection */}
        {selectedId && (
          <div className="ad-selected-card" style={{ margin: '8px 10px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                  {selectedName || selectedId} <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '11px' }}>({selectedId})</span>
                </div>
                <div style={{ fontSize: '11px', color: '#475569' }}>
                  📁 Emplacement : {getOuPath(selectedItem?.dn)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClear}
              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, textDecoration: 'underline' }}
            >
              Changer
            </button>
          </div>
        )}
      </div>
    );
  };

  const fetchLdapEntities = async () => {
    setLoadingLdap(true);
    setLdapError(null);
    try {
      const resUsers = await axios.get(`${API_URL}/api/ldap-config/users`, getConfig());
      setLdapUsers(resUsers.data || []);
      const resGroups = await axios.get(`${API_URL}/api/ldap-config/groups`, getConfig());
      setLdapGroups(resGroups.data || []);
      try {
        const resOus = await axios.get(`${API_URL}/api/ldap-config/ous`, getConfig());
        setLdapOUs(resOus.data || []);
      } catch (ouErr) {
        // Optionnel : les OUs sont déduites des DN des groupes
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de l'AD", err);
      setLdapError("Serveur Active Directory injoignable (172.16.100.3:389). Vérifiez que votre connection réseau BCRG est bien connecté.");
    } finally {
      setLoadingLdap(false);
    }
  };

  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!assignRoleForm.ldap_identifier || !assignRoleForm.role_id) {
      setAssignRoleResult({ success: false, message: 'Veuillez sélectionner une entité AD et un rôle' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const configWithAuth = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.post(`${API_URL}/api/admin/roles/assign-ldap`, assignRoleForm, configWithAuth);
      setAssignRoleResult({ success: true, message: 'Rôle assigné avec succès !' });
      setTimeout(() => { setShowAssignRoleModal(false); setAssignRoleResult(null); }, 2000);
    } catch (err) {
      setAssignRoleResult({ success: false, message: err.response?.data?.message || 'Erreur lors de l\'assignation' });
    }
  };

  const handleDeleteApp = async (id) => {
    requestConfirm('Êtes-vous sûr de vouloir supprimer cette application ?', async () => {
      try {
        await axios.delete(`${API_URL}/api/admin/applications/${id}`, getConfig());
        showToast("Application supprimée avec succès");
        Promise.all([fetchApps(), fetchStats()]);
      } catch (err) { showToast("Erreur lors de la suppression de l'application", "error"); }
    });
  };

  const handleRevokeLdapMapping = async (mappingId) => {
    requestConfirm('Êtes-vous sûr de vouloir révoquer cet accès AD ?', async () => {
      try {
        await axios.delete(`${API_URL}/api/admin/roles/mapping/${mappingId}`, getConfig());
        showToast("Accès révoqué avec succès");
        fetchRoles(); // Refresh the roles data
        if (selectedRoleForMembers) {
          setShowRoleMembersModal(false);
        }
      } catch (err) { showToast("Erreur lors de la révocation", "error"); }
    });
  };

  const handleDeleteUser = async (id) => {
    requestConfirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?', async () => {
      try {
        await axios.delete(`${API_URL}/api/admin/users/${id}`, getConfig());
        showToast("Utilisateur supprimé avec succès");
        Promise.all([fetchUsers(), fetchStats()]);
      } catch (err) { showToast("Erreur lors de la suppression de l'utilisateur", "error"); }
    });
  };

  const handleRevokeSessions = async (userId, userIdentifier) => {
    requestConfirm(`Voulez-vous révoquer immédiatement toutes les sessions actives pour ${userIdentifier} ? L'utilisateur sera déconnecté sur tous ses appareils.`, async () => {
      try {
        const res = await axios.post(`${API_URL}/api/admin/users/${userId}/revoke-sessions`, {}, getConfig());
        showToast(res.data?.message || "Sessions révoquées avec succès !");
      } catch (err) {
        showToast(err.response?.data?.message || "Erreur lors de la révocation des sessions", "error");
      }
    });
  };

  const handleDeleteRole = async (id) => {
    requestConfirm('Êtes-vous sûr de vouloir supprimer ce rôle ?', async () => {
      try {
        await axios.delete(`${API_URL}/api/admin/roles/${id}`, getConfig());
        showToast("Rôle supprimé avec succès");
        Promise.all([fetchRoles(), fetchStats()]);
      } catch (err) { showToast("Erreur lors de la suppression du rôle", "error"); }
    });
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      setShowRoleModal(false);
      showToast("Rôle sauvegardé avec succès");
      if (editingRoleId) {
        await axios.put(`${API_URL}/api/admin/roles/${editingRoleId}`, newRole, getConfig());
      } else {
        await axios.post(`${API_URL}/api/admin/roles`, newRole, getConfig());
      }
      setEditingRoleId(null);
      setNewRole({ name: '', description: '' });
      Promise.all([fetchRoles(), fetchStats()]);
    } catch (err) { showToast("Erreur lors de la sauvegarde du rôle", "error"); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!editingUserId) return;
    try {
      setShowUserModal(false);
      showToast('Droits et rôle mis à jour avec succès');
      await axios.put(`${API_URL}/api/admin/users/${editingUserId}`, newUser, getConfig());
      setEditingUserId(null);
      setNewUser({ first_name: '', last_name: '', email: '', matricule: '', department: '', role_id: '', is_admin: false });
      Promise.all([fetchUsers(), fetchStats()]);
    } catch (err) {
      console.error('Erreur mise à jour utilisateur:', err.response?.data || err.message);
      showToast(err.response?.data?.message || "Erreur lors de la mise à jour de l'utilisateur", 'error');
      fetchUsers();
    }
  };

  const handleImportCSV = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const usersToImport = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        if (cols.length >= 4) {
          usersToImport.push({
            matricule: cols[0].trim(),
            last_name: cols[1].trim(),
            first_name: cols[2].trim(),
            email: cols[3].trim(),
            department: cols[4] ? cols[4].trim() : '',
            role_name: cols[5] ? cols[5].trim() : ''
          });
        }
      }

      try {
        const { data } = await axios.post(`${API_URL}/api/admin/users/import`, { users: usersToImport }, getConfig());
        setImportResult(data);
        fetchUsers(); fetchStats();
      } catch (err) {
        showToast("Erreur serveur lors de l'import", "error");
      }
    };
    reader.readAsText(importFile);
  };

  // Filtered lists
  const filteredUsers = usersList.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email} ${u.matricule}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApps = apps.filter(a =>
    `${a.name} ${a.url}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoles = roles.filter(r =>
    `${r.name} ${r.description}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-panel">
      {!hideTabsHeader && (
        <>
          <div className="admin-header">
            <h2>Espace d'Administration</h2>
            <p>Gérez les applications, les utilisateurs et les droits d'accès.</p>
          </div>

          <div className="admin-tabs">
            <button className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
              <BarChart3 size={16} /> Statistiques
            </button>
            <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <Users size={16} /> Utilisateurs
            </button>
            <button className={`admin-tab ${activeTab === 'apps' ? 'active' : ''}`} onClick={() => setActiveTab('apps')}>
              <AppWindow size={16} /> Applications
            </button>
            <button className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>
              <ShieldCheck size={16} /> Rôles & Permissions
            </button>
            <button className={`admin-tab ${activeTab === 'ldap' ? 'active' : ''}`} onClick={() => setActiveTab('ldap')}>
              <Database size={16} /> LDAP & AD
            </button>
            <button className={`admin-tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
              <Lock size={16} /> Sécurité & Conformité
            </button>
          </div>
        </>
      )}

      <div className="admin-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6c8093' }}>
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>Chargement des données en cours...</p>
          </div>
        ) : (
          <>
            {/* --- TAB STATS (DASHBOARD STATISTIQUES REELLES) --- */}
            {activeTab === 'stats' && (
              <>
                {/* 3 KPI Cards Grid - Données réelles uniquement */}
                <div className="kpi-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div className="kpi-card" onClick={() => setActiveTab('apps')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Applications au catalogue</span>
                      <div className="kpi-icon-box blue"><AppWindow size={20} /></div>
                    </div>
                    <div className="kpi-value">{stats.applications}</div>
                    <span className="kpi-badge blue">Gérer le catalogue &rarr;</span>
                  </div>

                  <div className="kpi-card" onClick={() => setActiveTab('users')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Employés enregistrés</span>
                      <div className="kpi-icon-box green"><Users size={20} /></div>
                    </div>
                    <div className="kpi-value">{stats.users}</div>
                    <span className="kpi-badge green">Gérer les comptes &rarr;</span>
                  </div>

                  <div className="kpi-card" onClick={() => setActiveTab('roles')} style={{ cursor: 'pointer' }}>
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Rôles d'accès (RBAC)</span>
                      <div className="kpi-icon-box purple"><ShieldCheck size={20} /></div>
                    </div>
                    <div className="kpi-value">{stats.roles}</div>
                    <span className="kpi-badge purple">Matrice d'habilitations &rarr;</span>
                  </div>
                </div>

                {/* Synthèse des données réelles du système */}
                <div className="dashboard-middle-grid">
                  {/* Gauche: Liste des dernières applications réelles */}
                  <div className="card-panel">
                    <div className="card-panel-header">
                      <div>
                        <h3>Applications récentes</h3>
                        <p className="card-panel-sub">Applications actuellement enregistrées dans la base de données</p>
                      </div>
                      <button className="btn-secondary-action" onClick={() => setActiveTab('apps')}>Tout voir</button>
                    </div>

                    {apps.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.9rem', paddingTop: '10px' }}>Aucune application configurée.</p>
                    ) : (
                      <table className="bcrg-table">
                        <thead>
                          <tr>
                            <th>Nom</th>
                            <th>Authentification</th>
                            <th>Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apps.slice(0, 4).map(app => (
                            <tr key={app.id}>
                              <td>
                                <div className="user-cell-content">
                                  <div className="user-avatar-circle" style={{ backgroundColor: '#e0f2fe', color: '#0284c7', width: '30px', height: '30px', borderRadius: '8px', overflow: 'hidden' }}>
                                    <AppLogo app={app} size={20} />
                                  </div>
                                  <strong>{app.name}</strong>
                                </div>
                              </td>

                              <td><span className="status-capsule active">{app.status || 'Actif'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Droite: Actions rapides d'administration */}
                  <div className="card-panel">
                    <div className="card-panel-header">
                      <div>
                        <h3>Actions d'Administration</h3>
                        <p className="card-panel-sub">Raccourcis pour les opérations courantes</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                      <button className="btn-primary-action" style={{ justifyContent: 'flex-start' }} onClick={() => { setNewApp({ name: '', url: '', description: '', auth_type: 'SSO', status: 'Actif', icon_url: '', slo_url: '' }); setEditingAppId(null); setShowAppModal(true); }}>
                        <Plus size={18} /> Ajouter une nouvelle application
                      </button>
                      <button className="btn-secondary-action" style={{ justifyContent: 'flex-start' }} onClick={() => { fetchApps(); fetchUsers(); fetchRoles(); setAssignResult(null); setShowAssignModal(true); }}>
                        <Key size={18} /> Assigner une application à un utilisateur / rôle
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* --- TAB APPLICATIONS (MATCHING IMAGE 2 LIST UI) --- */}
            {activeTab === 'apps' && (
              <>
                {/* Top KPI Cards for Apps */}
                <div className="kpi-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Applications au Catalogue</span>
                      <div className="kpi-icon-box green"><AppWindow size={18} /></div>
                    </div>
                    <div className="kpi-value">{apps.length}</div>
                    <span className="kpi-badge green">Total configuré</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Authentification SSO / OIDC</span>
                      <div className="kpi-icon-box blue"><Key size={18} /></div>
                    </div>
                    <div className="kpi-value">{apps.length}</div>
                    <span className="kpi-badge blue">Connectivité SSO maison</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Single Logout (SLO)</span>
                      <div className="kpi-icon-box purple"><ShieldCheck size={18} /></div>
                    </div>
                    <div className="kpi-value">{apps.filter(a => a.slo_url).length} / {apps.length}</div>
                    <span className="kpi-badge purple">Endpoints configurés</span>
                  </div>
                </div>

                {/* Toolbar / Search & Add */}
                <div className="table-toolbar">
                  <div className="toolbar-left">
                    <div className="search-input-wrapper">
                      <Search size={16} className="search-icon-inside" />
                      <input
                        type="text"
                        placeholder="Rechercher une application (nom, auth, url)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <button className="btn-filter"><Filter size={14} /> Filtrer</button>
                  </div>
                  <div className="toolbar-right">
                    <button className="btn-secondary-action" onClick={() => { fetchApps(); fetchUsers(); fetchRoles(); fetchLdapEntities(); setAssignResult(null); setAssignForm({ targetType: 'group', user_id: '', role_id: '', ldap_identifier: '', ldap_name: '', app_id: '' }); setShowAssignModal(true); }}>
                      <Key size={16} /> Assigner une Application
                    </button>
                    <button className="btn-primary-action" onClick={() => { setNewApp({ name: '', url: '', description: '', auth_type: 'SSO', status: 'Actif', icon_url: '', slo_url: '' }); setEditingAppId(null); setShowAppModal(true); }}>
                      <Plus size={18} /> Nouvelle Application
                    </button>
                  </div>
                </div>

                {/* Applications Table matching Image 2 */}
                <div className="table-card-container">
                  <table className="bcrg-table">
                    <thead>
                      <tr>
                        <th>Application</th>
                        <th>Type Authentification</th>
                        <th>URL Redirection</th>
                        <th>Déconnexion Globale (SLO)</th>
                        <th>Statut</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            Aucune application trouvée.
                          </td>
                        </tr>
                      ) : (
                        filteredApps.map(app => (
                          <tr key={app.id}>
                            <td>
                              <div className="user-cell-content">
                                <div className="user-avatar-circle" style={{ backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '10px', overflow: 'hidden' }}>
                                  <AppLogo app={app} size={24} />
                                </div>
                                <div>
                                  <div className="user-name-title">{app.name}</div>
                                  <div className="user-subtext">{app.description || 'Application d\'entreprise BCRG'}</div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                                {app.url} <ExternalLink size={12} />
                              </a>
                            </td>
                            <td>
                              {app.slo_url ? (
                                <span className="badge-pill-type badge-pill-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }} title={`Endpoint Back-Channel : ${app.slo_url}`}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span> SLO Actif
                                </span>
                              ) : (
                                <span className="badge-pill-type" style={{ background: '#f1f5f9', color: '#64748b' }} title="Non renseigné - Déconnexion locale uniquement">
                                  Non configuré
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`status-capsule ${app.status === 'Actif' ? 'active' :
                                app.status === 'En maintenance' ? 'maintenance' : 'inactive'
                                }`}>
                                {app.status || 'Actif'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-menu-wrapper">
                                <button className="action-dots-btn" onClick={() => setActiveActionMenu(activeActionMenu === `app-${app.id}` ? null : `app-${app.id}`)}>
                                  <MoreHorizontal size={16} />
                                </button>
                                {activeActionMenu === `app-${app.id}` && (
                                  <div className="action-menu-dropdown">
                                    <button className="action-menu-item" onClick={() => { setNewApp({ name: app.name, url: app.url, description: app.description, auth_type: app.auth_type, status: app.status, icon_url: app.icon_url || '', slo_url: app.slo_url || '' }); setEditingAppId(app.id); setShowAppModal(true); setActiveActionMenu(null); }}><Edit size={16} className="action-menu-icon" /> Modifier</button>
                                    <button className="action-menu-item delete" onClick={() => { handleDeleteApp(app.id); setActiveActionMenu(null); }}><Trash2 size={16} className="action-menu-icon" /> Supprimer</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* --- TAB USERS (MATCHING IMAGE 2 LIST UI) --- */}
            {activeTab === 'users' && (
              <>
                {/* Top KPI Cards for Users */}
                <div className="kpi-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Utilisateurs Enregistrés</span>
                      <div className="kpi-icon-box green"><Users size={18} /></div>
                    </div>
                    <div className="kpi-value">{usersList.length}</div>
                    <span className="kpi-badge green">Total effectif</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Comptes Actifs</span>
                      <div className="kpi-icon-box blue"><UserCheck size={18} /></div>
                    </div>
                    <div className="kpi-value">{usersList.filter(u => u.is_active).length}</div>
                    <span className="kpi-badge blue">Habilités SSO</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Profils Administrateur</span>
                      <div className="kpi-icon-box purple"><ShieldCheck size={18} /></div>
                    </div>
                    <div className="kpi-value">{usersList.filter(u => u.is_admin).length}</div>
                    <span className="kpi-badge purple">Privilèges élevés</span>
                  </div>
                </div>

                {/* Toolbar / Search & Add */}
                <div className="table-toolbar">
                  <div className="toolbar-left">
                    <div className="search-input-wrapper">
                      <Search size={16} className="search-icon-inside" />
                      <input
                        type="text"
                        placeholder="Rechercher un employé (nom, matricule, email)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                  </div>
                  <div className="toolbar-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                    <button
                      className="btn-primary-action"
                      onClick={() => {
                        const targetUser = usersList[0];
                        if (targetUser) {
                          setEditingUserId(targetUser.id);
                          setNewUser({
                            first_name: targetUser.first_name || '',
                            last_name: targetUser.last_name || '',
                            email: targetUser.email || '',
                            matricule: targetUser.matricule || '',
                            department: targetUser.department || '',
                            role_id: (targetUser.Roles && targetUser.Roles[0]) ? targetUser.Roles[0].id : '',
                            is_admin: Boolean(targetUser.is_admin)
                          });
                        }
                        setShowUserModal(true);
                      }}
                    >
                      <Edit size={16} /> Modifier l'Utilisateur & ses Droits
                    </button>
                  </div>
                </div>

                {/* Users Table matching Image 2 */}
                <div className="table-card-container">
                  <table className="bcrg-table">
                    <thead>
                      <tr>
                        <th>Employé</th>
                        <th>Email & Département</th>
                        <th>Rôle Attribué</th>
                        <th>Statut</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            Aucun utilisateur trouvé.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => {
                          const userInitials = u.first_name ? `${u.first_name.charAt(0)}${u.last_name ? u.last_name.charAt(0) : ''}`.toUpperCase() : 'U';
                          const roleText = u.Roles && u.Roles.length > 0 ? u.Roles.map(r => r.name).join(', ') : (u.is_admin ? 'Administrateur' : 'Employé Standard');
                          return (
                            <tr key={u.id}>
                              <td>
                                <div className="user-cell-content">
                                  <div className="user-avatar-circle">
                                    {userInitials}
                                  </div>
                                  <div>
                                    <div className="user-name-title">{u.first_name} {u.last_name}</div>
                                    <div className="user-subtext">Matricule: {u.matricule || 'Non renseigné'}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div>{u.email}</div>
                                <div className="user-subtext">{u.department || 'Banque Centrale'}</div>
                              </td>
                              <td>
                                <span className={`badge-pill-type ${u.is_admin ? 'badge-pill-pink' : 'badge-pill-blue'}`}>
                                  {roleText}
                                </span>
                              </td>
                              <td>
                                <span className={`status-capsule ${u.is_active !== false ? 'active' : 'inactive'}`}>
                                  {u.is_active !== false ? 'ACTIF' : 'INACTIF'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="action-menu-wrapper">
                                  <button className="action-dots-btn" onClick={() => setActiveActionMenu(activeActionMenu === `user-${u.id}` ? null : `user-${u.id}`)}>
                                    <MoreHorizontal size={16} />
                                  </button>
                                  {activeActionMenu === `user-${u.id}` && (
                                    <div className="action-menu-dropdown">
                                      <button className="action-menu-item" onClick={() => {
                                        setEditingUserId(u.id);
                                        setNewUser({
                                          first_name: u.first_name || '',
                                          last_name: u.last_name || '',
                                          email: u.email || '',
                                          matricule: u.matricule || '',
                                          department: u.department || '',
                                          role_id: (u.Roles && u.Roles[0]) ? u.Roles[0].id : '',
                                          is_admin: Boolean(u.is_admin)
                                        });
                                        setShowUserModal(true);
                                        setActiveActionMenu(null);
                                      }}>
                                        <Edit size={16} className="action-menu-icon" /> Modifier les Droits
                                      </button>
                                      <button className="action-menu-item" onClick={() => { setAssignForm({ ...assignForm, targetType: 'user', user_id: u.id }); setShowAssignModal(true); setActiveActionMenu(null); }}><Key size={16} className="action-menu-icon" /> Assigner App</button>
                                      <button className="action-menu-item" style={{ color: '#ea580c' }} onClick={() => { handleRevokeSessions(u.id, u.email || u.matricule); setActiveActionMenu(null); }}><UserX size={16} className="action-menu-icon" /> Révoquer Sessions</button>
                                      <button className="action-menu-item delete" onClick={() => { handleDeleteUser(u.id); setActiveActionMenu(null); }}><Trash2 size={16} className="action-menu-icon" /> Supprimer</button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* --- TAB ROLES (MATCHING IMAGE 2 LIST UI) --- */}
            {activeTab === 'roles' && (
              <>
                {/* Top KPI Cards for Roles */}
                <div className="kpi-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Rôles Définis</span>
                      <div className="kpi-icon-box purple"><ShieldCheck size={18} /></div>
                    </div>
                    <div className="kpi-value">{roles.length}</div>
                    <span className="kpi-badge purple">Groupes d'accès</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Attributions d'Apps</span>
                      <div className="kpi-icon-box blue"><AppWindow size={18} /></div>
                    </div>
                    <div className="kpi-value">
                      {roles.reduce((acc, r) => acc + (r.Applications ? r.Applications.length : 0), 0)}
                    </div>
                    <span className="kpi-badge blue">Habilitations actives</span>
                  </div>

                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-title">Politique Sécurité</span>
                      <div className="kpi-icon-box green"><CheckCircle2 size={18} /></div>
                    </div>
                    <div className="kpi-value">RBAC</div>
                    <span className="kpi-badge green">Conforme BCRG</span>
                  </div>
                </div>

                {/* Toolbar / Search & Add */}
                <div className="table-toolbar">
                  <div className="toolbar-left">
                    <div className="search-input-wrapper">
                      <Search size={16} className="search-icon-inside" />
                      <input
                        type="text"
                        placeholder="Rechercher un rôle ou un privilège..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="toolbar-right">
                    <button className="btn-secondary-action" onClick={() => { fetchRoles(); fetchLdapEntities(); setAssignRoleResult(null); setAssignRoleForm({ ldap_type: 'USER', ldap_identifier: '', role_id: '', ldap_name: '' }); setShowAssignRoleModal(true); }}>
                      <UserCheck size={16} /> Ajouter un utilisateur à un rôle
                    </button>
                    <button className="btn-primary-action" onClick={() => { setNewRole({ name: '', description: '' }); setEditingRoleId(null); setShowRoleModal(true); }}>
                      <Plus size={18} /> Nouveau Rôle
                    </button>
                  </div>
                </div>

                {/* Roles Table matching Image 2 */}
                <div className="table-card-container">
                  <table className="bcrg-table">
                    <thead>
                      <tr>
                        <th>Nom du Rôle</th>
                        <th>Description & Portée</th>
                        <th>Applications Assignées</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoles.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            Aucun rôle défini.
                          </td>
                        </tr>
                      ) : (
                        filteredRoles.map(r => (
                          <tr key={r.id}>
                            <td>
                              <div className="user-cell-content">
                                <div className="user-avatar-circle" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
                                  <ShieldCheck size={18} />
                                </div>
                                <div className="user-name-title">{r.name}</div>
                              </div>
                            </td>
                            <td>{r.description || 'Rôle d\'accès aux ressources du Store BCRG'}</td>
                            <td>
                              {r.Applications && r.Applications.length > 0 ? (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {r.Applications.map(app => (
                                    <span key={app.id} className="badge-pill-type badge-pill-green">
                                      {app.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="user-subtext">Aucune app assignée</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="action-menu-wrapper">
                                <button className="action-dots-btn" onClick={() => setActiveActionMenu(activeActionMenu === `role-${r.id}` ? null : `role-${r.id}`)}>
                                  <MoreHorizontal size={16} />
                                </button>
                                {activeActionMenu === `role-${r.id}` && (
                                  <div className="action-menu-dropdown">
                                    <button className="action-menu-item" onClick={() => { setSelectedRoleForMembers(r); setShowRoleMembersModal(true); setActiveActionMenu(null); }}><Users size={16} className="action-menu-icon" /> Voir les membres AD</button>
                                    <button className="action-menu-item" onClick={() => { setAssignForm({ ...assignForm, targetType: 'role', role_id: r.id }); setShowAssignModal(true); setActiveActionMenu(null); }}><Key size={16} className="action-menu-icon" /> Assigner App</button>
                                    <button className="action-menu-item" onClick={() => { setNewRole({ name: r.name, description: r.description }); setEditingRoleId(r.id); setShowRoleModal(true); setActiveActionMenu(null); }}><Edit size={16} className="action-menu-icon" /> Modifier</button>
                                    <button className="action-menu-item delete" onClick={() => { handleDeleteRole(r.id); setActiveActionMenu(null); }}><Trash2 size={16} className="action-menu-icon" /> Supprimer</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* Modal Ajout Application */}
      {showAppModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingAppId ? "Modifier l'Application" : "Ajouter une Application"}</h3>
            <form onSubmit={handleCreateApp}>
              <div className="form-group">
                <label>Nom de l'application</label>
                <input required value={newApp.name} onChange={e => setNewApp({ ...newApp, name: e.target.value })} placeholder="ex: SIRH, Core Banking" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea required value={newApp.description} onChange={e => setNewApp({ ...newApp, description: e.target.value })} placeholder="Description et usage..." />
              </div>
              <div className="form-group">
                <label>URL de lancement / redirection SSO</label>
                <input required type="url" value={newApp.url} onChange={e => setNewApp({ ...newApp, url: e.target.value })} placeholder="https://sirh.bcrg.gn" />
              </div>
              <div className="form-group">
                <label>URL du Logo / Icône PWA (optionnel)</label>
                <input type="url" value={newApp.icon_url || ''} onChange={e => setNewApp({ ...newApp, icon_url: e.target.value })} placeholder="https://domain.com/logo.png (détecté automatiquement si vide)" />
              </div>

              <div className="form-group">
                <label>URL de Single Logout (SLO - Endpoint de Révocation) (Optionnel)</label>
                <input
                  type="url"
                  value={newApp.slo_url || ''}
                  onChange={e => setNewApp({ ...newApp, slo_url: e.target.value })}
                  placeholder="https://app.bcrg.gn/api/sso/logout ou http://localhost:5001/api/apps/slo-receiver"
                />
                <small style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>
                  Point de terminaison vers lequel le HUB envoie la notification Back-Channel (Jeton RS256) lors du clic sur "Déconnexion".
                </small>
              </div>

              <div className="form-group">
                <label>Mode de connexion</label>
                <select value={newApp.auth_type} onChange={e => setNewApp({ ...newApp, auth_type: e.target.value })}>
                  <option value="SSO">SSO Sécurisé (Jeton JWT éphémère)</option>
                  <option value="NONE">Redirection simple (Sans jeton)</option>
                </select>
                <small style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>
                  {newApp.auth_type === 'SSO'
                    ? "Le HUB transmettra un jeton SSO temporaire sécurisé à l'application cible."
                    : "Le HUB ouvrira l'application telle quelle, l'utilisateur devra se connecter."}
                </small>
              </div>

              <div className="form-group">
                <label>Statut</label>
                <select value={newApp.status} onChange={e => setNewApp({ ...newApp, status: e.target.value })}>
                  <option value="Actif">Actif</option>
                  <option value="En maintenance">En maintenance</option>
                  <option value="Inactif">Inactif</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowAppModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary-action">{editingAppId ? 'Sauvegarder' : "Créer l'application"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajout Rôle */}
      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editingRoleId ? "Modifier le Rôle" : "Ajouter un Rôle d'accès (RBAC)"}</h3>
            <form onSubmit={handleCreateRole}>
              <div className="form-group">
                <label>Nom du rôle</label>
                <input required value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} placeholder="ex: Finance, Opérations" />
              </div>
              <div className="form-group">
                <label>Description du rôle</label>
                <textarea value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} placeholder="Droits associés..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowRoleModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary-action">{editingRoleId ? 'Sauvegarder' : 'Créer le rôle'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modification Utilisateur & Droits AD */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    Modifier l'Utilisateur & ses Droits
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.6rem', lineHeight: '1', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                title="Fermer"
              >
                ×
              </button>
            </div>

            {/* Note Authentification Active Directory */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534', fontSize: '0.82rem', marginBottom: '16px' }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span><strong>Compte Active Directory (AD) :</strong> L'authentification et le mot de passe sont gérés directement par votre annuaire d'entreprise.</span>
            </div>

            <form onSubmit={handleCreateUser}>
              {/* Sélection rapide de l'employé */}
              {usersList.length > 0 && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: 700, color: '#0f172a' }}>Employé sélectionné (AD)</label>
                  <select
                    value={editingUserId || ''}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const u = usersList.find(x => String(x.id) === String(selectedId));
                      if (u) {
                        setEditingUserId(u.id);
                        setNewUser({
                          first_name: u.first_name || '',
                          last_name: u.last_name || '',
                          email: u.email || '',
                          matricule: u.matricule || '',
                          department: u.department || '',
                          role_id: (u.Roles && u.Roles[0]) ? u.Roles[0].id : '',
                          is_admin: Boolean(u.is_admin)
                        });
                      }
                    }}
                    style={{ background: '#f8fafc', fontWeight: 600, borderColor: '#cbd5e1' }}
                  >
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} — {u.email || u.matricule} ({u.is_admin ? 'Admin' : 'Employé Standard'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Row 1: Prénom + Nom */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label>Prénom</label>
                  <input required value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} placeholder="Prénom" />
                </div>
                <div className="form-group">
                  <label>Nom</label>
                  <input required value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} placeholder="Nom" />
                </div>
              </div>

              {/* Row 2: Email + Matricule */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label>Email professionnel</label>
                  <input required type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="agent@bcrg-guinee.org" />
                </div>
                <div className="form-group">
                  <label>Matricule</label>
                  <input required value={newUser.matricule} onChange={e => setNewUser({ ...newUser, matricule: e.target.value })} placeholder="BCRG-0042" />
                </div>
              </div>

              {/* Row 3: Département + Rôle RBAC */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px' }}>
                <div className="form-group">
                  <label>Département</label>
                  <input value={newUser.department} onChange={e => setNewUser({ ...newUser, department: e.target.value })} placeholder="ex: DSI, Comptabilité" />
                </div>
                <div className="form-group">
                  <label>Rôle attribué (RBAC)</label>
                  <select
                    value={newUser.role_id}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selectedRole = roles.find(r => String(r.id) === String(selectedId));
                      const isAdminRole = selectedRole ? (selectedRole.name || '').toLowerCase().includes('admin') : false;
                      setNewUser({
                        ...newUser,
                        role_id: selectedId,
                        is_admin: isAdminRole ? true : newUser.is_admin
                      });
                    }}
                  >
                    <option value="">Employé standard</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.name.toLowerCase().includes('admin') ? ' (Droits Admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Banner Privilèges Admin */}
              <div className="form-group" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', margin: '4px 0 10px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(newUser.is_admin)}
                    onChange={e => setNewUser({ ...newUser, is_admin: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--bcrg-green)', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Privilèges Administrateur (Accès au Panneau)</span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      Accorde l'accès complet au panneau d'administration, à la gestion des applications, utilisateurs, rôles et sécurité.
                    </span>
                  </div>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowUserModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary-action">Enregistrer les modifications</button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Modal Assignation App à un Utilisateur, Groupe AD ou Rôle */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px', width: '100%' }}>
            <h3>Assigner une Application</h3>
            <form onSubmit={handleAssignApp}>
              {/* Choix du type de cible */}
              <div className="form-group">
                <label>Type d'attribution</label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500 }}>
                    <input
                      type="radio"
                      name="assign_targetType"
                      value="group"
                      checked={assignForm.targetType === 'group'}
                      onChange={() => {
                        setAssignForm({ ...assignForm, targetType: 'group', role_id: '', user_id: '', ldap_identifier: '', ldap_name: '' });
                        setAssignGroupSearch('');
                      }}
                    />
                    Groupe Active Directory (AD)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500 }}>
                    <input
                      type="radio"
                      name="assign_targetType"
                      value="role"
                      checked={assignForm.targetType === 'role'}
                      onChange={() => setAssignForm({ ...assignForm, targetType: 'role', ldap_identifier: '', ldap_name: '', user_id: '' })}
                    />
                    Rôle Applicatif BCRG
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500 }}>
                    <input
                      type="radio"
                      name="assign_targetType"
                      value="user"
                      checked={assignForm.targetType === 'user'}
                      onChange={() => setAssignForm({ ...assignForm, targetType: 'user', role_id: '', ldap_identifier: '', ldap_name: '' })}
                    />
                    Utilisateur spécifique
                  </label>
                </div>
              </div>

              {/* Cas 1: Groupe AD */}
              {assignForm.targetType === 'group' && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>Groupe Active Directory</label>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {ldapGroups.length} groupe(s)
                      <button
                        type="button"
                        onClick={fetchLdapEntities}
                        style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', marginLeft: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        Rafraîchir
                      </button>
                    </span>
                  </div>

                  {loadingLdap ? (
                    <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      <RefreshCw size={18} className="spin-icon" style={{ marginBottom: '6px' }} />
                      <div>Chargement des groupes Active Directory...</div>
                    </div>
                  ) : (
                    renderAdEntityPicker({
                      items: ldapGroups,
                      selectedId: assignForm.ldap_identifier,
                      selectedName: assignForm.ldap_name,
                      entityType: 'GROUP',
                      onSelect: (item) => {
                        setAssignForm({
                          ...assignForm,
                          ldap_identifier: item.identifier,
                          ldap_name: item.name || item.identifier
                        });
                      },
                      onClear: () => {
                        setAssignForm({
                          ...assignForm,
                          ldap_identifier: '',
                          ldap_name: ''
                        });
                      }
                    })
                  )}
                </div>
              )}

              {/* Cas 2: Rôle BCRG */}
              {assignForm.targetType === 'role' && (
                <div className="form-group">
                  <label>Sélectionner le Rôle Applicatif</label>
                  <select
                    required
                    value={assignForm.role_id}
                    onChange={e => setAssignForm({ ...assignForm, role_id: e.target.value })}
                  >
                    <option value="">Choisir un rôle...</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cas 3: Utilisateur Spécifique */}
              {assignForm.targetType === 'user' && (
                <div className="form-group">
                  <label>Sélectionner l'Utilisateur</label>
                  <select
                    required
                    value={assignForm.user_id}
                    onChange={e => setAssignForm({ ...assignForm, user_id: e.target.value })}
                  >
                    <option value="">Choisir un utilisateur...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.matricule || u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sélection Application */}
              <div className="form-group">
                <label>Sélectionner l'Application</label>
                <select
                  required
                  value={assignForm.app_id}
                  onChange={e => setAssignForm({ ...assignForm, app_id: e.target.value })}
                >
                  <option value="">Choisir une application...</option>
                  {apps.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {assignResult && (
                <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', color: '#166534', marginBottom: '15px', fontSize: '0.85rem' }}>
                  {assignResult}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => { setShowAssignModal(false); setAssignResult(null); setAssignForm({ targetType: 'role', user_id: '', role_id: '', ldap_identifier: '', ldap_name: '', app_id: '' }); }}>Fermer</button>
                <button type="submit" className="btn-primary-action">Valider l'habilitation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px', width: '100%' }}>
            <h3>Assigner un rôle à l'Active Directory</h3>
            {ldapError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '13px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span>⚠️ {ldapError}</span>
                <button
                  type="button"
                  onClick={fetchLdapEntities}
                  style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
                >
                  Réessayer
                </button>
              </div>
            )}
            <form onSubmit={handleAssignRole}>

              <div className="form-group">
                <label>Type d'entité</label>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="ldap_type"
                      value="USER"
                      checked={assignRoleForm.ldap_type === 'USER'}
                      onChange={e => {
                        setAssignRoleForm({ ...assignRoleForm, ldap_type: e.target.value, ldap_identifier: '', ldap_name: '' });
                        setModalSearchTerm('');
                        setIsLdapDropdownOpen(true);
                      }}
                    /> Utilisateur AD
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="ldap_type"
                      value="GROUP"
                      checked={assignRoleForm.ldap_type === 'GROUP'}
                      onChange={e => {
                        setAssignRoleForm({ ...assignRoleForm, ldap_type: e.target.value, ldap_identifier: '', ldap_name: '' });
                        setModalSearchTerm('');
                        setAdTreeSearchQuery('');
                      }}
                    /> Groupe AD
                  </label>
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>
                    {assignRoleForm.ldap_type === 'USER' ? 'Utilisateur Active Directory' : 'Groupe Active Directory'}
                  </label>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {assignRoleForm.ldap_type === 'USER' ? `${ldapUsers.length} utilisateur(s)` : `${ldapGroups.length} groupe(s)`}
                    <button
                      type="button"
                      onClick={fetchLdapEntities}
                      style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', marginLeft: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Rafraîchir
                    </button>
                  </span>
                </div>

                {loadingLdap ? (
                  <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    <RefreshCw size={18} className="spin-icon" style={{ marginBottom: '6px' }} />
                    <div>Chargement depuis l'Active Directory (172.16.100.3)...</div>
                  </div>
                ) : assignRoleForm.ldap_type === 'USER' ? (
                  /* Affichage direct des utilisateurs comme avant */
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Tapez un nom pour rechercher un utilisateur..."
                      value={modalSearchTerm}
                      onChange={(e) => {
                        setModalSearchTerm(e.target.value);
                        setAssignRoleForm({ ...assignRoleForm, ldap_identifier: '', ldap_name: '' });
                        setIsLdapDropdownOpen(true);
                      }}
                      onFocus={() => setIsLdapDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsLdapDropdownOpen(false), 250)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />

                    {isLdapDropdownOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        maxHeight: '220px', overflowY: 'auto', backgroundColor: 'white',
                        border: '1px solid #cbd5e1', borderRadius: '6px', zIndex: 1000,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)', marginTop: '4px'
                      }}>
                        {(() => {
                          const q = (modalSearchTerm || '').toLowerCase();
                          const matches = ldapUsers.filter(u =>
                            (u.identifier || '').toLowerCase().includes(q) ||
                            (u.name || '').toLowerCase().includes(q) ||
                            ((u.first_name || '') + ' ' + (u.last_name || '')).toLowerCase().includes(q)
                          );

                          if (matches.length === 0) {
                            return (
                              <div style={{ padding: '12px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                                {ldapUsers.length === 0 ? "Aucun utilisateur synchronisé. Cliquez sur Rafraîchir." : "Aucun utilisateur trouvé pour cette recherche"}
                              </div>
                            );
                          }

                          return matches.map(u => {
                            const displayName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.identifier;
                            return (
                              <div
                                key={u.identifier}
                                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                onMouseDown={() => {
                                  setAssignRoleForm({ ...assignRoleForm, ldap_identifier: u.identifier, ldap_name: displayName });
                                  setModalSearchTerm(`${displayName} (${u.identifier})`);
                                  setIsLdapDropdownOpen(false);
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <span style={{ fontWeight: 600 }}>{displayName}</span>{' '}
                                <span style={{ color: '#64748b', fontSize: '0.88em' }}>({u.identifier})</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Arborescence Active Directory pour les groupes */
                  renderAdEntityPicker({
                    items: ldapGroups,
                    selectedId: assignRoleForm.ldap_identifier,
                    selectedName: assignRoleForm.ldap_name,
                    entityType: 'GROUP',
                    onSelect: (item) => {
                      setAssignRoleForm({
                        ...assignRoleForm,
                        ldap_identifier: item.identifier,
                        ldap_name: item.name || item.identifier
                      });
                    },
                    onClear: () => {
                      setAssignRoleForm({
                        ...assignRoleForm,
                        ldap_identifier: '',
                        ldap_name: ''
                      });
                    }
                  })
                )}
              </div>

              <div className="form-group">
                <label>Groupe de rôle</label>
                <select value={assignRoleForm.role_id} onChange={e => setAssignRoleForm({ ...assignRoleForm, role_id: e.target.value })}>
                  <option value="">Choisir un rôle...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {assignRoleResult && (
                <div className="alert" style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', backgroundColor: assignRoleResult.success ? '#e8f5e9' : '#ffebee', color: assignRoleResult.success ? '#2e7d32' : '#c62828' }}>
                  {assignRoleResult.message}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAssignRoleModal(false); setModalSearchTerm(''); }}>Annuler</button>
                <button type="submit" className="btn-primary-action">Confirmer l'ajout</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VOIR MEMBRES AD */}
      {showRoleMembersModal && selectedRoleForMembers && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Membres AD assignés au rôle : {selectedRoleForMembers.name}</h3>
              <button className="btn-close" onClick={() => setShowRoleMembersModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#64748b', marginBottom: '15px' }}>
                Liste des utilisateurs et groupes Active Directory qui ont reçu cette habilitation.
              </p>

              {(!selectedRoleForMembers.LdapRoleMappings || selectedRoleForMembers.LdapRoleMappings.length === 0) ? (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                  Aucun membre AD n'est directement assigné à ce rôle via le Hub.
                </div>
              ) : (
                <table className="bcrg-table" style={{ marginTop: '0' }}>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Identifiant AD</th>
                      <th>Nom affiché</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRoleForMembers.LdapRoleMappings.map(mapping => (
                      <tr key={mapping.id}>
                        <td>
                          <span className={`badge-pill-type ${mapping.ldap_type === 'GROUP' ? 'badge-pill-purple' : 'badge-pill-blue'}`}>
                            {mapping.ldap_type === 'GROUP' ? 'Groupe' : 'Utilisateur'}
                          </span>
                        </td>
                        <td><code style={{ fontSize: '0.85rem' }}>{mapping.ldap_identifier}</code></td>
                        <td>{mapping.ldap_name || 'N/A'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-delete"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: 'none', background: 'none' }}
                            onClick={() => handleRevokeLdapMapping(mapping.id)}
                          >
                            <Trash2 size={14} /> Révoquer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowRoleMembersModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up de confirmation in-app (remplace window.confirm) */}
      {confirmDialog && (
        <div
          onClick={() => setConfirmDialog(null)}
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
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Confirmation requise
                </h3>
                <p style={{ margin: '8px 0 0 0', color: '#334155', fontSize: '0.92rem', lineHeight: '1.4' }}>
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDialog(null);
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
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  if (fn) fn();
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}

      <div className="admin-content">
        {/* L'accolade fermante pour 'roles' est déjà plus haut, je dois juste ajouter au niveau root du admin-content */}
        {activeTab === 'ldap' && (
          <div style={{ minHeight: 'calc(100vh - 200px)' }}>
            <LdapConfigPanel />
          </div>
        )}
        {activeTab === 'security' && (
          <div style={{ minHeight: 'calc(100vh - 200px)' }}>
            <SecurityPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;













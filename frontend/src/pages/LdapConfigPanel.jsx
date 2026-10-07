import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Trash2, Activity, Users, Settings, Database, Server, Info, Search, List, ChevronRight, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import './LdapConfigPanel.css';

const LdapConfigPanel = () => {
  const [config, setConfig] = useState({
    name: 'bcrg-guinee.org',
    is_active: true,
    is_default: true,
    server: '172.16.x.x',
    port: 389,
    comments: '',
    connection_filter: '(&(objectCategory=person)(objectclass=user))',
    base_dn: 'DC=bcrg,DC=guinee,DC=org',
    use_bind: true,
    bind_dn: 'glpi_sync@bcrg-guinee.org',
    bind_password: '',
    identifier_field: 'samaccountname',
    sync_field: 'objectguid'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('config');
  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error
  const [testDetails, setTestDetails] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  
  const [ldapUsersList, setLdapUsersList] = useState([]);
  const [ldapGroupsList, setLdapGroupsList] = useState([]);
  const [loadingLdapData, setLoadingLdapData] = useState(false);

  useEffect(() => {
    const fetchLdapData = async () => {
      if (activeTab === 'users' && ldapUsersList.length === 0) {
        setLoadingLdapData(true);
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/ldap-config/users`);
          setLdapUsersList(res.data || []);
        } catch(e) { console.error(e); }
        finally { setLoadingLdapData(false); }
      }
      if (activeTab === 'groups' && ldapGroupsList.length === 0) {
        setLoadingLdapData(true);
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/ldap-config/groups`);
          setLdapGroupsList(res.data || []);
        } catch(e) { console.error(e); }
        finally { setLoadingLdapData(false); }
      }
    };
    fetchLdapData();
  }, [activeTab]);
  const [configId, setConfigId] = useState(null);

  useEffect(() => {
    // Charger la configuration au démarrage
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/ldap-config`);
        if (response.data && response.data.length > 0) {
          const loadedConfig = response.data[0]; // On prend la première config
          setConfigId(loadedConfig.id);
          setConfig(loadedConfig);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de la configuration LDAP", error);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : 
                (value === 'true' ? true : value === 'false' ? false : value);
    setConfig({ ...config, [name]: val });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (configId) {
        // Mise à jour
        await axios.put(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/ldap-config/${configId}`, config);
      } else {
        // Création
        const res = await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/ldap-config`, config);
        setConfigId(res.data.id);
      }
      setMessage('Configuration sauvegardée avec succès.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Erreur lors de la sauvegarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!configId) return;
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette configuration LDAP ?")) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/ldap-config/${configId}`);
        setConfigId(null);
        setConfig({
          name: '', server_url: '', port: 389, base_dn: '', is_active: false,
          bind_dn: '', bind_password: '', sync_field: '', identifier_field: ''
        });
        setMessage('Configuration supprimée.');
        setTimeout(() => setMessage(''), 3000);
      } catch (err) {
        setMessage('Erreur lors de la suppression.');
      }
    }
  };

  return (
    <div className="ldap-config-subpanel" style={{ paddingTop: '10px' }}>
      {message && <div className="ldap-toast">{message}</div>}
      
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>
          <Server size={16} /> Configuration
        </button>
        <button className={`admin-tab ${activeTab === 'tester' ? 'active' : ''}`} onClick={() => setActiveTab('tester')}>
          <Activity size={16} /> Tester
        </button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={16} /> Utilisateurs
        </button>
        <button className={`admin-tab ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
          <Users size={16} /> Groupes
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'config' && (
          <>
            <div className="content-header" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#1a252f', margin: 0 }}>
                Annuaire LDAP {config.name ? `- ${config.name}` : ''}
              </h3>
            </div>
            
            <form className="ldap-form" onSubmit={handleSave}>
              <div className="form-row">
                <label>Nom</label>
                <input type="text" name="name" value={config.name} onChange={handleChange} className="input-large" />
                
                <label className="right-label">Activé</label>
                <select name="is_active" value={config.is_active} onChange={handleChange}>
                  <option value={true}>Oui</option>
                  <option value={false}>Non</option>
                </select>
              </div>

              <div className="form-row">
                <label>Serveur par défaut</label>
                <select name="is_default" value={config.is_default} onChange={handleChange}>
                  <option value={true}>Oui</option>
                  <option value={false}>Non</option>
                </select>

                <label className="right-label">Port (par défaut 389)</label>
                <input type="number" name="port" value={config.port} onChange={handleChange} />
              </div>

              <div className="form-row">
                <label>Serveur</label>
                <input type="text" name="server" value={config.server} onChange={handleChange} className="input-large" />
              </div>

              <div className="form-row">
                <label>Commentaires</label>
                <textarea name="comments" value={config.comments} onChange={handleChange} rows="3" className="input-large"></textarea>
              </div>

              <div className="form-row">
                <label>Filtre de connexion</label>
                <input type="text" name="connection_filter" value={config.connection_filter} onChange={handleChange} className="input-full" />
              </div>

              <div className="form-row">
                <label>BaseDN</label>
                <input type="text" name="base_dn" value={config.base_dn} onChange={handleChange} className="input-full" />
              </div>

              <div className="form-row">
                <label>Utiliser bind ?</label>
                <select name="use_bind" value={config.use_bind} onChange={handleChange}>
                  <option value={true}>Oui</option>
                  <option value={false}>Non</option>
                </select>
              </div>

              <div className="form-row">
                <label>DN du compte (pour les connexions non anonymes)</label>
                <input type="text" name="bind_dn" value={config.bind_dn} onChange={handleChange} className="input-full" />
              </div>

              <div className="form-row">
                <label>Mot de passe du compte (pour les connexions non anonymes)</label>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="bind_password" 
                    value={config.bind_password} 
                    onChange={handleChange} 
                    className="input-medium" 
                    placeholder="Saisir le mot de passe" 
                    style={{ paddingRight: '35px' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', 
                      background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                
                <label className="right-label">Champ de synchronisation</label>
                <input type="text" name="sync_field" value={config.sync_field} onChange={handleChange} className="input-medium" />
              </div>

              <div className="form-row">
                <label>Champ de l'identifiant</label>
                <input type="text" name="identifier_field" value={config.identifier_field} onChange={handleChange} className="input-medium" />
              </div>

              <div className="form-actions">
                <span className="last-update">
                  {config.updatedAt 
                    ? `Dernière mise à jour le ${new Date(config.updatedAt).toLocaleString('fr-FR')}` 
                    : 'Non sauvegardée'}
                </span>
                <div className="buttons">
                  <button type="button" className="btn-delete" onClick={handleDelete} disabled={!configId}>
                    <Trash2 size={16} /> Supprimer définitivement
                  </button>
                  <button type="submit" className="btn-save" disabled={loading}>
                    <Save size={16} /> {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}

          {activeTab === 'tester' && (
            <div className="ldap-test-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Server size={24} color="#0284c7" />
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Diagnostic de Connexion Active Directory</h4>
              </div>
              <p style={{marginBottom: '20px', color: '#64748b'}}>Cliquez sur le bouton ci-dessous pour lancer une série de tests afin de vérifier que l'annuaire est bien joignable et que les identifiants de service sont corrects.</p>
              
              <button 
                className="btn-primary-action" 
                disabled={testStatus === 'testing'}
                style={{ marginBottom: '20px' }}
                onClick={async () => {
                  setTestStatus('testing');
                  setTestDetails(null);
                  try {
                    const res = await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/ldap-config/test`, config);
                    setTestStatus('success');
                    setTestDetails({ message: res.data.message });
                  } catch (err) {
                    setTestStatus('error');
                    setTestDetails({ message: err.response?.data?.message || err.message });
                  }
                }}
              >
                <Activity size={18} className={testStatus === 'testing' ? 'spin-icon' : ''} /> 
                {testStatus === 'testing' ? 'Analyse en cours...' : 'Lancer le diagnostic'}
              </button>
              
              {testStatus !== 'idle' && (
                <div style={{
                  padding: '20px', 
                  borderRadius: '8px',
                  backgroundColor: testStatus === 'testing' ? '#f8fafc' : (testStatus === 'success' ? '#f0fdf4' : '#fef2f2'),
                  border: '1px solid',
                  borderColor: testStatus === 'testing' ? '#e2e8f0' : (testStatus === 'success' ? '#bbf7d0' : '#fecaca'),
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <h5 style={{ 
                    margin: '0 0 15px 0', 
                    fontSize: '1rem',
                    color: testStatus === 'testing' ? '#334155' : (testStatus === 'success' ? '#166534' : '#991b1b'),
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    {testStatus === 'testing' && <Activity size={18} />}
                    {testStatus === 'success' && <CheckCircle2 size={18} />}
                    {testStatus === 'error' && <AlertTriangle size={18} />}
                    {testStatus === 'testing' ? "Tests en cours d'exécution..." : 
                     testStatus === 'success' ? "Diagnostic Réussi" : "Échec du Diagnostic"}
                  </h5>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ marginTop: '2px', color: (testStatus === 'success' || testStatus === 'error') ? '#22c55e' : '#cbd5e1' }}>
                        {(testStatus === 'success' || testStatus === 'error') ? <CheckCircle2 size={16} /> : <div style={{width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #cbd5e1'}}></div>}
                      </div>
                      <div>
                        <strong>1. Résolution & Ping IP</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Cible : <code>{config.server}</code></p>
                        {testStatus === 'error' && testDetails?.message?.includes('ENOTFOUND') && (
                          <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#b91c1c' }}>Le nom de domaine ou l'IP est introuvable.</div>
                        )}
                      </div>
                    </li>

                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ marginTop: '2px', color: (testStatus === 'success' || (testStatus === 'error' && !testDetails?.message?.match(/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/))) ? '#22c55e' : (testStatus === 'error' ? '#ef4444' : '#cbd5e1') }}>
                        {(testStatus === 'success' || (testStatus === 'error' && !testDetails?.message?.match(/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/))) ? <CheckCircle2 size={16} /> : (testStatus === 'error' ? <AlertTriangle size={16} /> : <div style={{width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #cbd5e1'}}></div>)}
                      </div>
                      <div>
                        <strong>2. Ouverture du Port Réseau</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Port : <code>{config.port}</code></p>
                        {testStatus === 'error' && testDetails?.message?.includes('ECONNREFUSED') && (
                          <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#b91c1c' }}>Le port est fermé ou bloqué par un pare-feu.</div>
                        )}
                        {testStatus === 'error' && testDetails?.message?.includes('ETIMEDOUT') && (
                          <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#b91c1c' }}>Délai d'attente dépassé (Timeout). Le serveur ne répond pas.</div>
                        )}
                      </div>
                    </li>

                    <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ marginTop: '2px', color: testStatus === 'success' ? '#22c55e' : (testStatus === 'error' && !testDetails?.message?.match(/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/) ? '#ef4444' : '#cbd5e1') }}>
                        {testStatus === 'success' ? <CheckCircle2 size={16} /> : (testStatus === 'error' && !testDetails?.message?.match(/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/) ? <AlertTriangle size={16} /> : <div style={{width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #cbd5e1'}}></div>)}
                      </div>
                      <div>
                        <strong>3. Authentification de Service (Bind)</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Compte : <code>{config.bind_dn}</code></p>
                        {testStatus === 'error' && testDetails?.message?.includes('Invalid Credentials') && (
                          <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#b91c1c' }}>Le compte de service ou son mot de passe est incorrect.</div>
                        )}
                        {testStatus === 'error' && testDetails?.message?.includes('NoSuchObject') && (
                          <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#b91c1c' }}>Ce compte n'existe pas dans l'arborescence (Base DN invalide ?).</div>
                        )}
                        {testStatus === 'error' && !testDetails?.message?.match(/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|Invalid Credentials|NoSuchObject/) && (
                          <div style={{ marginTop: '5px', fontSize: '0.85rem', color: '#b91c1c' }}>Erreur LDAP : {testDetails.message}</div>
                        )}
                      </div>
                    </li>

                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="ldap-users-panel">
              <h4>Utilisateurs de l'annuaire ({ldapUsersList.length})</h4>
              <p style={{marginBottom: '20px', color: '#666'}}>Aperçu en temps réel des utilisateurs présents dans l'Active Directory.</p>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <button className="btn-add btn-refresh" onClick={() => setActiveTab('config')} style={{backgroundColor: '#17a2b8'}}><Activity size={16} style={{marginRight: '8px'}} /> Rafraîchir la connexion</button>
                <div className="search-bar">
                  <Search size={16} color="#666" />
                  <input 
                    type="text" 
                    placeholder="Rechercher un utilisateur..." 
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {loadingLdapData ? (
                <div style={{padding: '30px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px dashed #ced4da'}}>
                  Chargement depuis l'Active Directory en cours...
                </div>
              ) : ldapUsersList.length > 0 ? (
                <div className="ldap-table-container">
                  <table className="ldap-table">
                    <thead><tr><th>Identifiant</th><th>Matricule</th><th>Nom Complet</th><th>Email</th></tr></thead>
                    <tbody>
                      {ldapUsersList
                        .filter(u => 
                          (u.identifier || '').toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                          (u.matricule || '').toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                          (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                          (u.first_name + ' ' + u.last_name).toLowerCase().includes(userSearchTerm.toLowerCase())
                        )
                        .map((u, i) => (
                        <tr key={i}>
                          <td>{u.identifier}</td>
                          <td>{u.matricule || 'N/A'}</td>
                          <td>{u.name || (u.first_name + ' ' + u.last_name)}</td>
                          <td>{u.email || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{padding: '30px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px dashed #ced4da'}}>
                  Aucun utilisateur trouvé ou Active Directory injoignable.
                </div>
              )}
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="ldap-groups-panel">
              <h4>Groupes de l'annuaire ({ldapGroupsList.length})</h4>
              <p style={{marginBottom: '20px', color: '#666'}}>Aperçu en temps réel des groupes de sécurité depuis l'Active Directory.</p>
              
              <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '20px'}}>
                <div className="search-bar">
                  <Search size={16} color="#666" />
                  <input 
                    type="text" 
                    placeholder="Rechercher un groupe..." 
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {loadingLdapData ? (
                <div style={{padding: '30px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px dashed #ced4da'}}>
                  Chargement depuis l'Active Directory en cours...
                </div>
              ) : ldapGroupsList.length > 0 ? (
                <div className="ldap-table-container">
                  <table className="ldap-table">
                    <thead><tr><th>Identifiant / DN</th><th>Nom</th><th>Description</th></tr></thead>
                    <tbody>
                      {ldapGroupsList
                        .filter(g => 
                          (g.identifier || '').toLowerCase().includes(groupSearchTerm.toLowerCase()) || 
                          (g.name || '').toLowerCase().includes(groupSearchTerm.toLowerCase()) || 
                          (g.description || '').toLowerCase().includes(groupSearchTerm.toLowerCase())
                        )
                        .map((g, i) => (
                        <tr key={i}>
                          <td>{g.identifier}</td>
                          <td>{g.name}</td>
                          <td>{g.description || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{padding: '30px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px dashed #ced4da'}}>
                  Aucun groupe trouvé ou Active Directory injoignable.
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export default LdapConfigPanel;

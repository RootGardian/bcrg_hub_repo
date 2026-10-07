import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Trash2, Activity, Users, Settings, Database, Server, Info, Search, List, ChevronRight, Eye, EyeOff } from 'lucide-react';
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
  const [testResult, setTestResult] = useState(null);
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
              <h4>Test de connexion à l'annuaire principal</h4>
              <p style={{marginBottom: '20px', color: '#666'}}>Vérifiez si les paramètres fournis permettent de se connecter correctement à l'Active Directory.</p>
              
              <button 
                className="btn-save" 
                onClick={async () => {
                  setTestResult('Connexion en cours...');
                  try {
                    const res = await axios.post(`${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api/ldap-config/test`, config);
                    setTestResult(`✅ Succès : ${res.data.message}`);
                  } catch (err) {
                    setTestResult(`❌ Erreur : ${err.response?.data?.message || err.message}`);
                  }
                }}
              >
                <Activity size={16} /> Lancer le test
              </button>
              
              {testResult && (
                <div style={{
                  marginTop: '20px', padding: '15px', borderRadius: '4px',
                  backgroundColor: testResult.includes('Succès') ? '#e8f5e9' : (testResult.includes('Erreur') ? '#ffebee' : '#e3f2fd'),
                  border: '1px solid',
                  borderColor: testResult.includes('Succès') ? '#c8e6c9' : (testResult.includes('Erreur') ? '#ffcdd2' : '#bbdefb'),
                  color: testResult.includes('Succès') ? '#2e7d32' : (testResult.includes('Erreur') ? '#c62828' : '#1565c0')
                }}>
                  {testResult}
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

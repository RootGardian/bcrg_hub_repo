import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import hubLogo from '../assets/bcrg-hub-svg.svg';
import './Login.css';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/login`, {
        identifier,
        password
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      if (response.data.is_admin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
      
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Erreur de connexion au serveur backend");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Côté gauche (Branding) */}
      <div className="login-left">
        <div className="branding-content">
          <div className="logo-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src={hubLogo} alt="BCRG HUB Logo" className="logo-icon" />
            <h1>BCRG Web Store</h1>
          </div>
        </div>
        
        {/* Motif de points en bas à gauche */}
        <div className="dot-pattern">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="dot"></div>
          ))}
        </div>
      </div>

      {/* Côté droit (Formulaire) */}
      <div className="login-right">
        <div className="form-wrapper">
          <div className="form-header">
            <h2>Connexion</h2>
            <p>Veuillez renseigner vos identifiants pour accéder à l'application.</p>
          </div>

          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>MATRICULE OU EMAIL</label>
              <div className="input-container">
                <User className="input-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="ex: 1234 ou m.diallo@bcrg-guinee.org" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>MOT DE PASSE</label>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="toggle-password" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={isLoading}>
              <LogIn size={18} /> {isLoading ? 'Connexion...' : 'Se Connecter'}
            </button>
          </form>
        </div>

        <div className="login-footer">
          © 2026 Banque Centrale de la République de Guinée. Tous droits réservés.
        </div>
      </div>
    </div>
  );
};

export default Login;

# ⚙️ BCRG HUB — API Backend (Node.js / Express / Cluster)

Ce sous-dossier contient le service API Backend du **BCRG HUB**, responsable de la logique métier, de l'authentification (LDAP & Local), de la cryptographie (JWT RS256 / JWKS) et de la persistance des données.

Pour la documentation globale et l'architecture complète, consultez le [README principal à la racine du projet](../README.md).

---

## 🛠️ Stack Technique Backend

* **Runtime** : Node.js (v18+ ou v20+ LTS)
* **Serveur Web** : Express.js avec support **Cluster multi-cœurs**
* **ORM & Base de Données** : Sequelize sur PostgreSQL 16
* **Sécurité & Cryptographie** :
  * Signatures asymétriques RSA 2048 bits (`RS256`)
  * Hachage de mots de passe : `bcryptjs`
  * Chiffrement des secrets au repos : `AES-256-CBC`
  * Cookies sécurisés : `HttpOnly`, `SameSite: Lax/None`, `Secure`
* **Intégrations Entreprise** :
  * Client Active Directory / LDAP : `activedirectory2`
  * MFA TOTP : `speakeasy` + `qrcode`
* **Sécurité HTTP** : `helmet`, `cors`, `cookie-parser`, `express-rate-limit`

---

## 🚀 Commandes Disponibles

Depuis le dossier `backend` :

```bash
# Installer les dépendances
npm install

# Démarrer le serveur en mode développement (rechargement automatique)
npm run dev

# Démarrer en mode production (avec workers de cluster si configuré)
npm start
```

---

## 📂 Organisation des Dossiers

```text
backend/
├── config/
│   ├── db.js            # Connexion PostgreSQL & Pool Sequelize
│   └── jwtKeys.js       # Gestionnaire de clés RSA (génération ou chargement .pem)
├── controllers/
│   ├── authController.js   # Authentification hybride (LDAP/Local), login, MFA, refresh
│   ├── adminController.js  # Gestion des utilisateurs, rôles et catalogue applicatif
│   ├── appsController.js   # Lancement SSO (302) et récepteur Single Logout (SLO)
│   ├── ldapController.js   # Diagnostic, testeur et configuration Active Directory
│   └── securityController.js # Console BCRG_SIEM et endpoint public JWKS
├── middleware/
│   ├── authMiddleware.js   # Vérification du token Bearer RS256 et injection req.user
│   └── adminMiddleware.js  # Contrôle des privilèges d'administration
├── models/                 # Modèles Sequelize (User, Role, Application, AuditLog, etc.)
├── routes/                 # Déclaration des endpoints REST
├── services/               # Services métier (LDAP, MFA, Audit SIEM, SLO)
├── server.js               # Point d'entrée principal & orchestration du Cluster
├── Dockerfile              # Conteneur Node.js Alpine pour la production
└── package.json
```

---

## 🔑 Points Clés d'Exploitation & Dépannage

### 1. Authentification PostgreSQL (`code: 28P01`)
Si le backend affiche `password authentication failed for user "postgres"`, c'est que le mot de passe dans `.env` ne correspond pas à celui qui a été initialisé lors de la création du volume Docker persistant.  
**Solution** : `docker compose down -v && docker compose up -d`.

### 2. Super Administrateur Initial
Au premier démarrage sur une base de données vierge, le backend crée automatiquement le compte super administrateur avec les valeurs de `DEFAULT_ADMIN_EMAIL` et `DEFAULT_ADMIN_PASSWORD` configurées dans le fichier `.env`.

### 3. Clés Cryptographiques Asymétriques
Si aucune clé RSA n'est fournie dans `config/`, le backend génère automatiquement une paire de clés RSA 2048 bits en mémoire et l'expose publiquement sur `/api/security/.well-known/jwks.json`.

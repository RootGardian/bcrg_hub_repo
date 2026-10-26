# BCRG HUB — Portail d'Authentification Unique (SSO) & Hub Applicatif

> **Banque Centrale de la République de Guinée (BCRG)**  
> Solution d'authentification centralisée, de gestion des identités et des accès (IAM / RBAC), de fédération applicative sécurisée par protocole OpenID Connect (OIDC) / JWKS asymétrique (RS256) et console **BCRG_SIEM** (Threat Intelligence & Supervision SOC en temps réel).

---

## 📑 Table des Matières

1. [Aperçu & Vision Globale](#-aperçu--vision-globale)
2. [Fonctionnalités Clés](#-fonctionnalités-clés)
3. [Console BCRG_SIEM & Threat Intelligence](#-console-bcrg_siem--threat-intelligence)
4. [Architecture Technique & Stack Logicielle](#-architecture-technique--stack-logicielle)
5. [Arborescence du Projet](#-arborescence-du-projet)
6. [Modèle de Sécurité & Cryptographie](#-modèle-de-sécurité--cryptographie)
7. [Fédération OIDC & Endpoint Public JWKS](#-fédération-oidc--endpoint-public-jwks)
8. [Déploiement Conteneurisé (Docker Compose)](#-déploiement-conteneurisé-docker-compose)
9. [Installation & Démarrage en Développement Local](#-installation--démarrage-en-développement-local)
10. [Variables d'Environnement](#-variables-denvironnement)
11. [Référentiel des Points de Terminaison API (Endpoints)](#-référentiel-des-points-de-terminaison-api-endpoints)
12. [Guide d'Intégration pour Applications Métiers (SSO & SLO)](#-guide-dintégration-pour-applications-métiers-sso--slo)
13. [Exploitation, Maintenance & Bonnes Pratiques](#-exploitation-maintenance--bonnes-pratiques)

---

## 🎯 Aperçu & Vision Globale

Le **BCRG HUB** constitue le point d'entrée unique et sécurisé (Single Sign-On) pour l'ensemble des collaborateurs et des applications métiers de la Banque Centrale de la République de Guinée.

### Objectifs Stratégiques :
* **Expérience Utilisateur Unifiée** : Un seul compte et un seul mot de passe pour accéder à toutes les plateformes internes autorisées.
* **Sécurité Renforcée** : Double authentification obligatoire (MFA TOTP), signatures asymétriques RSA 2048 bits (RS256) et rotation automatique des jetons de rafraîchissement (RTR).
* **Supervision Opérationnelle Intégrée (BCRG_SIEM)** : Détection proactive des menaces, corrélation **MITRE ATT&CK**, traçabilité rigoureuse des accès et révocation administrative immédiate en un clic.
* **Gouvernance Centralisée (IAM & RBAC)** : Synchronisation avec l'Active Directory d'entreprise, mapping dynamique des groupes LDAP et gestion fine du catalogue applicatif.

---

## 🚀 Fonctionnalités Clés

### 1. Authentification & Fédération
* **Authentification Hybride Entreprise** : Interconnexion native avec l'**Active Directory (LDAP / LDAPS)** de la BCRG, avec mécanisme de secours sur comptes locaux sécurisés (hachage `bcrypt`).
* **Double Authentification Obligatoire / Optionnelle (MFA TOTP - RFC 6238)** : Compatible avec les applications authentificatrices standards (**Microsoft Authenticator**, Google Authenticator, FreeOTP). Génération dynamique de QR Code, affichage de clé secrète manuelle et saisie segmentée sur 6 chiffres.
* **Single Sign-On (SSO) OIDC / JWKS (RFC 7517)** : Les applications satellites valident localement les jetons JWT signés par la clé privée du HUB sans provoquer de goulot d'étranglement réseau.
* **Jetons Éphémères de Lancement** : Génération de tickets temporaires à usage unique pour rediriger les utilisateurs vers les applications cibles en toute sécurité.

### 2. Gestion des Sessions & Déconnexion Globale
* **Rotation des Refresh Tokens (RTR)** : Tout renouvellement de jeton d'accès (15 min) invalide immédiatement le Refresh Token précédent et en délivre un nouveau.
* **Détection de Vol de Jeton (Token Reuse Detection)** : Si un Refresh Token déjà utilisé ou révoqué est représenté, l'ensemble des sessions de l'utilisateur est instantanément révoqué.
* **Révocation Instantanée (Heartbeat Client 5 s)** : L'administrateur peut révoquer une session active en direct. Le client Web détecte la rupture en moins de 5 secondes et redirige vers l'écran de verrouillage.
* **Single Logout (SLO)** : Clôture coordonnée des sessions sur toutes les applications métiers interconnectées via diffusion d'appels HTTP asynchrones aux endpoints de SLO enregistrés.

### 3. Gestion Administrative & Annuaire
* **Gestion des Utilisateurs & Rôles (RBAC)** : Création manuelle, importation massive par fichier CSV, attribution de permissions par rôle ou groupe.
* **Catalogue Applicatif Intelligent** : Enregistrement des applications internes avec détection automatique des icônes/favicons et spécification des URLs de redirection et de SLO.
* **Module Active Directory / LDAP Avancé** : Testeur de connexion LDAP en direct, exploration des OUs, recherche d'utilisateurs et de groupes AD, et synchronisation des rôles.
* **Ergonomie Sans Alertes Bloquantes** : Dialogues de confirmation et notifications d'actions 100% in-app (aucun `window.confirm` ou `alert` natif du navigateur).

---

## 🛡️ Console BCRG_SIEM & Threat Intelligence

Le sous-onglet **Journal d'Audit & SIEM** intègre un tableau de bord complet de détection des menaces inspiré des standards SOC, directement connecté aux événements de la base PostgreSQL :

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        CONSOLE BCRG_SIEM & THREAT INTELLIGENCE                │
│                         ● EN DIRECT — SURVEILLANCE POSTGRESQL                  │
├──────────────────────┬──────────────────────┬─────────────────┬────────────────┤
│ Événements Totaux    │ Alertes Critiques    │ Agents & Sources│ Taux de Succès │
│      [ 1 420 ]       │    [ 3 ] (Lvl 12+)   │    [ 48 IPs ]   │    [ 98.4 % ]  │
├──────────────────────┴──────────────────────┴─────────────────┴────────────────┤
│ • Distribution Sévérité (Levels 1 à 15 : Critique, Élevé, Moyen/SSO, Info)    │
│ • Matrice MITRE ATT&CK (T1110 Brute Force, T1078 Valid Accounts, T1531...)     │
│ • Filtres Rapides : Tous | Critiques | Élevés | Authentification | SSO | Échecs│
│ • Explorateur d'Événements (BCRG_SIEM Discover) : Vue Tabulaire & Inspecteur   │
│   Document JSON détaillé (horodatage ISO, acteur, IP source, règle, technique) │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Fonctionnalités BCRG_SIEM :
1. **Niveaux de Sévérité Automatisés** :
   * **Level 12–15 (Critique)** : Tentatives d'attaques par force brute, violations d'accès non autorisées.
   * **Level 8–11 (Élevé)** : Actions d'administration sensibles, révocations d'accès, suppressions, purges.
   * **Level 5–7 (Moyen / SSO)** : Événements de fédération SSO, Single Logout (SLO).
   * **Level 1–4 (Information)** : Connexions réussies, consultations de catalogue.
2. **Classification MITRE ATT&CK** : Corrélation automatique de chaque action avec les tactiques et techniques officielles (`T1110`, `T1531`, `T1098`, `T1550.001`, `T1078`).
3. **Moteur de Recherche KQL** : Filtrage dynamique multi-champs (IP, utilisateur, application cible, niveau de sévérité, tag MITRE).
4. **Inspecteur de Document JSON** : Visualisation instantanée de l'événement au format JSON standardisé SIEM et bouton de copie directe dans le presse-papier.
5. **Purge & Export** : Exportation des données d'audit au format CSV exploitable par d'autres systèmes de journalisation.

---

## 🏗️ Architecture Technique & Stack Logicielle

### Schéma d'Architecture

```
                                  [ Navigateur Utilisateur / Poste Agent ]
                                                     │
                                                     │ HTTPS (Port 443 / 80)
                                                     ▼
                                      ┌──────────────────────────────┐
                                      │   Reverse Proxy / Frontend   │
                                      │        Nginx 1.25 Alpine     │
                                      │   (Single Page App React 19) │
                                      └──────────────┬───────────────┘
                                                     │
                                                     │ Reverse Proxy (/api/)
                                                     ▼
                                      ┌──────────────────────────────┐
                                      │        Backend API REST      │
                                      │      Node.js 20 / Express 5  │
                                      │   - Moteur JWT RS256         │
                                      │   - Endpoint JWKS RFC 7517   │
                                      │   - Moteur SLO Broadcast     │
                                      │   - Service Audit BCRG_SIEM  │
                                      └──────┬───────────────┬───────┘
                                             │               │
                            Requêtes SQL/ORM │               │ Interrogation LDAP / LDAPS
                        (Sequelize PostgreSQL)               │ (Port 389 / 636)
                                             ▼               ▼
                        ┌─────────────────────────┐     ┌─────────────────────────┐
                        │   Base de Données       │     │   Active Directory      │
                        │   PostgreSQL 16 Alpine  │     │   (Contrôleur Domaine)  │
                        │   - Utilisateurs/Rôles  │     │   - Annuaire Banque     │
                        │   - Refresh Tokens RTR  │     │   - Groupes Métiers     │
                        │   - Logs BCRG_SIEM      │     └─────────────────────────┘
                        └─────────────────────────┘
                                     ▲
                                     │ Validation autonome des tokens JWT via JWKS
                        ┌────────────┴────────────┐
                        │   Applications Métiers   │
                        │   Fédérées (RH, ERP...) │
                        └─────────────────────────┘
```

### Technologies Utilisées

| Couche | Composant | Technologies & Bibliothèques |
| :--- | :--- | :--- |
| **Frontend** | Interface Utilisateur | React 19, Vite 8, React Router v7, Axios, Lucide React, Vanilla CSS3 (Design System dédié) |
| **Backend** | API REST & Fédération | Node.js 20 LTS, Express 5, Sequelize ORM, jsonwebtoken, otplib, qrcode, helmet, cors |
| **Base de Données** | Persistance relationnelle | PostgreSQL 16 Alpine |
| **Sécurité & Cryptographie** | Signature & Double Auth | Algorithme RSA 2048 (RS256), SHA-256, RFC 7517 (JWKS), RFC 6238 (TOTP) |
| **Annuaire d'Entreprise** | Authentification centralisée | Microsoft Active Directory via LDAP / LDAPS (`ldapjs`, `ldap-authentication`) |
| **Conteneurisation** | Déploiement & Orchestration | Docker, Docker Compose v2, Nginx Alpine Multi-stage build |

---

## 📂 Arborescence du Projet

```
BCRG_HUB/
├── .env.docker.example          # Modèle de configuration pour le déploiement Docker
├── docker-compose.yml           # Définition des services conteneurisés (PostgreSQL, Backend, Frontend Nginx)
├── docker-compose.prod.yml      # Profil Docker optimisé pour la production
├── deploy_docker.bat            # Script de déploiement en 1 clic pour environnements Windows
├── deploy_docker.sh             # Script de déploiement en 1 clic pour environnements Linux / macOS
├── README.md                    # Documentation technique exhaustive du projet
│
├── backend/
│   ├── config/
│   │   ├── db.js                # Connexion Sequelize à PostgreSQL
│   │   └── jwtKeys.js           # Gestionnaire et rotateur de clés RSA (private.pem / public.pem)
│   ├── controllers/
│   │   ├── adminController.js   # Pilotage des utilisateurs, rôles, applications et affectations
│   │   ├── appsController.js    # Gestion du catalogue utilisateur, lancement SSO et sessions
│   │   ├── authController.js    # Authentification locale/AD, vérification MFA, refresh et déconnexion
│   │   ├── ldapController.js    # Configuration, test de liaison AD et recherche annuaire
│   │   └── securityController.js# Métriques temps réel, logs BCRG_SIEM, révocation et JWKS
│   ├── middleware/
│   │   └── authMiddleware.js    # Protection des routes (JWT Bearer) et contrôle du rôle Administrateur
│   ├── models/
│   │   ├── Application.js       # Entités des applications interconnectées
│   │   ├── AuditLog.js          # Table d'audit et historique des événements BCRG_SIEM
│   │   ├── LdapConfig.js        # Paramètres de connexion au contrôleur Active Directory
│   │   ├── RefreshToken.js      # Stockage sécurisé des jetons rotatifs RTR
│   │   ├── Role.js              # Définition des profils et habilitations RBAC
│   │   ├── SecuritySetting.js   # Paramètres globaux de sécurité (MFA forcé, rate-limit)
│   │   ├── User.js              # Comptes utilisateurs locaux et synchronisés AD
│   │   ├── UserAppSession.js    # Sessions applicatives SSO actives pour le Single Logout (SLO)
│   │   └── index.js             # Initialisation et associations relationnelles Sequelize
│   ├── routes/
│   │   ├── adminRoutes.js       # Routes `/api/admin/*`
│   │   ├── appsRoutes.js        # Routes `/api/apps/*`
│   │   ├── authRoutes.js        # Routes `/api/auth/*`
│   │   ├── ldapRoutes.js        # Routes `/api/ldap/*`
│   │   └── securityRoutes.js    # Routes `/api/security/*`
│   ├── services/
│   │   ├── auditService.js      # Enregistrement centralisé des événements d'audit
│   │   ├── ldapService.js       # Client d'authentification et de requêtes Active Directory
│   │   ├── mfaService.js        # Génération et vérification cryptographique TOTP
│   │   └── sloService.js        # Moteur de diffusion des signaux Single Logout
│   ├── Dockerfile               # Image de conteneurisation du Backend API
│   ├── server.js                # Point d'entrée de l'application Express
│   └── package.json
│
└── frontend/
    ├── public/                  # Favicons, manifest et assets statiques
    ├── src/
    │   ├── assets/              # Logo officiel BCRG et emblèmes vectoriels
    │   ├── config/
    │   │   └── api.js           # Détection dynamique de l'URL API de base (proxy / directe)
    │   ├── pages/
    │   │   ├── AdminDashboard.jsx # Synthèse administrative et raccourcis
    │   │   ├── AdminPanel.jsx   # Gestion globale (utilisateurs, catalogue apps, rôles, CSV)
    │   │   ├── Dashboard.jsx    # Portail applicatif pour les agents de la Banque
    │   │   ├── LdapConfigPanel.jsx # Interface de configuration et test de l'Active Directory
    │   │   ├── Login.jsx        # Écran de connexion sécurisé avec saisie MFA TOTP
    │   │   ├── SecurityPanel.jsx# Console BCRG_SIEM, surveillance SOC et audit temps réel
    │   │   └── *.css            # Feuilles de style dédiées par vue
    │   ├── App.jsx              # Routage React, intercepteur Axios et Heartbeat sécurité
    │   ├── main.jsx             # Point d'entrée React 19
    │   └── index.css            # Thème global et design system BCRG
    ├── Dockerfile               # Build multi-stage Vite + Serveur Nginx Alpine
    ├── nginx.conf               # Configuration Nginx de production (proxy API et routage SPA)
    ├── vite.config.js           # Configuration Vite de développement
    └── package.json
```

---

## 🔐 Modèle de Sécurité & Cryptographie

### 1. Cycle de Vie des Jetons de Session
```
[ Authentification Réussie ]
            │
            ├─► Access Token (Durée : 15 min)
            │   - Signé numériquement en RS256 (Clé privée RSA 2048 bits du HUB)
            │   - Transmis dans l'en-tête HTTP : `Authorization: Bearer <token>`
            │
            └─► Refresh Token (Durée : 7 jours)
                - Chaîne aléatoire de 96 caractères hexadécimaux
                - Stocké en cookie HttpOnly / SameSite: Strict
                - Enregistré dans la table PostgreSQL `refresh_tokens`
```

### 2. Détection de Réutilisation de Jeton (Token Reuse Detection)
Chaque demande de renouvellement sur `/api/auth/refresh` opère une rotation immédiate :
* Si un jeton déjà révoqué est soumis à nouveau, le serveur détecte un potentiel vol de session.
* **Réaction défensive automatique** : Toutes les sessions associées à ce compte sont immédiatement révoquées et un événement de sévérité **Level 12 (Critique)** est consigné dans la console **BCRG_SIEM**.

### 3. Double Authentification (MFA TOTP - RFC 6238)
* Utilisation d'un secret en base32 propre à chaque collaborateur.
* Compatible sans surcoût avec l'application mobile standard déployée à la Banque Centrale (**Microsoft Authenticator**).
* Fenêtre de tolérance temporelle de ±1 pas (30 secondes) pour absorber d'éventuels décalages d'horloge entre le terminal et le serveur.

---

## 🌐 Fédération OIDC & Endpoint Public JWKS

Pour permettre à n'importe quelle application métier (développée en Java, .NET, PHP, Python, Node.js ou Go) de vérifier la validité d'une session sans surcharger l'API du HUB, le serveur expose un endpoint public conforme au standard **RFC 7517 (JSON Web Key Set)** :

* **URL Publique du JWKS** :  
  `http://<IP_OU_DOMAINE_HUB>/api/security/.well-known/jwks.json`

* **Exemple de Réponse :**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "bcrg-hub-rsa-key-1",
      "n": "vM3_xK1...<module_rsa_en_base64url>...w8Q",
      "e": "AQAB"
    }
  ]
}
```

---

## 🐳 Déploiement Conteneurisé (Docker Compose)

Le déploiement complet de la solution (**Base de Données PostgreSQL 16 + Backend Express Cluster + Frontend Nginx**) s'effectue facilement grâce à Docker Compose.

---

### 1. Déploiement Initial sur Serveur Linux / Production

#### Étape A : Cloner le projet
```bash
git clone https://github.com/RootGardian/bcrg_hub_repo.git
cd bcrg_hub_repo
```

#### Étape B : Configurer les Variables d'Environnement
Pour le déploiement Docker, Compose lit impérativement le fichier **`.env` situé à la racine du projet** :
```bash
cp .env.docker.example .env
```

> ⚠️ **Note Importante sur les fichiers d'environnement** :
> * **`.env` (à la racine)** : C'est l'unique fichier lu par `docker-compose.yml`. Il configure à la fois PostgreSQL, le Backend et le port public du Frontend.
> * **Pas besoin de spécifier l'URL du Backend pour le Frontend** : Le conteneur Nginx agit comme **Reverse-Proxy**. Le navigateur communique uniquement sur le port public (ex: `3001`), et Nginx transmet automatiquement en interne les requêtes `/api/*` vers le conteneur `backend:5001`.

*(Optionnel)* Personnalisez les mots de passe et clés dans `.env` :
```bash
nano .env
```

#### Étape C : Lancer le Déploiement
Utilisez le script automatisé fourni :
```bash
chmod +x deploy_docker.sh
./deploy_docker.sh
```

Ou exécutez directement :
```bash
docker compose up -d --build
```

---

### 2. Déploiement en 1 Clic sous Windows (Poste Local)
Double-cliquez sur le script fourni ou lancez dans PowerShell / CMD :
```cmd
.\deploy_docker.bat
```
Ce script vérifie la présence de Docker, copie automatiquement `.env.docker.example` vers `.env` si nécessaire, compile les images et lance les conteneurs.

---

### 3. Workflow de Mise à Jour (Développement ➔ Production)

Le Frontend utilise désormais une **stratégie de pré-compilation locale (`dist/`)**. Cela permet au serveur de production de déployer l'image Nginx en 3 secondes sans avoir besoin d'accès Internet vers le registre public npm.

#### Côté Poste Développeur (Windows) :
Lorsqu'une modification est effectuée sur le code du frontend :
```powershell
# 1. Compiler les sources React avec Vite
cd frontend
npm run build
cd ..

# 2. Commiter le code source et le bundle dist
git add -f frontend/dist
git add frontend/src
git commit -m "feat: mise à jour des interfaces"
git push origin main
```

#### Côté Serveur de Production (Linux) :
```bash
cd ~/bcrg_hub_repo
git pull
docker compose up -d --build frontend
```

---

### 4. Procédure de Réinitialisation Complète (Clean Re-deploy)

Si vous devez supprimer intégralement les conteneurs, le cache Docker et la base de données pour repartir de zéro :

```bash
# 1. Stopper les conteneurs ET supprimer les volumes persistants
cd ~/bcrg_hub_repo
docker compose down -v --rmi local

# 2. Vider le cache des couches Docker obsolètes
docker builder prune -af

# 3. Supprimer le dossier du projet
cd ~
rm -rf bcrg_hub_repo

# 4. Re-cloner et relancer proprement
git clone https://github.com/RootGardian/bcrg_hub_repo.git
cd bcrg_hub_repo
cp .env.docker.example .env
chmod +x deploy_docker.sh
./deploy_docker.sh
```

---

### 5. Accès aux Services & Identifiants Initiaux

* **Portail Web BCRG HUB** : `http://<IP_SERVEUR>:3001` (ou port configuré via `PORT` dans `.env`)
* **API Backend directe (si exposée)** : `http://<IP_SERVEUR>:5001`
* **Compte Super Administrateur Initial** (généré automatiquement en base au premier démarrage) :
  * **Email** : `sysadmin@bcrg-guinee.org` (ou valeur de `DEFAULT_ADMIN_EMAIL`)
  * **Mot de passe** : `Bcrg@Admin2026!` (ou valeur de `DEFAULT_ADMIN_PASSWORD`)
  * **Matricule** : `0001`

---

## 🚨 Guide de Résolution des Erreurs Fréquentes (Troubleshooting / FAQ)

Voici la synthèse des anomalies rencontrées lors des déploiements et leurs solutions immédiates :

### ❌ Erreur 1 : `error: password authentication failed for user "postgres" (code 28P01)`
* **Symptôme** : Le conteneur `bcrg-backend` redémarre en boucle et affiche cette erreur dans `docker compose logs backend`. Le frontend répond `404` ou `502`.
* **Cause** : PostgreSQL n'initialise son mot de passe administrateur dans son volume de données (`bcrg_postgres_data`) **qu'une seule fois**, lors de sa première création. Si vous changez `DB_PASSWORD` dans `.env` après coup, PostgreSQL continue d'utiliser l'ancien mot de passe du volume existant, provoquant un refus de connexion du backend.
* **Solution** : Supprimer le volume persistant obsolète pour forcer PostgreSQL à réinitialiser le mot de passe défini dans `.env` :
  ```bash
  docker compose down -v
  docker compose up -d
  ```

---

### ❌ Erreur 2 : `sh: vite: not found` ou `npm error ETIMEDOUT / registry.npmjs.org`
* **Symptôme** : L'étape de build du conteneur `frontend` échoue lors de `RUN npm install` ou `RUN npm run build`.
* **Cause** : 
  1. Le serveur de production est situé sur un réseau d'entreprise/intranet restreint (bloquant l'accès direct à `registry.npmjs.org`).
  2. Ou Docker réutilise une ancienne couche en cache (`CACHED [frontend builder]`).
* **Solution** :
  1. Utilisez la version actuelle du projet qui s'appuie sur le dossier `dist/` pré-compilé localement. Le `Dockerfile` frontend ne fait plus de `npm install` sur le serveur et se contente de servir les fichiers statiques via Nginx.
  2. Si besoin de purger le cache Docker local sur le serveur :
     ```bash
     docker builder prune -af
     docker compose build --no-cache frontend
     ```

---

### ❌ Erreur 3 : `connect() failed (113: Host is unreachable) while connecting to upstream` ou erreur 404 à la connexion
* **Symptôme** : Lorsque vous cliquez sur "Se Connecter" sur la page de login, un message rouge *"Erreur de connexion au serveur backend"* s'affiche et la console indique `404 Not Found` sur `/api/auth/login`.
* **Cause** : Le conteneur `bcrg-backend` a crashé (généralement à cause de l'Erreur 1 de base de données). Nginx ne parvient pas à joindre le backend sur le réseau interne Docker (`http://backend:5001`), cherche à renvoyer sa page d'erreur `50x.html` (absente), et renvoie un 404.
* **Solution** :
  1. Vérifier la raison du crash du backend :
     ```bash
     docker compose logs --tail=50 backend
     ```
  2. Résoudre le souci de base de données (voir Erreur 1 ci-dessus). Dès que le backend démarre (`Server running on port 5001`), la connexion fonctionne instantanément.

---

### ❌ Erreur 4 : La page web ne prend pas en compte les dernières modifications
* **Symptôme** : Vous avez redéployé le conteneur frontend, mais l'ancien affichage persiste sur votre écran.
* **Cause** : Le navigateur web met en cache agressif les fichiers JavaScript et CSS statiques.
* **Solution** : Effectuez un rechargement forcé sans cache dans votre navigateur avec **`Ctrl + F5`** (ou `Cmd + Shift + R` sur Mac).

---

## 💻 Installation & Démarrage en Développement Local

Si vous souhaitez exécuter le projet sans Docker pour le développement :

### Prérequis
* **Node.js** version 18.x ou 20.x LTS
* **PostgreSQL** version 14 ou supérieure opérationnel
* **Git**

### Étape 1 : Cloner le dépôt
```bash
git clone https://github.com/RootGardian/bcrg_hub_repo.git
cd bcrg_hub_repo
```

### Étape 2 : Configuration & Lancement du Backend
```bash
cd backend
npm install

# Créer le fichier d'environnement local
cp .env.example .env
# Ajustez vos paramètres DB_USER, DB_PASSWORD et DB_NAME dans .env

# Démarrer le serveur en mode rechargement à chaud
npm run dev
```
Le backend s'initialise sur `http://localhost:5001` et synchronise automatiquement les tables PostgreSQL via Sequelize.

### Étape 3 : Configuration & Lancement du Frontend
Dans un second terminal :
```bash
cd frontend
npm install

# Démarrer le serveur de développement Vite
npm run dev
```
L'interface utilisateur s'ouvre sur `http://localhost:5173`. Le proxy Vite redirige automatiquement les appels `/api/*` vers le port `5001`.

---

## ⚙️ Variables d'Environnement

Le fichier `.env` (ou `.env.docker.example`) contrôle l'ensemble des paramètres applicatifs :

| Variable | Description | Valeur par défaut |
| :--- | :--- | :--- |
| `PORT` | Port d'écoute public du portail Web (Nginx) | `80` |
| `NODE_ENV` | Environnement d'exécution (`development` ou `production`) | `production` |
| `DB_HOST` | Hôte du serveur PostgreSQL (`postgres` sous Docker) | `postgres` |
| `DB_PORT` | Port d'écoute PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base de données | `bcrg_hub` |
| `DB_USER` | Utilisateur PostgreSQL | `postgres` |
| `DB_PASSWORD` | Mot de passe de la base de données | `BcrgSecureDb2026!` |
| `JWT_SECRET` | Clé secrète de secours pour tokens symétriques | *(chaîne aléatoire complexe)* |
| `ENCRYPTION_KEY` | Clé AES 256 bits (32 octets) pour le chiffrement des secrets au repos | *(chaîne hexadécimale de 32 caractères)* |
| `DEFAULT_ADMIN_EMAIL` | Adresse email du compte Super Admin créé au 1er démarrage | `admin@bcrg-guinee.org` |
| `DEFAULT_ADMIN_PASSWORD` | Mot de passe initial du Super Admin | `Bcrg@Admin2026!` |
| `DEFAULT_ADMIN_MATRICULE` | Matricule interne du Super Admin | `ADMIN001` |
| `USE_HTTPS` | Active les cookies sécurisés `Secure` et `SameSite: Strict` | `false` (mettre `true` avec SSL) |
| `ENABLE_CLUSTER` | Active le mode multi-cœur pour les performances sous Docker | `true` |

---

## 📡 Référentiel des Points de Terminaison API (Endpoints)

### 1. Authentification & Sessions (`/api/auth`)
| Méthode | Endpoint | Accès | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authentification initiale (AD LDAP ou Base locale) |
| `POST` | `/api/auth/mfa/verify` | Public | Validation du code TOTP Microsoft Authenticator (6 chiffres) |
| `POST` | `/api/auth/refresh` | Public | Renouvellement transparent de l'Access Token (RTR) |
| `POST` | `/api/auth/logout` | Connecté | Clôture de la session du HUB et déclenchement du Single Logout |
| `GET` | `/api/auth/me` | Connecté | Informations sur l'utilisateur actif et son profil |
| `PUT` | `/api/auth/change-password` | Connecté | Modification du mot de passe utilisateur |

### 2. Console BCRG_SIEM & Sécurité (`/api/security`)
| Méthode | Endpoint | Accès | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/security/.well-known/jwks.json` | Public | Clé publique JWKS (RFC 7517) pour validation des tokens |
| `GET` | `/api/security/status` | Admin | Métriques SOC en temps réel (sessions actives, taux d'accès) |
| `GET` | `/api/security/audit-logs` | Admin | Récupération paginée des événements d'audit pour BCRG_SIEM |
| `DELETE` | `/api/security/audit-logs` | Admin | Purge complète des logs de sécurité après archivage |
| `DELETE` | `/api/security/audit-logs/:id` | Admin | Suppression unitaire d'une entrée de log |
| `POST` | `/api/security/revoke-session/:id` | Admin | Révocation forcée et immédiate d'une session utilisateur |
| `POST` | `/api/security/revoke-app-session/:id`| Admin | Déconnexion forcée d'une session applicative SSO spécifique |
| `POST` | `/api/security/test-slo` | Admin | Envoi d'un signal de test de Single Logout à une URL tierce |
| `GET` | `/api/security/settings` | Admin | Consultation de la politique de sécurité (MFA forcé, etc.) |
| `PUT` | `/api/security/settings` | Admin | Mise à jour des paramètres de sécurité de la Banque |

### 3. Gestion du Parc Applicatif (`/api/apps`)
| Méthode | Endpoint | Accès | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/apps/my-apps` | Connecté | Liste des applications métiers autorisées pour l'utilisateur connecté |
| `GET` | `/api/apps/active-sessions` | Connecté | Liste des sessions SSO actives ouvertes par l'utilisateur |
| `POST` | `/api/apps/:id/launch` | Connecté | Génération d'un token éphémère de redirection sécurisée |
| `POST` | `/api/apps/slo-receiver` | Public | Endpoint récepteur de démonstration / test de Single Logout |

### 4. Administration & Gouvernance (`/api/admin`)
| Méthode | Endpoint | Accès | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Admin | Statistiques de pilotage (comptes, rôles, applications) |
| `GET` | `/api/admin/users` | Admin | Annuaire des utilisateurs et état de leurs droits |
| `POST` | `/api/admin/users` | Admin | Création d'un compte utilisateur |
| `PUT` | `/api/admin/users/:id` | Admin | Modification des informations et rôles d'un utilisateur |
| `DELETE` | `/api/admin/users/:id` | Admin | Suppression d'un compte utilisateur |
| `POST` | `/api/admin/users/import` | Admin | Importation massive d'utilisateurs via fichier CSV |
| `POST` | `/api/admin/users/assign-app` | Admin | Habilitation nominative d'un utilisateur sur une application |
| `POST` | `/api/admin/users/:id/revoke-sessions`| Admin | Invalidation de tous les tokens et sessions d'un utilisateur |
| `GET` | `/api/admin/applications` | Admin | Gestion du catalogue complet des applications métiers |
| `POST` | `/api/admin/applications` | Admin | Déclaration d'une nouvelle application interconnectée |
| `PUT` | `/api/admin/applications/:id` | Admin | Mise à jour d'une fiche applicative |
| `DELETE` | `/api/admin/applications/:id` | Admin | Retrait d'une application du catalogue |
| `GET` | `/api/admin/roles` | Admin | Liste des rôles RBAC configurés |
| `POST` | `/api/admin/roles` | Admin | Création d'un rôle métier |
| `POST` | `/api/admin/roles/assign-app` | Admin | Association d'une application à un rôle RBAC |
| `POST` | `/api/admin/roles/assign-ldap` | Admin | Mapping entre un groupe Active Directory et un rôle du HUB |
| `DELETE` | `/api/admin/roles/mapping/:id` | Admin | Suppression d'un mapping AD/Rôle |

### 5. Intégration Active Directory (`/api/ldap`)
| Méthode | Endpoint | Accès | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/ldap` | Admin | Récupération des profils de connexion LDAP enregistrés |
| `POST` | `/api/ldap` | Admin | Création d'une configuration de contrôleur de domaine |
| `PUT` | `/api/ldap/:id` | Admin | Mise à jour des paramètres du contrôleur de domaine |
| `DELETE` | `/api/ldap/:id` | Admin | Suppression d'une configuration LDAP |
| `POST` | `/api/ldap/test` | Admin | Test en direct de la liaison réseau et du Bind LDAP |
| `GET` | `/api/ldap/users` | Admin | Recherche d'utilisateurs dans l'arborescence Active Directory |
| `GET` | `/api/ldap/groups` | Admin | Découverte des groupes de sécurité Active Directory |
| `GET` | `/api/ldap/ous` | Admin | Découverte des Unités Organisationnelles (OU) |

---

## 🛠️ Guide d'Intégration pour Applications Métiers (SSO & SLO)

Lorsqu'une application interne de la Banque Centrale doit s'interconnecter au **BCRG HUB**, deux volets techniques sont à implémenter :

### Volet 1 : Validation Autonome du Jeton JWT (Single Sign-On)
L'application consomme la clé publique JWKS exposée par le HUB pour vérifier la signature des requêtes entrantes sans appel API synchrone bloquant.

#### Exemple d'implémentation en Node.js / Express :
```javascript
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// 1. Initialisation du client JWKS avec mise en cache locale
const client = jwksClient({
  jwksUri: 'http://<IP_SERVEUR_HUB>/api/security/.well-known/jwks.json',
  cache: true,
  cacheMaxAge: 86400000, // 24 heures
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err, null);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// 2. Middleware de validation des routes protégées de votre application
function verifyBcrgHubToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Jeton d\'authentification BCRG requis' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Jeton BCRG invalide, expiré ou révoqué' });
    }
    // Injection des données de l'agent dans la requête
    req.agent = decoded;
    next();
  });
}

// Exemple d'utilisation sur une route métier
app.get('/api/dossiers-confidentiels', verifyBcrgHubToken, (req, res) => {
  res.json({ message: `Bienvenue ${req.agent.email}`, departement: req.agent.department });
});
```

#### Exemple d'implémentation en Python / FastAPI :
```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import PyJWKClient, decode

app = FastAPI()
security = HTTPBearer()

JWKS_URL = "http://<IP_SERVEUR_HUB>/api/security/.well-known/jwks.json"
jwks_client = PyJWKClient(JWKS_URL)

async def get_current_bcrg_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        data = decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_exp": True}
        )
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Jeton BCRG non valide : {str(e)}"
        )

@app.get("/donnees-financieres")
def read_data(user: dict = Depends(get_current_bcrg_user)):
    return {"statut": "autorisé", "agent": user.get("matricule")}
```

---

### Volet 2 : Réception du Signal Single Logout (SLO)
Lorsqu'un agent se déconnecte du portail ou que sa session est révoquée par un administrateur, le HUB transmet une requête `POST` à l'URL de SLO renseignée dans la fiche de l'application :

* **Payload HTTP transmis par le HUB lors du SLO :**
```json
{
  "event": "SINGLE_LOGOUT",
  "userId": 14,
  "matricule": "BCRG0842",
  "email": "agent@bcrg-guinee.org",
  "timestamp": "2026-10-15T12:00:00.000Z"
}
```
* **Attendu côté application cible** : Clôturer la session locale correspondante (invalider le cookie de session ou le cache Redis) et renvoyer un statut `HTTP 200 OK`.

---

## 🔒 Exploitation, Maintenance & Bonnes Pratiques

### 1. Recommandations de Déploiement en Production
1. **Terminaison SSL/TLS Obligatoire** :
   Déployer un certificat d'entreprise valide (émis par l'autorité de certification de la Banque Centrale) sur le reverse proxy Nginx. Dans `.env`, basculer impérativement `USE_HTTPS=true`.
2. **Cloisonnement Réseau (VLAN Sécurité)** :
   * Le port **443** (ou 80) doit être le seul point de contact exposé aux postes clients.
   * Le port **5432** de PostgreSQL doit être confiné au réseau privé interne Docker (`bcrg-net`).
   * Les flux vers le contrôleur Active Directory (ports **389** ou **636**) doivent être restreints par pare-feu aux adresses IP du serveur HUB.
3. **Plan de Reprise d'Activité (Sauvegarde PostgreSQL)** :
   Planifier une sauvegarde périodique de la base de données via `crontab` ou tâche planifiée :
   ```bash
   docker exec bcrg-postgres pg_dump -U postgres bcrg_hub > /sauvegardes/bcrg_hub_$(date +%Y%m%d).sql
   ```
4. **Synchronisation d'Horloge Réseau (NTP)** :
   Assurer la synchronisation NTP permanente de tous les serveurs hôtes afin de prévenir tout désalignement de calcul des codes MFA TOTP.

---

## 🏛️ Mentions Légales & Propriété Intellectuelle

**Direction des Systèmes d'Information (DSI)**  
**Banque Centrale de la République de Guinée (BCRG)**  
3 Avenue de la République, BP 692, Kaloum, Conakry, République de Guinée.

*Tous droits réservés. Usage strictement réservé aux services internes de la Banque Centrale et aux partenaires dûment habilités.*

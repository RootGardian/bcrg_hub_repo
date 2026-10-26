# 💻 BCRG HUB — Interface Utilisateur Frontend

Ce sous-dossier contient l'application cliente Single Page Application (SPA) du **BCRG HUB** développée avec **React 19** et **Vite**.

Pour la documentation globale du projet, l'architecture et le guide d'installation complet, consultez le [README principal à la racine du projet](../README.md).

---

## 🛠️ Stack Technique Frontend

* **Framework** : React 19
* **Outil de Bundling & Dev Server** : Vite 8
* **Routage** : React Router v7
* **Client HTTP** : Axios (avec intercepteurs automatiques pour tokens Bearer, rotation de session et déconnexion forcée)
* **Icônes** : Lucide React
* **Styling** : CSS moderne (Vanilla CSS personnalisé, Design System BCRG)

---

## 🚀 Commandes Disponibles

Depuis le dossier `frontend` :

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement avec support réseau local (--host)
npm run dev

# Compiler le projet pour la production (génère le dossier dist/)
npm run build

# Prévisualiser le build de production localement
npm run preview

# Linter le code source avec Oxlint
npm run lint
```

---

## 🐳 Architecture Déploiement Docker & Nginx Reverse-Proxy

Pour garantir un déploiement fiable même sur des serveurs sans accès Internet direct (intranet BCRG) :

1. **Stratégie de Pré-compilation (`dist/`)** :
   Le build de production (`npm run build`) est exécuté sur le poste développeur. Le dossier `dist/` qui en résulte est versionné dans Git. Le `Dockerfile` du frontend se contente de copier ce dossier dans une image légère `nginx:1.25-alpine`, évitant ainsi tout timeout npm sur le serveur.

2. **Routage Relatif & Reverse-Proxy** :
   Le frontend n'a pas besoin de variable d'environnement `VITE_API_URL` en mode Docker. Nginx écoute sur le port public configuré (ex: `3001`) et relaie automatiquement toutes les requêtes débutant par `/api/` en interne vers le conteneur `backend:5001`.

---

## 📱 Fonctionnalités de l'Interface

* **Écran de Connexion & MFA** :
  - Support des identifiants (matricule ou email).
  - Validation Microsoft Authenticator (TOTP) avec saisie segmentée à 6 chiffres, focus automatique et QR code.
* **Tableau de Bord Collaborateur (Design Ultra-Moderne & Compact)** :
  - Cartes applicatives épurées conformes aux standards ergonomiques modernes.
  - Détection automatique et intelligente des icônes selon la sémantique de l'outil (Parking, RH, Santé, Finance, Documents...).
  - Support des logos personnalisés (URL spécifiée dans l'Admin Panel).
  - Heartbeat de sécurité en arrière-plan pour synchronisation des rôles en direct.
* **Tableau de Bord Administrateur** :
  - Métriques et statistiques en temps réel.
  - Gestion des utilisateurs et de leurs droits.
  - Gestion des applications et configuration Single Logout (SLO).
  - Mapping dynamique des groupes Active Directory (LDAP).
  - Panneau de sécurité & monitoring de la fédération OIDC/JWKS.
  - Modales d'action et de confirmation intégrées 100% in-app.

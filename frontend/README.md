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

# Compiler le projet pour la production
npm run build

# Prévisualiser le build de production localement
npm run preview

# Linter le code source avec Oxlint
npm run lint
```

---

## 📱 Fonctionnalités de l'Interface

* **Écran de Connexion & MFA** :
  - Support des identifiants (matricule ou email).
  - Validation Microsoft Authenticator (TOTP) avec saisie segmentée à 6 chiffres, focus automatique et QR code.
* **Tableau de Bord Collaborateur** :
  - Catalogue des applications autorisées avec logos dynamiques.
  - Heartbeat de sécurité en arrière-plan (5s) pour synchronisation des rôles en direct.
* **Tableau de Bord Administrateur** :
  - Métriques et statistiques en temps réel.
  - Gestion des utilisateurs et de leurs droits.
  - Gestion des applications et configuration Single Logout (SLO).
  - Mapping dynamique des groupes Active Directory (LDAP).
  - Panneau de sécurité & monitoring de la fédération OIDC/JWKS.
  - Modales d'action et de confirmation intégrées 100% in-app.

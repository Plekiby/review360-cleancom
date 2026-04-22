# 🚀 Review360N - Système de Suivi BTS MCO SaaS

> Finalisation & commercialisation SaaS de l'application de suivi pour organismes de formation

**Client**: SARL Clean Com  
**Budget**: 600€ HT (devis M2604-XOELN)  
**Durée**: 4 semaines @ 2j/semaine  
**Stack**: Node.js + React + PostgreSQL + O2switch

---

## 📋 QUICKSTART

### 1. Cloner & Setup Local

```bash
# Clone le repo
git clone <your-repo> && cd review360-cleancom

# Backend
cd backend
cp .env.example .env
# Éditer .env avec tes credentials locales PostgreSQL
npm install
npm run migrate  # Crée tables
npm run seed     # Données de test

# Terminal 2 - Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev

# Terminal 3 - Backend démarré
cd backend
npm run dev
# Ou pour prod: npm start
```

### 2. Vérifier la config

```bash
# Health check
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}

# Frontend
http://localhost:5173 (Vite)
```

---

## 📁 STRUCTURE REPO

```
review360-cleancom/
├── backend/
│   ├── src/
│   │   ├── server.js           # Express entry point
│   │   ├── config/
│   │   │   ├── db.js           # PostgreSQL connection
│   │   │   └── auth.js         # JWT config
│   │   ├── routes/
│   │   │   ├── auth.js         # /api/auth/*
│   │   │   ├── classes.js      # /api/classes/*
│   │   │   ├── students.js     # /api/students/*
│   │   │   ├── sessions.js     # /api/sessions/*
│   │   │   └── validations.js  # /api/validations/*
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification
│   │   │   └── errorHandler.js # Global error catcher
│   │   ├── utils/
│   │   │   ├── excelImport.js  # Import étudiant Excel
│   │   │   ├── alertGenerator.js # Logique VERT/ORANGE/ROUGE
│   │   │   └── validators.js   # Input validation
│   │   └── db/
│   │       ├── schema.sql      # CREATE TABLE + vues
│   │       └── seed.sql        # Données de test
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginPage.jsx       # Page auth
│   │   │   ├── ClassesList.jsx     # Dashboard admin
│   │   │   ├── StudentDetail.jsx   # Détail étudiant (fiches + sessions)
│   │   │   ├── FormValidation.jsx  # Grille 3 checkboxes validation
│   │   │   └── DashboardFormateur.jsx # KPIs + alertes formateur
│   │   ├── lib/
│   │   │   └── api.js         # Client API avec JWT auto-refresh
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── docs/
│   ├── API.md              # Endpoints documentation
│   ├── DEPLOYMENT.md       # Procédure O2switch
│   └── USER_GUIDE.md       # Guide utilisateur formateurs
├── PLAN_EXÉCUTION.md       # Ce plan détaillé
├── .gitignore
└── README.md (ce fichier)
```

---

## 🔑 VARIABLES ESSENTIELLES (.env backend)

```env
# DEV LOCAL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=review360_dev
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=dev_secret_key_min_32_chars_long
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# PRODUCTION O2switch (complété à J8)
DB_HOST=db.o2switch.fr
DB_USER=cleancom_u123
DB_PASSWORD=***secure***
JWT_SECRET=***production_secret***
NODE_ENV=production
FRONTEND_URL=https://suivi360.cleancom.fr
```

---

## 🗄️ SETUP PostgreSQL (Windows/Mac/Linux)

### Windows (avec WSL2)
```bash
# Installer PostgreSQL (si pas déjà)
wsl
sudo apt-get update && sudo apt-get install postgresql postgresql-contrib

# Démarrer service
sudo service postgresql start

# Créer user & DB
sudo -u postgres psql
# Dans psql:
CREATE USER review360 WITH PASSWORD 'dev_password';
CREATE DATABASE review360_dev OWNER review360;
\q

# Tester connexion
psql -U review360 -d review360_dev
```

### Mac (Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
createdb review360_dev
createuser -P review360  # Mot de passe: dev_password
```

### Linux (Ubuntu)
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb review360_dev
sudo -u postgres createuser -P review360
```

### Importer le schema
```bash
# Une fois DB créée
psql -U review360 -d review360_dev < backend/src/db/schema.sql
psql -U review360 -d review360_dev < backend/src/db/seed.sql
```

---

## 🔐 AUTH FLOW

```
1. POST /api/auth/login {email, password}
   → Retourne JWT + user object
   
2. Client stocke JWT dans localStorage
3. Chaque requête: Authorization: Bearer <JWT>
4. Middleware auth.js vérifie JWT + school_id
5. Si JWT expiré: refresh automatique (optionnel)
```

**Utilisateurs de test après seed:**
```
Admin:    admin@cleancom.fr / password123
Teacher1: formateur1@cleancom.fr / password123
Teacher2: formateur2@cleancom.fr / password123
```

---

## 📚 ENDPOINTS CLÉS (A-Z)

### Auth
```
POST   /api/auth/login              Authentifier
POST   /api/auth/logout             Déconnecter
GET    /api/auth/me                 Utilisateur courant
```

### Classes
```
GET    /api/classes                 Lister (teacher = sa classe, admin = toutes)
POST   /api/classes                 Créer (admin only)
GET    /api/classes/:id/students    Étudiants + stats
```

### Students
```
POST   /api/students/:id/activity-sheets    Créer 5 ADOC + 4 DRCV (après import)
POST   /api/classes/:classId/import-students  Import Excel
GET    /api/students/:id/dashboard         Stats étudiant
```

### Activity Sheets
```
GET    /api/students/:id/activity-sheets   Fiches (avec avg_grade, sessions_count)
PATCH  /api/activity-sheets/:id            Mettre à jour sujet/contexte/objectifs
```

### Sessions
```
POST   /api/sessions                Create session (date, time, location, objective)
GET    /api/sessions?studentId=X   Sessions étudiant
PATCH  /api/sessions/:id           Marquer complétée + status
```

### Validations
```
POST   /api/validations            Create validation (3 checkboxes + grade + comments)
                                   → Auto-update activity_sheet status
                                   → Générer alertes si retard
GET    /api/validations?studentId=X   Historique validations
```

### Dashboard (KPIs)
```
GET    /api/dashboard/teacher      Pour formateur (alertes, prochaines sessions)
GET    /api/dashboard/school       Pour admin école
```

---

## 🎯 CHECKLIST DÉMARRAGE

- [ ] **Jour 1 (Audit)**
  - [ ] PostgreSQL local + schema importé
  - [ ] `.env` configuré backend + frontend
  - [ ] `npm install` backend ✓
  - [ ] `npm run migrate` ✓
  - [ ] `npm run seed` ✓
  - [ ] `npm run dev` backend = http://localhost:3000 ✓
  - [ ] `curl http://localhost:3000/health` = OK ✓
  - [ ] Lire le prototype HTML existant
  - [ ] Noter les 5 onglets = 5 composants React

- [ ] **Jour 2-3 (Backend)**
  - [ ] Routes auth complètes + tested
  - [ ] Routes classes CRUD
  - [ ] Routes students + import Excel
  - [ ] Routes sessions
  - [ ] Routes validations + alertes
  - [ ] Tests Postman ou curl

- [ ] **Jour 4-5 (Frontend)**
  - [ ] Create React app (Vite)
  - [ ] LoginPage.jsx
  - [ ] ClassesList.jsx (tableau étudiants)
  - [ ] StudentDetail.jsx (onglets fiches)
  - [ ] FormValidation.jsx (grille validation)
  - [ ] DashboardFormateur.jsx (KPIs)
  - [ ] Connected to backend API

- [ ] **Jour 6-8 (Tests & Deploy)**
  - [ ] E2E scénarios critiques
  - [ ] O2switch: domaine + DB + Node.js setup
  - [ ] Build frontend prod
  - [ ] Déployer backend + frontend
  - [ ] SSL Let's Encrypt
  - [ ] Tests en production
  - [ ] Docs finales

---

## 🐛 TROUBLESHOOTING

### "Cannot find module 'dotenv'"
```bash
npm install dotenv
```

### PostgreSQL connexion failed
```bash
# Vérifier que PG est démarré
sudo service postgresql status  # Linux
brew services list              # Mac
# Vérifier .env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
```

### React app not connecting to API
```bash
# Vérifier CORS dans server.js
FRONTEND_URL=http://localhost:5173
# Vérifier backend running: curl http://localhost:3000/health
```

### Port 3000 already in use
```bash
# Tuer processus
lsof -i :3000
kill -9 <PID>
# Ou changer PORT dans .env
```

---

## 📞 SUPPORT INCLUS

**Après livraison** : Assistance 48h gratuite sur bugs code-related.

Envoi tickets à: support@review360.local (ou email projet)

---

## 🚀 GO TIME!

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: PostgreSQL (si besoin)
psql -U review360 -d review360_dev

# Naviguer vers http://localhost:5173
# Login: admin@cleancom.fr / password123
```

**Prêt à implémenter !** 🎉

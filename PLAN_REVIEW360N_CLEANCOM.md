# 🚀 PLAN EXÉCUTION REVIEW360N - CLEAN COM
**Devis M2604-XOELN | 600€ HT | 4 semaines @ 2j/semaine**

---

## 📋 PHASE 1 : AUDIT & SETUP (J1 - Jour 1)

### Matin : Audit Existant
```
✅ Analyser prototype HTML
  - Layout 5 tabs (Connexion, Paramétrage, Suivi, Création, Grilles)
  - 1700 lignes HTML/CSS vanilla
  - Logique métier complète mais statique

✅ Évaluer le scope métier
  - 45 étudiants / 2 années
  - 9 fiches ADOC (5) + DRCV (4)
  - 3 sessions/semestre par étudiant
  - Alertes automatiques (VERT/ORANGE/ROUGE)

✅ Identifier les blocages
  - Pas de backend = données en dur ou localStorage
  - Pas d'auth = rôles simulés (teacher/admin)
  - Pas de multi-tenant = 1 école = 1 instance
```

### Après-midi : Setup Infra
```
✅ Git repo multi-modules
  - Backend (Node.js + Express + Postgres)
  - Frontend (React avec API client)
  - Docs (API + déploiement)

✅ Config O2switch
  - Domaine: suivi360.cleancom.fr (ou sous-domaine existant)
  - Node.js runtime
  - PostgreSQL (managed ou custom)
  - SSL Let's Encrypt

✅ Base locale dev
  - PostgreSQL 14+
  - Seeding données BTS MCO
```

**Livrables J1** : Git repo init + infra documentée + env files

---

## 🔧 PHASE 2 : BACKEND (J2-J3)

### J2 : Fondations API
```
✅ Server Express + Middlewares
  - CORS + rate limiting
  - JWT auth (payload: {id, role, school_id})
  - Error handling standardisé

✅ Routes Auth
  - POST /auth/login
  - POST /auth/logout (invalidate JWT)
  - GET /auth/me (current user)

✅ Routes Classes (CRUD)
  - GET /classes
  - POST /classes (admin only)
  - GET /classes/:id/students
  - Vérif ownership (teacher ne voit que sa classe)
```

### J3 : Core Métier
```
✅ Routes Étudiants
  - GET /classes/:classId/students (avec stats: grades, sessions)
  - POST /students/:id/activity-sheets (bulk create ADOC 5 + DRCV 4)
  - Import Excel: POST /classes/:classId/import-students

✅ Routes Sessions de Suivi
  - POST /sessions (créer une session)
  - GET /sessions?studentId=X (lister sessions d'un étudiant)
  - PATCH /sessions/:id (marquer complétée)

✅ Routes Validations
  - POST /validations (créer validation + audit log)
  - Logique: si 3 points OK → fiche = VALIDATED
  - Déclencher alertes ORANGE/ROUGE si retard

✅ Dashboard Formateur
  - GET /dashboard/formateur (KPIs: taux complét°, alertes, prochaines sessions)
```

**Livrables J2-J3** : API complète testée (Postman) + docs endpoints

---

## 🎨 PHASE 3 : FRONTEND (J4-J5)

### Refactor HTML → React
```
✅ Composants React
  - LoginPage.jsx (formulaire auth)
  - ClassesList.jsx (tableau classes + filtres)
  - StudentDetail.jsx (onglets fiches, sessions, validations)
  - DashboardFormateur.jsx (KPIs, alertes, calendrier)
  - FormValidation.jsx (grille 3 checkboxes + notes)

✅ Client API wrapper
  - lib/api.js → méthodes GET/POST/PATCH avec auth JWT
  - Gestion erreurs + refresh token
  - Cache simple (localStorage)

✅ UI polish
  - Responsive mobile (tabs deviennent accordéons)
  - Couleurs alertes VERT #27ae60 / ORANGE #f39c12 / ROUGE #e74c3c
  - Forms validées (email, nombres, dates)
  - Notifications toast (succès/erreur)
```

### Intégrations
```
✅ Import Excel
  - Drag-n-drop file upload
  - Validation colonnes (Num, Nom, Prénom, Email)
  - Preview avant import
  - Rapport d'import (X importés, Y erreurs)

✅ Export Rapports
  - PDF: bullet point par étudiant (fiches, grades moyens, dernier suivi)
  - Excel: tableau formaté (statuts, notes, alertes)
```

**Livrables J4-J5** : Frontend React connecté à API + tests parcours utilisateur

---

## ✅ PHASE 4 : TESTS & DÉPLOIEMENT (J6-J8)

### J6 : Tests & Bugs
```
✅ Scénarios critiques
  - Import 45 étudiants → création fiches
  - Formateur crée session → email envoyé ? (optionnel)
  - Valide 3 points → fiche passe VALIDATED
  - Manque 1 session → alerte ORANGE générée
  - Pas de suivi depuis 2 sem → alerte ROUGE

✅ Load test
  - 45 étudiants, 10 formateurs concurrents
  - Temps réponse acceptable (<500ms)
  
✅ Sécurité basique
  - Teacher ne voit que sa classe
  - Admin peut voir toutes les classes
  - JWT expiration 24h
```

### J7-J8 : Déploiement O2switch
```
✅ Production DB
  - PostgreSQL sur O2switch (ou managed)
  - Backup auto (daily)
  - Migrations appliquées

✅ Build & Deploy
  - Build React (dist/)
  - Node backend sur port (env)
  - Nginx reverse proxy → Node
  - SSL auto (Let's Encrypt)
  - PM2 process manager (auto-restart)

✅ Monitoring
  - Logs centralisés (tail, pm2 logs)
  - Health check endpoint: GET /health
  - Email d'erreurs critiques (optionnel)

✅ Documentation
  - README déploiement
  - FAQ utilisateurs (formateurs)
  - API docs (Swagger/OpenAPI)
```

**Post-livraison** : Support 48h gratuit inclus (bugs liés au code)

---

## 📁 STRUCTURE GIT

```
review360-cleancom/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── classes.js
│   │   │   ├── students.js
│   │   │   ├── sessions.js
│   │   │   └── validations.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── utils/
│   │   │   ├── excelImport.js
│   │   │   ├── alertGenerator.js
│   │   │   └── validators.js
│   │   └── db/
│   │       ├── schema.sql
│   │       └── seed.sql
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ClassesList.jsx
│   │   │   ├── StudentDetail.jsx
│   │   │   ├── DashboardFormateur.jsx
│   │   │   └── FormValidation.jsx
│   │   ├── lib/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── USER_GUIDE.md
├── .gitignore
└── README.md
```

**Branches**:
- `main` → production (O2switch)
- `develop` → staging
- `feature/*` → features en dev

---

## 💰 FACTURATION

**Devis M2604-XOELN - 21 avril 2026**
- Montant: 600€ TTC
- Versement libératoire: **528€ net** (art. 293 B CGI)
- Facture à signature devis
- Paiement 30 jours nets

**Inclus**:
- Audit (J1)
- Backend complet (J2-3)
- Frontend complet (J4-5)
- Tests & déploiement (J6-8)
- Support 48h post-livraison

**Non inclus** (sur devis additionnel):
- Google Calendar intégration
- Email automations
- SSO / OAuth externe
- Maintenance année 1+

---

## ⚠️ RISQUES & MITIGATIONS

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Data existantes mal structurées | Blocage import | Audit J1 complet + template Excel fourni |
| O2switch problèmes DB | Retard déploiement | Tester pg_restore en amont |
| Changements scope | Dérive délais | Avenant obligatoire (point 5 devis) |
| Performance 45 étudiants | Lenteurs | Index DB + pagination + tests J6 |

---

## ✨ BONUS POSSIBLE (si temps reste)

- [ ] Webhooks Google Calendar (affichage sessions)
- [ ] Notifications email (suivi rappels)
- [ ] Graphiques progression par classe (Chart.js)
- [ ] Export PDF professionnel (jsPDF)

---

**Prêt à démarrer ? → Créer le repo, brancher sur O2switch, J1 audit demain !**

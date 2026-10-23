# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Lancer le projet en local

Prérequis : Node.js (version LTS).

### API

```powershell
cd backend
npm install
```

Crée `backend/.env` à partir de `backend/.env.example` et remplis `JWT_SECRET` :

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Avec une version récente de npm, autorise le script d'installation de better-sqlite3 :

```powershell
npm install-scripts approve better-sqlite3
npm rebuild better-sqlite3
```

Puis :

```powershell
npm run seed:demo   # marchés, produits et prix de démonstration
npm run dev         # http://localhost:3000
```

### Interface

```powershell
cd frontend
npm install
npm run dev         # http://localhost:5173
```
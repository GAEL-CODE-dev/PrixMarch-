import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { House, Tag, TrendingUp } from 'lucide-react';

const onglets = [
  { to: '/', label: 'Accueil', Icone: House, end: true },
  { to: '/comparer', label: 'Comparer', Icone: Tag },
  { to: '/evolution', label: 'Évolution', Icone: TrendingUp },
];

const titres = {
  '/': 'Accueil',
  '/comparer': 'Comparer',
  '/evolution': 'Évolution',
};

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="app">
      <header className="entete">
        <span className="surtitre">PrixMarché</span>
        <h1 className="titre">{titres[pathname] || 'PrixMarché'}</h1>
      </header>

      <main className="contenu">
        <Outlet />
      </main>

      <nav className="onglets" aria-label="Navigation principale">
        {onglets.map(({ to, label, Icone, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'onglet actif' : 'onglet')}
          >
            <Icone size={24} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
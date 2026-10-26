import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

function Svg({ children }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function PictoAccueil() {
  return (
    <Svg>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

function PictoComparer() {
  return (
    <Svg>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </Svg>
  );
}

function PictoEvolution() {
  return (
    <Svg>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </Svg>
  );
}

function PictoPersonne() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  );
}

const onglets = [
  { to: '/', label: 'Accueil', Picto: PictoAccueil, end: true },
  { to: '/comparer', label: 'Comparer', Picto: PictoComparer },
  { to: '/evolution', label: 'Évolution', Picto: PictoEvolution },
];

const titres = {
  '/': 'Accueil',
  '/comparer': 'Comparer',
  '/evolution': 'Évolution',
  '/ajouter': 'Ajouter un prix',
  '/compte': 'Mon compte',
};

export default function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const initiale = user ? user.nom.trim().charAt(0).toUpperCase() : '';

  return (
    <div className="app">
      <header className="entete">
        <div>
          <span className="surtitre">PrixMarché</span>
          <h1 className="titre">{titres[pathname] || 'PrixMarché'}</h1>
        </div>
        <Link
          to="/compte"
          className="avatar"
          aria-label={user ? 'Mon compte' : 'Se connecter'}
        >
          {user ? initiale : <PictoPersonne />}
        </Link>
      </header>

      <main className="contenu">
        <Outlet />
      </main>

      <nav className="onglets" aria-label="Navigation principale">
        {onglets.map(({ to, label, Picto, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => (isActive ? 'onglet actif' : 'onglet')}
          >
            <Picto />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
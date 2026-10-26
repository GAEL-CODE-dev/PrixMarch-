import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function RequireAuth({ children, message = 'Connecte-toi pour continuer.' }) {
  const { user, verification } = useAuth();
  const location = useLocation();

  if (verification) {
    return <p className="info">Chargement...</p>;
  }

  if (!user) {
    return (
      <Navigate
        to="/compte"
        replace
                state={{ from: `${location.pathname}${location.search}`, message }}
      />
    );
  }

  return children;
}
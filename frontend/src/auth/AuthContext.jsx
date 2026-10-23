import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const CLE = 'prixmarche_token';
const AuthContext = createContext(null);

function lireToken() {
  try {
    return localStorage.getItem(CLE);
  } catch {
    return null;
  }
}

function ecrireToken(token) {
  try {
    if (token) localStorage.setItem(CLE, token);
    else localStorage.removeItem(CLE);
  } catch {
    // stockage indisponible (navigation privée stricte, par exemple)
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(lireToken);
  const [user, setUser] = useState(null);
  const [verification, setVerification] = useState(() => Boolean(lireToken()));

  // Au chargement : vérifier le jeton enregistré
  useEffect(() => {
    const stocke = lireToken();
    if (!stocke) return;

    let annule = false;
    api('/auth/me', { token: stocke })
      .then((u) => {
        if (!annule) setUser(u);
      })
      .catch((e) => {
        if (annule) return;
        if (e.status === 401) {
          ecrireToken(null);
          setToken(null);
        }
      })
      .finally(() => {
        if (!annule) setVerification(false);
      });

    return () => {
      annule = true;
    };
  }, []);

  const connexion = useCallback(async (email, motDePasse) => {
    const data = await api('/auth/login', {
      methode: 'POST',
      corps: { email, mot_de_passe: motDePasse },
    });
    ecrireToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const inscription = useCallback(
    async (nom, email, motDePasse) => {
      await api('/auth/register', {
        methode: 'POST',
        corps: { nom, email, mot_de_passe: motDePasse },
      });
      await connexion(email, motDePasse);
    },
    [connexion]
  );

  const deconnexion = useCallback(() => {
    ecrireToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const valeur = useMemo(
    () => ({ token, user, verification, connexion, inscription, deconnexion }),
    [token, user, verification, connexion, inscription, deconnexion]
  );

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}
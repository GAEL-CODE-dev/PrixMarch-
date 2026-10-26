import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';

export default function Compte() {
  const { user, verification, connexion, inscription, deconnexion } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const retour = location.state?.from || '/';
  const message = location.state?.message || '';

  const [mode, setMode] = useState('connexion');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setErreur('');
    setEnvoi(true);
    try {
      if (mode === 'connexion') {
        await connexion(email.trim(), motDePasse);
      } else {
        await inscription(nom.trim(), email.trim(), motDePasse);
      }
      navigate(retour, { replace: true });
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  }

  function changerMode(nouveau) {
    setMode(nouveau);
    setErreur('');
  }

  if (verification) {
    return <p className="info">Chargement...</p>;
  }

  if (user) {
    return (
      <section>
        <div className="carte-profil">
          <p className="profil-nom">{user.nom}</p>
          <p className="profil-email">{user.email}</p>
        </div>
        <button type="button" className="bouton bouton-secondaire" onClick={deconnexion}>
          Se déconnecter
        </button>
      </section>
    );
  }

  return (
    <section>
      {message && <p className="bandeau-info">{message}</p>}

      <div className="bascule" role="group" aria-label="Choisir une action">
        <button
          type="button"
          className={mode === 'connexion' ? 'chip actif' : 'chip'}
          onClick={() => changerMode('connexion')}
        >
          Connexion
        </button>
        <button
          type="button"
          className={mode === 'inscription' ? 'chip actif' : 'chip'}
          onClick={() => changerMode('inscription')}
        >
          Inscription
        </button>
      </div>

      <form className="formulaire" onSubmit={soumettre}>
        {mode === 'inscription' && (
          <label className="champ">
            Nom
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
            />
          </label>
        )}

        <label className="champ">
          Adresse email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="champ">
          Mot de passe
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
            minLength={mode === 'inscription' ? 8 : undefined}
            autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
          />
        </label>

        {mode === 'inscription' && <p className="aide">8 caractères minimum.</p>}
        {erreur && (
          <p className="info erreur" role="alert">
            {erreur}
          </p>
        )}

        <button type="submit" className="bouton" disabled={envoi}>
          {envoi ? 'Patiente...' : mode === 'connexion' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>
    </section>
  );
}
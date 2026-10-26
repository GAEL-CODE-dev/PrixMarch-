import { Component } from 'react';

// Filet de sécurité : une erreur de rendu ne doit pas laisser une page blanche.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erreur: null };
  }

  static getDerivedStateFromError(erreur) {
    return { erreur };
  }

  componentDidCatch(erreur, infos) {
    console.error('Erreur inattendue :', erreur, infos);
  }

  render() {
    if (this.state.erreur) {
      return (
        <div className="app">
          <main className="contenu">
            <h2>Un problème est survenu</h2>
            <p className="info">
              L'application n'a pas pu s'afficher. Recharge la page pour réessayer.
            </p>
            <button type="button" className="bouton" onClick={() => window.location.reload()}>
              Recharger
            </button>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}

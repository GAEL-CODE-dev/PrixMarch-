import { createContext } from 'react';

// Contexte partagé entre le fournisseur (AuthContext.jsx) et le hook (useAuth.js).
// Isolé dans son propre fichier pour que le fournisseur reste le seul export
// de composant de AuthContext.jsx (règle react-refresh).
export const AuthContext = createContext(null);

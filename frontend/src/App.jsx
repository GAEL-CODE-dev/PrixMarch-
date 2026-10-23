import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Accueil from './pages/Accueil.jsx';
import Comparer from './pages/Comparer.jsx';
import Evolution from './pages/Evolution.jsx';
import Compte from './pages/Compte.jsx';

function NonTrouve() {
  return <p>Page introuvable.</p>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Accueil />} />
            <Route path="comparer" element={<Comparer />} />
            <Route path="evolution" element={<Evolution />} />
            <Route path="compte" element={<Compte />} />
            <Route path="*" element={<NonTrouve />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
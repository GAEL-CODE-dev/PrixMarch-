import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Accueil from './pages/Accueil.jsx';
import Comparer from './pages/Comparer.jsx';
import Evolution from './pages/Evolution.jsx';

function NonTrouve() {
  return <p>Page introuvable.</p>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Accueil />} />
          <Route path="comparer" element={<Comparer />} />
          <Route path="evolution" element={<Evolution />} />
          <Route path="*" element={<NonTrouve />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
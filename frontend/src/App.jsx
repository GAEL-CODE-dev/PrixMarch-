import { useEffect, useState } from 'react';

function App() {
  const [etat, setEtat] = useState("Connexion à l'API...");

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setEtat(`API OK : ${data.app}`))
      .catch(() => setEtat('API injoignable'));
  }, []);

  return (
    <main>
      <h1>PrixMarché</h1>
      <p>{etat}</p>
    </main>
  );
}

export default App;
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'PrixMarché API' });
});

app.listen(PORT, () => {
  console.log(`API lancée sur http://localhost:${PORT}`);
});
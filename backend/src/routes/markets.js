const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/', (req, res) => {
  const markets = db
    .prepare('SELECT id, nom, quartier FROM markets ORDER BY nom')
    .all();
  res.json(markets);
});

module.exports = router;
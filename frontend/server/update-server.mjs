// Petit serveur local (dev uniquement) qui persiste sur disque la date de
// dernière mise à jour manuelle d'un investissement. L'app Angular n'a pas
// de backend — ce process n'existe que pour permettre au bouton "Mettre à
// jour" de réécrire src/assets/data/investments.json.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../src/assets/data/investments.json');
const PORT = process.env.UPDATE_SERVER_PORT ?? 4300;

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const match = url.pathname.match(/^\/api\/investments\/([^/]+)\/date$/);

  if (req.method !== 'PATCH' || !match) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  const id = match[1];

  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const investments = JSON.parse(raw);
    const investment = investments.find((inv) => inv.id === id);

    if (!investment) {
      sendJson(res, 404, { error: `Investment ${id} not found` });
      return;
    }

    const dateDerniereMiseAJour = new Date().toISOString().slice(0, 10);
    investment.dateDerniereMiseAJour = dateDerniereMiseAJour;

    await fs.writeFile(DATA_FILE, JSON.stringify(investments, null, 2) + '\n', 'utf-8');

    sendJson(res, 200, { id, dateDerniereMiseAJour });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[update-server] listening on http://localhost:${PORT}`);
});

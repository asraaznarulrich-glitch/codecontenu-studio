# Backend Codecontenu

- `server.js` : assistant FAQ (Groq). La clé reste ici, jamais dans la boutique.
- `supabase/schema.sql` : base de données (produits, contenus privés, commandes, stockage).

## Démarrer sur votre serveur
1. `cp .env.example .env` puis mettez `GROQ_API_KEY=...`
2. `node server.js` (Node 18+, aucune dépendance) — idéalement derrière HTTPS (nginx/Caddy) + pm2.
3. Test : `curl http://localhost:8787/api/health` puis `node check-groq.js`.

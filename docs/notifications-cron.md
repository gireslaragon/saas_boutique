Planification quotidienne: suppression des notifications expirées

But: stockez `expiresAt` au moment de la création.

- Dans le code: utilisez `createNotification(...)` (définit `expiresAt = now + 7 jours` si non fourni).
- Index: la colonne `expires_at` est indexée (`notifications_expires_idx`).

Script d'exécution (déjà inclus):

- Fichier script (build): `./dist/src/scripts/purge-expired-notifications.js`
- Exécuter manuellement après build:

```bash
node ./dist/src/scripts/purge-expired-notifications.js
```

Crontab (exemple) — exécuter tous les jours à 03:00:

```cron
0 3 * * * cd /path/to/boutique-saas && /usr/bin/node ./dist/src/scripts/purge-expired-notifications.js >> /var/log/boutique/purge-notifications.log 2>&1
```

Alternative: déclenchement via API protégé

- Route POST (protégée): `/api/admin/cleanup-notifications`
- Exemple `curl` (nécessite cookies / en-têtes d'auth selon votre auth middleware):

```bash
curl -X POST https://your.app.example.com/api/admin/cleanup-notifications -H "Authorization: Bearer $ADMIN_TOKEN"
```

Bonnes pratiques:
- Ne pas purger côté frontend ni à chaque chargement — préférez un job planifié.
- Garder un index sur `expires_at` pour rendre les DELETE rapides.
- Sur forte volumétrie, considérez la suppression par lots pour limiter les verrous.

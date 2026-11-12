# FRACT

Projet de fin d'année (PFA) : plateforme de financement fractionné d'actifs réels, côté propriétaire.

Le propriétaire d'un commerce financé suit sur la plateforme son activité, sa levée, le registre des parts, les rapports publiés aux investisseurs, ses charges et ses justificatifs.

Toutes les données sont fictives et aucun paiement n'est réel.

## Avancement

- `web/` : interface web, terminée. Elle fonctionne pour l'instant avec des données de démonstration enregistrées dans le navigateur.
- `api/` : API NestJS et base PostgreSQL, en cours.

## Prérequis

Il faut installer Node.js (version 20 ou plus) depuis https://nodejs.org (version LTS, options par défaut).

Pour vérifier que Node.js est bien installé, ouvrir un terminal (sous Windows : PowerShell) et taper :

```bash
node -v
```

## Lancement

Dans un terminal ouvert dans le dossier `fract` :

```bash
cd web
```

```bash
npm install
```

```bash
npm run dev
```

`npm install` n'est nécessaire que la première fois. Ouvrir ensuite http://localhost:5173 dans le navigateur. Pour arrêter : `Ctrl` + `C` dans le terminal.

## Comptes de démonstration

Mot de passe pour tous les comptes : `Demo2026!`

| Compte | Rôle |
| --- | --- |
| proprietaire@fract.test | Propriétaire d'Atlas Retail (financé) et de Boutique Nova (en préparation) |
| proprietaire.b@fract.test | Propriétaire d'Urban Market |
| auteur@fract.test | Équipe financière, rédaction des rapports |
| verificateur@fract.test | Équipe financière, vérification |
| publication@fract.test | Équipe financière, publication |
| caisse@fract.test | Opérateur de la caisse comptoir (envoie uniquement des ventes) |
| suspendu@fract.test | Compte suspendu |

Sur la page de connexion, un clic sur un compte remplit le formulaire.

Les modifications faites pendant les tests restent enregistrées dans le navigateur. Pour revenir aux données de départ, il suffit d'effacer les données du site dans le navigateur.

## Quelques tests possibles

- Avec `proprietaire.b@fract.test`, ouvrir http://localhost:5173/actifs/act_atlas : l'accès est refusé.
- Avec `proprietaire@fract.test`, page Ventes, onglet Import CSV : télécharger le modèle, l'importer deux fois. Le deuxième import ne crée aucune vente.
- Page Distributions : avec 50 000 € dans le simulateur, on obtient 5 € par part.
- Rapport T3 2026 : le valider avec `verificateur@fract.test`, puis le publier avec `publication@fract.test`.

## Technique

React 18, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, Radix UI, Recharts, react-hook-form, zod, date-fns.

Le fichier `web/.env` (à créer en copiant `web/.env.example`, facultatif) choisit la source des données :

- `VITE_API_MODE=mock` : données de démonstration dans le navigateur ;
- `VITE_API_MODE=http` avec `VITE_API_URL=http://localhost:3000/api` : l'API NestJS ;
- `VITE_DEMO_MODE=true` : affiche les comptes de démonstration sur la page de connexion.

Commandes utiles : `npm run typecheck` (vérification TypeScript), `npm run build` (version de production).

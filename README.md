# Meselec Commerce

Progiciel commerce mutualisé, séparé de l'ERP d'exploitation (`meselec-suivi`), alimenté par le bridge `commerce-bridge`.

## Fonctionnalités

- Pipeline appels d'offres (kanban, CRUD, lots, documents DCE)
- Catalogues BPU / DPGF réutilisables + import CSV
- Chiffrage réponse AO (sélection lignes BPU, quantités, total)
- Mémoires techniques versionnées
- Répertoire fournisseurs commerciaux
- Prospection communes (module migré depuis l'ERP)
- Handoff ERP : création chantier + chiffrage + demande numéro d'affaire
- Multi-exploitant via `societes_exploitation` (Meselec par défaut)

## Environnement

Créer un fichier `.env` :

```env
VITE_SUPABASE_URL=https://<commerce-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_ERP_BRIDGE_URL=https://kuyeezshwdvlnayggpfu.supabase.co/functions/v1/commerce-bridge
VITE_ERP_BRIDGE_KEY=<COMMERCE_BRIDGE_SECRET>
```

Côté ERP (`meselec-suivi`), définir `COMMERCE_BRIDGE_SECRET` dans les secrets Supabase et déployer `commerce-bridge`.

## Base de données

Exécuter la migration :

- `supabase/migrations/20260829130000_commerce_core_schema.sql`

Puis ajouter les emails autorisés :

```sql
insert into public.commerce_allowed_emails (email) values ('vous@meselec.fr');
```

## Développement

```sh
npm install
npm run dev
```

## Déploiement

- Domaine suggéré : `commerce.meselec.app`
- L'ERP reste l'outil d'exploitation par société ; le commerce gère l'avant-vente mutualisé.

# Robot DCE de la veille AO

L'analyse se lance **à la demande**, annonce par annonce, avec le bouton
« Analyser le DCE » de la page Veille. L'application déclenche alors le workflow
GitHub Actions `.github/workflows/veille-dce.yml`, qui, pour chaque annonce
demandée :

1. ouvre l'adresse des documents du marché trouvée
   dans l'avis, se connecte à la plateforme et télécharge le DCE ;
2. dézippe (zips imbriqués compris), repère le RC et le CCTP (et le CCAP si le RC
   manque) ;
3. les fait lire par Claude : visite (obligatoire, dates, modalités),
   certifications et qualifications, autres exigences, points d'attention ;
4. enregistre le résultat dans `veille_annonces.analyse_dce` et dépose le RC/CCTP
   dans le bucket privé `veille-dce`.

Le résultat apparaît dans la page Veille après quelques minutes (la page se
rafraîchit seule) et dans le mail de 10 h.

Le passage planifié des jours ouvrés (vers 8 h) collecte les nouveaux avis BOAMP
et reprend les demandes restées en attente (nouvel essai après un échec de
téléchargement). Il n'analyse rien qui n'a pas été demandé.

## Lancement depuis l'application (Lovable)

Ajouter dans les secrets du projet Lovable `GITHUB_DISPATCH_TOKEN` : un jeton
GitHub « fine-grained » limité au dépôt `mathieufsl/meselec-commerce`, avec la
permission **Actions : Read and write**. Sans ce jeton, le bouton enregistre la
demande et l'analyse se fait au passage de 8 h.

## Secrets à créer (GitHub → Settings → Secrets and variables → Actions)

| Secret | Contenu |
| --- | --- |
| `SUPABASE_URL` | `https://tewhgpsuwjlufqbeiwen.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role du projet rms-commerce |
| `ANTHROPIC_API_KEY` | clé API Claude (console.anthropic.com) |
| `PLACE_LOGIN` / `PLACE_PASSWORD` | compte entreprise marches-publics.gouv.fr |
| `MAXIMILIEN_LOGIN` / `MAXIMILIEN_PASSWORD` | compte entreprise maximilien.fr |
| `AWS_LOGIN` / `AWS_PASSWORD` | compte marches-publics.info |
| `ACHATPUBLIC_LOGIN` / `ACHATPUBLIC_PASSWORD` | compte achatpublic.com |
| `MARCHES_SECURISES_LOGIN` / `MARCHES_SECURISES_PASSWORD` | compte marches-securises.fr |

Une plateforme sans identifiants est tentée sans connexion. Les identifiants ne
sont saisis que sur le domaine de la plateforme concernée.

Variable facultative (onglet *Variables*) : `VEILLE_DCE_MODEL` pour changer de
modèle Claude (par défaut `claude-opus-5-5`).

## Lancer à la main / diagnostiquer

GitHub → Actions → « Veille AO — analyse des DCE » → *Run workflow* :

- **annonce** : un id ou un n° BOAMP pour ne traiter qu'une annonce ;
- **diagnostic** : garde une capture d'écran et le HTML de chaque étape du
  navigateur (artefact `dce-diagnostic`, conservé 7 jours). C'est ce qu'il faut
  regarder si une plateforme n'est pas franchie.

## Statuts (`analyse_statut`)

- `non_demande` : pas d'analyse demandée (valeur par défaut) ;
- `a_faire` : analyse demandée, en cours ou en attente du robot ;
- `termine` : DCE récupéré et analysé ;
- `sans_dce` : pas d'adresse de DCE dans l'avis, plateforme non gérée ou RC/CCTP
  absents : analyse faite sur l'avis seul ;
- `echec` : DCE non récupéré après 2 essais (analyse sur l'avis seul, erreur dans
  `analyse_erreur`) ;

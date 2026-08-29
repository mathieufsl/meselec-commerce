<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Exécution opérationnelle (agent)

Quand une tâche est validée, **exécuter soi-même** les étapes suivantes sans attendre que l'utilisateur le fasse :

1. **Migrations Supabase** (`rms-commerce`, ref `tewhgpsuwjlufqbeiwen`)  
   - `supabase link --project-ref tewhgpsuwjlufqbeiwen` si pas encore lié  
   - `supabase db push` après ajout/modif de migration  
   - Vérifier avec `supabase migration list`

2. **Git / Lovable**  
   - Commit + push vers `lovable` (`rms-commerce`) et `origin` (`meselec-commerce`)  
   - `git pull lovable main --rebase` avant push si rejet

3. **Build / tests**  
   - `npm test` et `npm run build` avant push

4. **Seed catalogues EP** (si fichiers Excel mis à jour)  
   - `npm run seed:ep` puis commit de la migration générée + `supabase db push`

Remotes : `origin` → meselec-commerce, `lovable` → rms-commerce (Lovable).

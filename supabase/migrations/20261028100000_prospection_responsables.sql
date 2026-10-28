-- Prospection : qui s'occupe de la commune (plusieurs personnes possibles).
alter table public.prospection_commune_suivi
  add column if not exists responsables text[] not null default '{}'::text[];

comment on column public.prospection_commune_suivi.responsables is
  'Personnes en charge de la commune (Rida, Said, Mathieu…).';

-- Préremplissage 93 d'après les notes (export du 28/10/2026). Ne touche que les lignes encore vides.
with attribution(commune_key, responsables) as (
  values
    ('Seine-Saint-Denis (93)::Saint-Denis', array['Said']),
    ('Seine-Saint-Denis (93)::Montreuil', array['Said']),
    ('Seine-Saint-Denis (93)::Aulnay-sous-Bois', array['Said']),
    ('Seine-Saint-Denis (93)::Bagnolet', array['Said']),
    ('Seine-Saint-Denis (93)::Les Lilas', array['Said']),
    ('Seine-Saint-Denis (93)::Drancy', array['Said']),
    ('Seine-Saint-Denis (93)::Bobigny', array['Said']),
    ('Seine-Saint-Denis (93)::Le Blanc-Mesnil', array['Said']),
    ('Seine-Saint-Denis (93)::Sevran', array['Said']),
    ('Seine-Saint-Denis (93)::Livry-Gargan', array['Said']),
    ('Seine-Saint-Denis (93)::Stains', array['Said']),
    ('Seine-Saint-Denis (93)::Bondy', array['Said']),
    ('Seine-Saint-Denis (93)::Rosny-sous-Bois', array['Said']),
    ('Seine-Saint-Denis (93)::Gagny', array['Said']),
    ('Seine-Saint-Denis (93)::Noisy-le-Sec', array['Said']),
    ('Seine-Saint-Denis (93)::Villepinte', array['Said']),
    ('Seine-Saint-Denis (93)::Clichy-sous-Bois', array['Said']),
    ('Seine-Saint-Denis (93)::Pantin', array['Said']),
    ('Seine-Saint-Denis (93)::La Courneuve', array['Said']),
    ('Seine-Saint-Denis (93)::Pierrefitte-sur-Seine', array['Said']),
    ('Seine-Saint-Denis (93)::Aubervilliers', array['Rida']),
    ('Seine-Saint-Denis (93)::Noisy-le-Grand', array['Rida']),
    ('Seine-Saint-Denis (93)::Le Pré-Saint-Gervais', array['Rida']),
    ('Seine-Saint-Denis (93)::Villetaneuse', array['Rida']),
    ('Seine-Saint-Denis (93)::Épinay-sur-Seine', array['Rida']),
    ('Seine-Saint-Denis (93)::Villemomble', array['Rida']),
    ('Seine-Saint-Denis (93)::Les Pavillons-sous-Bois', array['Rida']),
    ('Seine-Saint-Denis (93)::Neuilly-Plaisance', array['Rida']),
    ('Seine-Saint-Denis (93)::Tremblay-en-France', array['Rida', 'Said']),
    ('Seine-Saint-Denis (93)::Vaujours', array['Rida', 'Said']),
    ('Seine-Saint-Denis (93)::Gournay-sur-Marne', array['Rida', 'Said']),
    ('Seine-Saint-Denis (93)::Coubron', array['Rida', 'Said']),
    ('Seine-Saint-Denis (93)::L''Île-Saint-Denis', array['Rida', 'Said']),
    ('Seine-Saint-Denis (93)::Le Raincy', array['Rida', 'Said']),
    ('Seine-Saint-Denis (93)::Romainville', array['Rida', 'Said']),
    ('Seine-Saint-Denis (93)::Montfermeil', array['Rida', 'Said']),
    ('Seine-Saint-Denis (93)::Dugny', array['Rida', 'Said'])
)
update public.prospection_commune_suivi s
set responsables = a.responsables
from attribution a
where s.commune_key = a.commune_key
  and s.responsables = '{}'::text[];

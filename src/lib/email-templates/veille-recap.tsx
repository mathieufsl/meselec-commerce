import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface VeilleRecapAnnonce {
  intitule: string
  acheteur: string | null
  departement: string | null
  date_limite: string | null
  lien: string | null
  domaines: string[]
  entite?: string | null
  decision?: string | null
  score?: number | null
  resume?: string | null
  certif_manquante?: boolean | null
  interet_relationnel?: boolean | null
  exigences?: { avis_insuffisant?: boolean; visite_obligatoire?: boolean | null } | null
  plateforme?: string | null
  dce_url?: string | null
  qualif_statut?: string | null
  url_dce?: string | null
  /** Lignes courtes : visite, certifications… (analyse DCE ou indices de l'avis). */
  points?: string[]
}

interface Props {
  date?: string
  annonces?: VeilleRecapAnnonce[]
  qualifIndisponible?: boolean
  collectees?: number
  retenues?: number
  appUrl?: string
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Répartit les annonces : prioritaires, à creuser, non qualifiées, hors sujet. */
export function trierAnnoncesRecap(annonces: VeilleRecapAnnonce[]) {
  const parScore = (a: VeilleRecapAnnonce, b: VeilleRecapAnnonce) => (b.score ?? -1) - (a.score ?? -1)
  return {
    prioritaires: annonces.filter((a) => a.decision === 'prioritaire').sort(parScore),
    aCreuser: annonces.filter((a) => a.decision === 'a_creuser').sort(parScore),
    nonQualifiees: annonces.filter((a) => a.qualif_statut !== 'qualifie'),
    horsSujet: annonces.filter((a) => a.qualif_statut === 'qualifie' && a.decision === 'hors_sujet'),
  }
}

function badges(a: VeilleRecapAnnonce): string[] {
  const out: string[] = []
  if (a.certif_manquante) out.push('certif manquante')
  if (a.interet_relationnel) out.push('intérêt relationnel')
  if (a.exigences?.avis_insuffisant) out.push('avis insuffisant → lire RC')
  if (a.exigences?.visite_obligatoire) out.push('visite obligatoire')
  return out
}

const Carte = ({ a }: { a: VeilleRecapAnnonce }) => (
  <Section style={card}>
    <Text style={cardTitle}>
      {a.lien ? (
        <Link href={a.lien} style={cardLink}>
          {a.intitule}
        </Link>
      ) : (
        a.intitule
      )}
    </Text>
    <Text style={cardMeta}>
      {[
        a.acheteur,
        a.entite && a.entite !== 'aucune' ? a.entite : null,
        a.score != null ? `score ${a.score}` : null,
        `limite ${formatDate(a.date_limite)}`,
        a.departement ? `dép. ${a.departement}` : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    </Text>
    {a.resume ? <Text style={cardResume}>{a.resume}</Text> : null}
    {(a.points ?? []).map((p, j) => (
      <Text key={j} style={cardPoint}>
        {p}
      </Text>
    ))}
    {badges(a).length > 0 ? (
      <Text style={cardMeta}>
        {badges(a).map((b) => (
          <span key={b} style={badge}>
            {b}
          </span>
        ))}
      </Text>
    ) : null}
    <Text style={cardMeta}>
      {a.plateforme && a.plateforme !== 'inconnue' ? `Plateforme : ${a.plateforme}` : ''}
      {a.dce_url ?? a.url_dce ? (
        <>
          {a.plateforme && a.plateforme !== 'inconnue' ? ' · ' : ''}
          <Link href={(a.dce_url ?? a.url_dce) as string} style={dceLink}>
            DCE →
          </Link>
        </>
      ) : null}
    </Text>
  </Section>
)

const Email = ({
  date,
  annonces = [],
  qualifIndisponible = false,
  collectees = 0,
  retenues = 0,
  appUrl,
}: Props) => {
  const { prioritaires, aCreuser, nonQualifiees, horsSujet } = trierAnnoncesRecap(annonces)
  const aMontrer = prioritaires.length + aCreuser.length + nonQualifiees.length
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        {aMontrer > 0
          ? `${prioritaires.length} prioritaire(s), ${aCreuser.length} à creuser — veille du ${date ?? ''}`
          : `Aucune nouvelle annonce AO pertinente — veille du ${date ?? ''}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={title}>Veille appels d'offres</Heading>
          <Text style={subtitle}>Récapitulatif quotidien — {date ?? "aujourd\u2019hui"}</Text>

          {qualifIndisponible ? (
            <Section style={warnBox}>
              <Text style={warnText}>
                Qualification IA indisponible aujourd'hui : les annonces ci-dessous ne sont pas
                triées.
              </Text>
            </Section>
          ) : null}

          <Section style={statsBox}>
            <Text style={statsText}>
              <strong>{prioritaires.length}</strong> prioritaire(s) ·{' '}
              <strong>{aCreuser.length}</strong> à creuser · {annonces.length} nouvelle(s) ·{' '}
              {retenues} dans le filtre sur {collectees} collectées (BOAMP)
            </Text>
          </Section>

          {aMontrer === 0 ? (
            <Text style={emptyText}>
              Aucune nouvelle annonce pertinente pour votre périmètre (Île-de-France, Oise,
              Eure) n'a été publiée sur la période.
            </Text>
          ) : null}

          {prioritaires.length > 0 ? <Heading as="h2" style={h2}>Prioritaires</Heading> : null}
          {prioritaires.map((a, i) => (
            <Carte key={`p${i}`} a={a} />
          ))}

          {aCreuser.length > 0 ? <Heading as="h2" style={h2}>À creuser</Heading> : null}
          {aCreuser.map((a, i) => (
            <Carte key={`c${i}`} a={a} />
          ))}

          {nonQualifiees.length > 0 ? (
            <Heading as="h2" style={h2}>Non qualifiées</Heading>
          ) : null}
          {nonQualifiees.slice(0, 20).map((a, i) => (
            <Carte key={`n${i}`} a={a} />
          ))}

          {horsSujet.length > 0 ? (
            <Text style={cardMeta}>
              {horsSujet.length} annonce(s) hors sujet masquée(s)
              {appUrl ? (
                <>
                  {' — '}
                  <Link href={appUrl} style={cardLink}>
                    voir dans l'écran Veille
                  </Link>
                </>
              ) : null}
            </Text>
          ) : null}

          {appUrl ? (
            <Section style={ctaSection}>
              <Link href={appUrl} style={ctaButton}>
                Ouvrir la veille dans l'app
              </Link>
            </Section>
          ) : null}

          <Hr style={hr} />
          <Text style={footer}>
            RMS Commerce — veille automatique BOAMP, qualifiée par IA. Vous recevez cet e-mail car
            votre adresse est dans la liste des destinataires de la veille.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const annonces = Array.isArray(data['annonces']) ? (data['annonces'] as VeilleRecapAnnonce[]) : []
    const date = data['date'] ?? ''
    const { prioritaires, aCreuser, nonQualifiees } = trierAnnoncesRecap(annonces)
    if (prioritaires.length + aCreuser.length > 0)
      return `Veille AO — ${prioritaires.length} prioritaire(s), ${aCreuser.length} à creuser (${date})`
    if (nonQualifiees.length > 0)
      return `Veille AO — ${nonQualifiees.length} nouvelle(s) annonce(s) (${date})`
    return `Veille AO — aucune nouvelle annonce pertinente (${date})`
  },
  displayName: 'Récapitulatif quotidien veille AO',
  previewData: {
    date: '03/09/2026',
    collectees: 412,
    retenues: 6,
    annonces: [
      {
        intitule: 'Modernisation de l’éclairage public — centre-bourg',
        acheteur: 'Ville de Boulogne-Billancourt',
        departement: '92',
        date_limite: '2026-09-25',
        lien: 'https://www.boamp.fr/',
        domaines: ['Éclairage public'],
        qualif_statut: 'qualifie',
        entite: 'MESELEC',
        decision: 'prioritaire',
        score: 82,
        resume: 'Rénovation LED de 450 points lumineux, accord-cadre 4 ans.',
        interet_relationnel: true,
        exigences: { avis_insuffisant: false, visite_obligatoire: true },
        plateforme: 'Maximilien',
        dce_url: 'https://marches.maximilien.fr/entreprise/consultation/950530',
        url_dce: 'https://marches.maximilien.fr/entreprise/consultation/123456',
        points: [
          'Visite obligatoire (14/09/2026, 10h)',
          'Certifications : Qualifelec EP2 ou équivalent, AIPR exigée',
        ],
      },
      {
        intitule: 'Travaux VRD et réseaux — opération logements',
        acheteur: 'CA de Marne-la-Vallée',
        departement: '77',
        date_limite: '2026-09-30',
        lien: 'https://www.boamp.fr/',
        domaines: ['VRD', 'Réseaux'],
        qualif_statut: 'qualifie',
        entite: 'MESTP',
        decision: 'a_creuser',
        score: 55,
        resume: 'VRD et réseaux secs pour 120 logements ; MASE exigée.',
        certif_manquante: true,
        exigences: { avis_insuffisant: false, visite_obligatoire: false },
        plateforme: 'AWS',
        dce_url: null,
      },
    ],
    appUrl: 'https://commerce.rmsenergies.com/veille',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '600px' }
const title = { fontSize: '22px', margin: '0 0 4px', color: '#111827' }
const subtitle = { fontSize: '14px', color: '#6b7280', margin: '0 0 16px' }
const statsBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '16px',
}
const statsText = { fontSize: '14px', color: '#374151', margin: '0' }
const emptyText = { fontSize: '14px', color: '#374151' }
const card = {
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '10px',
}
const cardTitle = { fontSize: '14px', fontWeight: 'bold' as const, margin: '0 0 4px' }
const cardLink = { color: '#1d4ed8', textDecoration: 'none' }
const h2 = { fontSize: '16px', color: '#111827', margin: '18px 0 8px' }
const cardResume = { fontSize: '13px', color: '#374151', margin: '6px 0' }
const badge = {
  display: 'inline-block',
  backgroundColor: '#fef3c7',
  color: '#92400e',
  borderRadius: '4px',
  padding: '1px 6px',
  marginRight: '4px',
  fontSize: '11px',
}
const dceLink = { color: '#1d4ed8', fontWeight: 'bold' as const }
const warnBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '10px 16px',
  marginBottom: '12px',
}
const warnText = { fontSize: '13px', color: '#991b1b', margin: '0' }
const cardMeta = { fontSize: '12px', color: '#6b7280', margin: '2px 0' }
const cardPoint = { fontSize: '12px', color: '#92400e', margin: '2px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '20px 0' }
const ctaButton = {
  backgroundColor: '#1d4ed8',
  color: '#ffffff',
  padding: '10px 20px',
  borderRadius: '8px',
  fontSize: '14px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0 12px' }
const footer = { fontSize: '11px', color: '#9ca3af' }

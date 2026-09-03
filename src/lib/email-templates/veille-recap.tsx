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
}

interface Props {
  date?: string
  annonces?: VeilleRecapAnnonce[]
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

const Email = ({ date, annonces = [], collectees = 0, retenues = 0, appUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      {annonces.length > 0
        ? `${annonces.length} nouvelle(s) annonce(s) AO détectée(s) — veille du ${date ?? ''}`
        : `Aucune nouvelle annonce AO — veille du ${date ?? ''}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={title}>Veille appels d'offres</Heading>
        <Text style={subtitle}>Récapitulatif quotidien — {date ?? "aujourd\u2019hui"}</Text>

        <Section style={statsBox}>
          <Text style={statsText}>
            <strong>{annonces.length}</strong> nouvelle(s) annonce(s) · {retenues} dans votre
            périmètre sur {collectees} collectées (BOAMP)
          </Text>
        </Section>

        {annonces.length === 0 ? (
          <Text style={emptyText}>
            Aucune nouvelle annonce correspondant à votre périmètre (éclairage public, réseaux
            électriques, CFO, VRD — Île-de-France) n'a été publiée sur la période.
          </Text>
        ) : (
          annonces.slice(0, 20).map((a, i) => (
            <Section key={i} style={card}>
              <Text style={cardTitle}>
                {a.lien ? (
                  <Link href={a.lien} style={cardLink}>
                    {a.intitule}
                  </Link>
                ) : (
                  a.intitule
                )}
              </Text>
              {a.acheteur ? <Text style={cardMeta}>{a.acheteur}</Text> : null}
              <Text style={cardMeta}>
                {a.departement ? `Dép. ${a.departement} · ` : ''}Limite :{' '}
                {formatDate(a.date_limite)}
                {a.domaines.length > 0 ? ` · ${a.domaines.join(', ')}` : ''}
              </Text>
            </Section>
          ))
        )}

        {appUrl ? (
          <Section style={ctaSection}>
            <Link href={appUrl} style={ctaButton}>
              Ouvrir la veille dans l'app
            </Link>
          </Section>
        ) : null}

        <Hr style={hr} />
        <Text style={footer}>
          RMS Commerce — veille automatique BOAMP. Vous recevez cet e-mail car votre adresse est
          dans la liste des destinataires de la veille.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const annonces = data['annonces']
    const date = data['date'] ?? ''
    const n = Array.isArray(annonces) ? annonces.length : 0
    return n > 0
      ? `Veille AO — ${n} nouvelle(s) annonce(s) (${date})`
      : `Veille AO — aucune nouvelle annonce (${date})`
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
      },
      {
        intitule: 'Travaux VRD et réseaux — opération logements',
        acheteur: 'CA de Marne-la-Vallée',
        departement: '77',
        date_limite: '2026-09-30',
        lien: 'https://www.boamp.fr/',
        domaines: ['VRD', 'Réseaux'],
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
const cardMeta = { fontSize: '12px', color: '#6b7280', margin: '2px 0' }
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

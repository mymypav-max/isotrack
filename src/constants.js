// ── Statuts ──────────────────────────────────────────────────
export const STATUS = {
  open: {
    label: 'Ouvert',
    bg: '#FEF2F2',
    color: '#B91C1C',
    dot: '#DC2626',
  },
  inProgress: {
    label: 'En cours',
    bg: '#FFF7ED',
    color: '#C2410C',
    dot: '#EA580C',
  },
  readyToCheck: {
    label: 'Prêt à contrôler',
    bg: '#F1F5F9',
    color: '#334155',
    dot: '#64748B',
  },
  closed: {
    label: 'Fermé',
    bg: '#F0FDF4',
    color: '#15803D',
    dot: '#16A34A',
  },
}

// ── Criticités ───────────────────────────────────────────────
export const CRITICALITY = {
  blocking: {
    label: 'Bloquante',
    bg: '#FEF2F2',
    color: '#B91C1C',
  },
  major: {
    label: 'Majeure',
    bg: '#FFF7ED',
    color: '#C2410C',
  },
  minor: {
    label: 'Mineure',
    bg: '#F1F5F9',
    color: '#475569',
  },
  remark: {
    label: 'Observation',
    bg: '#F5F5F4',
    color: '#6B7280',
  },
}

// ── Types de visite ──────────────────────────────────────────
export const VISIT_TYPE = {
  opr: {
    label: 'OPR',
    bg: '#FFF7ED',
    color: '#C2410C',
  },
  reception: {
    label: 'Réception',
    bg: '#F0FDF4',
    color: '#15803D',
  },
  levee: {
    label: 'Levée de réserves',
    bg: '#F0FDF4',
    color: '#166534',
  },
  inspection: {
    label: 'Inspection',
    bg: '#F1F5F9',
    color: '#334155',
  },
  walkthrough: {
    label: 'Tournée chantier',
    bg: '#F5F5F4',
    color: '#374151',
  },
}

// ── Types de document ────────────────────────────────────────
export const DOC_TYPE = {
  isometric:  { label: 'Isométrique', color: '#374151' },
  pid:        { label: 'P&ID',        color: '#374151' },
  system:     { label: 'Système',     color: '#374151' },
  ga:         { label: 'Plan GA',     color: '#374151' },
  equipment:  { label: 'Équipement',  color: '#374151' },
  line:       { label: 'Ligne',       color: '#374151' },
}

// ── Disciplines ──────────────────────────────────────────────
export const DISCIPLINES = [
  'Tuyauterie',
  'Instrumentation',
  'Électrique',
  'Génie civil',
  'Mécanique',
  'Calorifuge',
  'Peinture',
  'Autre',
]

// ── Rôles contacts ───────────────────────────────────────────
export const CONTACT_ROLES = {
  moa:            'MOA',
  moe:            'MOE',
  client:         'Client',
  inspection:     'Inspection',
  coordinator:    'Coordinateur',
  mainContractor: 'Ent. principale',
  supplier:       'Fournisseur',
  other:          'Autre',
}

// ── Transitions de statut autorisées ────────────────────────
export const STATUS_TRANSITIONS = {
  open:         ['inProgress'],
  inProgress:   ['readyToCheck'],
  readyToCheck: ['closed', 'inProgress'],
  closed:       ['inProgress'],
}
// ── Palette couleurs lots de travaux ─────────────────────────
// Couleurs industrielles distinctes, lisibles sur fond blanc et sur plan
export const LOT_COLORS = [
  { value: '#EA580C', label: 'Orange' },
  { value: '#1D4ED8', label: 'Bleu' },
  { value: '#166534', label: 'Vert' },
  { value: '#991B1B', label: 'Rouge' },
  { value: '#6B21A8', label: 'Violet' },
  { value: '#0F766E', label: 'Teal' },
  { value: '#B45309', label: 'Ambre' },
  { value: '#1E3A5F', label: 'Marine' },
  { value: '#BE185D', label: 'Rose' },
  { value: '#0369A1', label: 'Ciel' },
  { value: '#4D7C0F', label: 'Olive' },
  { value: '#374151', label: 'Ardoise' },
]

// Couleur par défaut si lot sans couleur ou observation sans lot
export const DEFAULT_PIN_COLOR = '#374151'
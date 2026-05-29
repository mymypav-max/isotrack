import { jsPDF } from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'
import { Engine } from './syncEngine'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

// ── Constantes ────────────────────────────────────────────────
const W = 210, H = 297, M = 14
const ORANGE   = [234, 88, 12]
const DARK     = [17, 24, 39]
const NAVY     = [30, 58, 95]
const GREY     = [107, 114, 128]
const SUBTLE   = [156, 163, 175]
const BORDER   = [226, 232, 240]
const LIGHT    = [249, 250, 251]
const WHITE    = [255, 255, 255]
const GREEN    = [21, 128, 61]
const RED      = [185, 28, 28]

const VISIT_LABELS = {
  opr: 'OPR', reception: 'Réception', levee: 'Levée de réserves',
  inspection: 'Inspection', walkthrough: 'Tournée chantier',
}
const STATUS_INFO = {
  open:         { label: 'Ouvert',       bg: [254,242,242], fg: RED    },
  inProgress:   { label: 'En cours',     bg: [255,247,237], fg: ORANGE },
  readyToCheck: { label: 'À contrôler',  bg: [241,245,249], fg: [51,65,85]  },
  closed:       { label: 'Fermé',        bg: [240,253,244], fg: GREEN  },
}
const CRIT_INFO = {
  blocking: { label: 'Bloquante',   bg: [254,242,242], fg: RED    },
  major:    { label: 'Majeure',     bg: [255,247,237], fg: ORANGE },
  minor:    { label: 'Mineure',     bg: [241,245,249], fg: [71,85,105]  },
  remark:   { label: 'Observation', bg: [245,245,244], fg: GREY   },
}
const ROLE_LABELS = {
  moa: 'Maître d\'ouvrage', moe: 'Maître d\'œuvre', client: 'Client',
  inspection: 'Inspection', coordinator: 'Coordinateur',
  mainContractor: 'Ent. principale', supplier: 'Fournisseur', other: 'Autre',
}

const hex2rgb = h => h ? [1,3,5].map(i => parseInt(h.slice(i,i+2), 16)) : [156,163,175]

// ── Section header (orange bold caps + ligne) ─────────────────
const sectionTitle = (pdf, text, y) => {
  pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...ORANGE)
  pdf.text(text, M, y)
  pdf.setDrawColor(...ORANGE); pdf.setLineWidth(0.5)
  pdf.line(M, y+1.5, W-M, y+1.5)
  return y + 7
}

// ── Sous-titre de section ─────────────────────────────────────
const subTitle = (pdf, text, y) => {
  pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
  pdf.text(text, M, y)
  pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
  pdf.line(M, y+1.5, W-M, y+1.5)
  return y + 6
}

// ── Footer ────────────────────────────────────────────────────
const drawFooter = (pdf, dateStr, pageN, totalPages) => {
  pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
  pdf.line(M, H-12, W-M, H-12)
  pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...GREY)
  pdf.text(`Rapport du ${dateStr}`, M, H-7)
  pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
  pdf.text(`Page ${pageN}${totalPages ? ` / ${totalPages}` : ''}`, W-M, H-7, { align:'right' })
}

// ── Pill ──────────────────────────────────────────────────────
const pill = (pdf, text, x, y, bg, fg, w=26) => {
  pdf.setFillColor(...bg); pdf.roundedRect(x, y, w, 5.5, 1, 1, 'F')
  pdf.setTextColor(...fg); pdf.setFontSize(6); pdf.setFont('helvetica','bold')
  pdf.text(text, x+w/2, y+3.8, { align:'center' })
}

// ── Cercle présence ───────────────────────────────────────────
const presenceCircle = (pdf, x, y, letter, color) => {
  pdf.setFillColor(...LIGHT); pdf.setDrawColor(...color)
  pdf.setLineWidth(0.5); pdf.circle(x, y, 3.5, 'FD')
  pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...color)
  pdf.text(letter, x, y+2, { align:'center' })
}

// ── Pin sur canvas ────────────────────────────────────────────
const drawPin = (ctx, x, y, hexColor, number) => {
  const [r,g,b] = hex2rgb(hexColor)
  const R = 20, cx = x, cy = y - R*2.1
  ctx.save()
  ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=10; ctx.shadowOffsetY=4
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2)
  ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fill()
  ctx.strokeStyle='white'; ctx.lineWidth=3.5; ctx.stroke()
  ctx.shadowBlur=0
  ctx.beginPath(); ctx.moveTo(cx-7,cy+R-4); ctx.lineTo(cx+7,cy+R-4); ctx.lineTo(cx,y)
  ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.fillStyle='white'
  const ns = String(number)
  ctx.font=`bold ${ns.length>2?14:17}px Helvetica,Arial,sans-serif`
  ctx.textAlign='center'; ctx.textBaseline='middle'
  ctx.fillText(ns, cx, cy)
  ctx.restore()
}

// ── PAGE 1 : Infos projet + Participants ──────────────────────
const drawPage1 = (pdf, project, visit, observations, lots, contacts, dateStr) => {
  pdf.setFillColor(...WHITE); pdf.rect(0,0,W,H,'F')

  let y = M + 4

  // ── Titre visite + date ───────────────────────────────────
  const visitTitle = visit
    ? `${VISIT_LABELS[visit.type]||visit.type} - ${visit.title}`.toUpperCase()
    : project.name.toUpperCase()

  pdf.setFontSize(20); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
  const titleLines = pdf.splitTextToSize(visitTitle, 130)
  pdf.text(titleLines, M, y+8)

  if (visit?.date) {
    pdf.setFontSize(18); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
    pdf.text(visit.date, W-M, y+8, { align:'right' })
  }
  y += titleLines.length * 8 + 4

  // Séparateur noir épais
  pdf.setDrawColor(...DARK); pdf.setLineWidth(0.8)
  pdf.line(M, y, W-M, y)
  y += 8

  // ── INFORMATIONS SUR LE PROJET ───────────────────────────
  y = sectionTitle(pdf, 'INFORMATIONS SUR LE PROJET', y)

  const PHOTO_SIZE = 68
  const INFO_W     = W - 2*M - PHOTO_SIZE - 10
  const PHOTO_X    = W - M - PHOTO_SIZE

  // Photo carrée
  if (project.photoData) {
    try {
      // Fond sombre pour letterboxing
      pdf.setFillColor(30, 41, 59)
      pdf.rect(PHOTO_X, y, PHOTO_SIZE, PHOTO_SIZE, 'F')
      pdf.addImage(project.photoData, 'JPEG', PHOTO_X, y, PHOTO_SIZE, PHOTO_SIZE, '', 'NONE')
      pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
      pdf.rect(PHOTO_X, y, PHOTO_SIZE, PHOTO_SIZE, 'S')
    } catch(e) {}
  } else {
    pdf.setFillColor(241, 245, 249)
    pdf.rect(PHOTO_X, y, PHOTO_SIZE, PHOTO_SIZE, 'F')
    pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
    pdf.rect(PHOTO_X, y, PHOTO_SIZE, PHOTO_SIZE, 'S')
    pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.setTextColor(...GREY)
    pdf.text('Aucune photo', PHOTO_X+PHOTO_SIZE/2, y+PHOTO_SIZE/2, { align:'center' })
  }

  // Infos gauche
  let iy = y + 4
  const fields = [
    { label:'Nom',                 value: project.name           },
    { label:'Adresse',             value: project.address        },
    { label:'Type de construction',value: project.constructionType},
  ].filter(f => f.value)

  fields.forEach(({ label, value }) => {
    pdf.setFontSize(7); pdf.setFont('helvetica','bold'); pdf.setTextColor(...GREY)
    pdf.text(label, M, iy); iy += 4
    pdf.setFontSize(9.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...NAVY)
    const vl = pdf.splitTextToSize(value, INFO_W)
    pdf.text(vl, M, iy); iy += vl.length*5 + 7
  })

  y = Math.max(iy, y + PHOTO_SIZE) + 8

  // ── PARTICIPANTS ──────────────────────────────────────────
  // Header + légende présence
  pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...ORANGE)
  pdf.text('PARTICIPANTS', M, y)
  pdf.setDrawColor(...ORANGE); pdf.setLineWidth(0.5)
  pdf.line(M, y+1.5, W-M, y+1.5)

  // Légende présence (droite)
  const legends = [
    { l:'P', label:'Présent',  c:[21,128,61]  },
    { l:'R', label:'Retard',   c:[234,88,12]  },
    { l:'A', label:'Absent',   c:[185,28,28]  },
    { l:'E', label:'Excusé',   c:[107,114,128]},
  ]
  let lx = W-M
  legends.slice().reverse().forEach(({ l, label, c }) => {
    pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(...c)
    const lw = pdf.getTextWidth(label)
    lx -= lw; pdf.text(label, lx, y-0.5); lx -= 2
    presenceCircle(pdf, lx-3.5, y-2, l, c); lx -= 10
  })
  y += 7

  if (contacts.length === 0) {
    pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(...GREY)
    pdf.text('Aucun contact enregistré.', M, y); y += 10
  } else {
    // Séparer MOA/MOE des entreprises (lots)
    const projectContacts = contacts.filter(c => ['moa','moe','client','inspection','coordinator'].includes(c.role))
    const companyContacts  = contacts.filter(c => ['mainContractor','supplier','other'].includes(c.role))

    const drawContactTable = (list) => {
      // En-tête tableau
      const COLS = [
        { label:'Rôle',             x:M,    w:28 },
        { label:'Contact',          x:M+29, w:38 },
        { label:'Email & Téléphone',x:M+68, w:52 },
        { label:'Présence',         x:M+121,w:18 },
        { label:'Convoqué',         x:M+140,w:18 },
      ]
      pdf.setFillColor(245,247,250)
      pdf.rect(M, y, W-2*M, 6, 'F')
      COLS.forEach(c => {
        pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...GREY)
        pdf.text(c.label, c.x+1, y+4.2)
      })
      pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.25)
      pdf.line(M, y+6, W-M, y+6)

      let ty = y + 6
      list.forEach((c, i) => {
        if (ty + 12 > H-18) return // Skip if no space

        pdf.setFillColor(...(i%2===0 ? WHITE : LIGHT))
        pdf.rect(M, ty, W-2*M, 11, 'F')
        pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.2)
        pdf.line(M, ty+11, W-M, ty+11)

        // Rôle
        pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(...DARK)
        pdf.text(ROLE_LABELS[c.role]||c.role||'—', M+1, ty+5)

        // Contact (nom bold navy + société)
        pdf.setFont('helvetica','bold'); pdf.setTextColor(...NAVY)
        pdf.text(c.name, M+30, ty+4.5)
        if (c.company) {
          pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(...GREY)
          pdf.text(c.company, M+30, ty+9)
        }

        // Email & Tel
        pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...DARK)
        if (c.email) pdf.text(c.email, M+69, ty+4.5)
        if (c.phone) pdf.text(c.phone, M+69, ty+9)

        // Cercles présence / convoqué (vides — à remplir manuellement)
        pdf.setDrawColor(...SUBTLE); pdf.setLineWidth(0.5)
        pdf.circle(M+130, ty+5.5, 3, 'S')
        pdf.circle(M+149, ty+5.5, 3, 'S')

        ty += 11
      })
      return ty
    }

    if (projectContacts.length > 0) {
      y = subTitle(pdf, 'PERSONNES RELATIVES AU PROJET', y)
      y = drawContactTable(projectContacts)
      y += 6
    }

    if (companyContacts.length > 0 && y < H-40) {
      y = subTitle(pdf, 'ENTREPRISES', y)

      // Table entreprises avec couleur de lot
      const COLS2 = [
        { label:'Rôle / Lot',        x:M,    w:35 },
        { label:'Contact',           x:M+36, w:35 },
        { label:'Email & Téléphone', x:M+72, w:52 },
        { label:'Présence',          x:M+125,w:18 },
        { label:'Convoqué',          x:M+144,w:18 },
      ]
      pdf.setFillColor(245,247,250)
      pdf.rect(M, y, W-2*M, 6, 'F')
      COLS2.forEach(c => {
        pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...GREY)
        pdf.text(c.label, c.x+1, y+4.2)
      })
      pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.25)
      pdf.line(M, y+6, W-M, y+6)
      let ty = y + 6

      companyContacts.forEach((c, i) => {
        if (ty + 12 > H-18) return
        pdf.setFillColor(...(i%2===0 ? WHITE : LIGHT))
        pdf.rect(M, ty, W-2*M, 11, 'F')
        pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.2)
        pdf.line(M, ty+11, W-M, ty+11)

        // Lot associé (si trouvable par nom de société)
        const lot = lots.find(l => l.company === c.company || l.contact === c.name)
        if (lot) {
          const [lr,lg,lb] = hex2rgb(lot.color)
          pdf.setFillColor(lr,lg,lb); pdf.rect(M, ty, 2.5, 11, 'F')
          pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(lr,lg,lb)
          pdf.text(lot.name, M+4, ty+5)
        } else {
          pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...DARK)
          pdf.text(ROLE_LABELS[c.role]||c.role||'—', M+4, ty+5)
        }
        if (c.company) {
          pdf.setFontSize(6.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...GREY)
          pdf.text(c.company, M+4, ty+9.5)
        }

        pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(...NAVY)
        pdf.text(c.name, M+37, ty+4.5)
        if (c.company) {
          pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(...GREY)
          pdf.text(c.company, M+37, ty+9)
        }

        pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...DARK)
        if (c.email) pdf.text(c.email, M+73, ty+4.5)
        if (c.phone) pdf.text(c.phone, M+73, ty+9)

        pdf.setDrawColor(...SUBTLE); pdf.setLineWidth(0.5)
        pdf.circle(M+134, ty+5.5, 3, 'S')
        pdf.circle(M+153, ty+5.5, 3, 'S')

        ty += 11
      })
      y = ty
    }
  }

  drawFooter(pdf, dateStr, 1)
}

// ── EXPORT PRINCIPAL ──────────────────────────────────────────
export const generateReport = async (
  { project, visits, observations, lots, documents, contacts },
  onProgress = () => {}
) => {
  const pdf     = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const visit   = visits.find(v=>v.status==='active') || visits[0] || null
  const dateStr = new Date().toLocaleDateString('fr-FR')
  let   page    = 1

  const CONTENT_TOP    = 16
  const CONTENT_BOTTOM = H - 16

  // ── Page 1 : Infos + Participants ─────────────────────────
  onProgress(5, 'Page de garde...')
  drawPage1(pdf, project, visit, observations, lots, contacts, dateStr)

  // ── Récapitulatif des observations ───────────────────────
  onProgress(18, 'Récapitulatif...')
  pdf.addPage(); page++

  pdf.setFillColor(...WHITE); pdf.rect(0,0,W,H,'F')
  let y = M + 4
  y = sectionTitle(pdf, 'RÉCAPITULATIF DES OBSERVATIONS', y)

  // Statistiques
  const statBoxes = [
    { l:'Total',      v:observations.length,                                                             c:DARK   },
    { l:'Ouvertes',   v:observations.filter(o=>o.status==='open').length,                                c:RED    },
    { l:'En cours',   v:observations.filter(o=>o.status==='inProgress').length,                          c:ORANGE },
    { l:'Fermées',    v:observations.filter(o=>o.status==='closed').length,                              c:GREEN  },
    { l:'Bloquantes', v:observations.filter(o=>o.criticality==='blocking'&&o.status!=='closed').length,  c:RED    },
  ]
  const bw = (W-2*M-16)/5
  statBoxes.forEach(({ l, v, c }, i) => {
    const bx = M + i*(bw+4)
    pdf.setFillColor(...LIGHT); pdf.roundedRect(bx, y, bw, 20, 1.5, 1.5, 'F')
    pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
    pdf.roundedRect(bx, y, bw, 20, 1.5, 1.5, 'S')
    pdf.setFillColor(...c); pdf.rect(bx, y, bw, 1.5, 'F')
    pdf.setFontSize(16); pdf.setFont('helvetica','bold'); pdf.setTextColor(...c)
    pdf.text(String(v), bx+bw/2, y+12, { align:'center' })
    pdf.setFontSize(6.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...GREY)
    pdf.text(l, bx+bw/2, y+18, { align:'center' })
  })
  y += 26

  // Table récap
  const obsGrouped = [
    ...lots.map(lot => ({ lot, obs: observations.filter(o=>o.lotId===lot.id) })).filter(g=>g.obs.length>0),
    ...(observations.filter(o=>!o.lotId).length>0 ? [{ lot:null, obs:observations.filter(o=>!o.lotId) }] : []),
  ]

  obsGrouped.forEach(({ lot, obs: gObs }) => {
    const lotColor = lot ? hex2rgb(lot.color) : [100,116,139]
    const lotName  = lot?.name || 'Sans lot'

    if (y + 8 > CONTENT_BOTTOM) {
      pdf.addPage(); page++
      pdf.setFillColor(...WHITE); pdf.rect(0,0,W,H,'F')
      y = M + 4; y = sectionTitle(pdf, 'RÉCAPITULATIF (suite)', y)
    }

    // Barre de lot
    pdf.setFillColor(...lotColor); pdf.rect(M, y, W-2*M, 7, 'F')
    pdf.setTextColor(...WHITE); pdf.setFontSize(8); pdf.setFont('helvetica','bold')
    pdf.text(lotName.toUpperCase(), M+3, y+5)
    if (lot?.company) {
      pdf.setFont('helvetica','normal'); pdf.setFontSize(7)
      pdf.text(lot.company, W-M-3, y+5, { align:'right' })
    }
    y += 7

    // En-tête colonnes
    const PC = [
      { l:'N°',      x:M,    w:10 },
      { l:'Titre',   x:M+11, w:72 },
      { l:'Statut',  x:M+85, w:28 },
      { l:'Criticité',x:M+115,w:28},
      { l:'Délai',   x:M+145,w:28 },
    ]
    pdf.setFillColor(245,247,250); pdf.rect(M, y, W-2*M, 6, 'F')
    PC.forEach(c => {
      pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...GREY)
      pdf.text(c.l, c.x+1, y+4.2)
    })
    y += 6

    gObs.forEach((obs, i) => {
      if (y+8 > CONTENT_BOTTOM) {
        pdf.addPage(); page++
        pdf.setFillColor(...WHITE); pdf.rect(0,0,W,H,'F')
        y = M+4; y = sectionTitle(pdf, 'RÉCAPITULATIF (suite)', y)
      }
      pdf.setFillColor(...(i%2===0 ? WHITE : LIGHT))
      pdf.rect(M, y, W-2*M, 8, 'F')
      pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.2)
      pdf.line(M, y+8, W-M, y+8)

      // Numéro avec couleur lot
      pdf.setFillColor(...lotColor); pdf.roundedRect(M+0.5, y+1, 8.5, 6, 1, 1, 'F')
      pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...WHITE)
      pdf.text(String(obs.number), M+4.75, y+5.2, { align:'center' })

      // Titre
      const t = pdf.splitTextToSize(obs.title, 68)[0]
      const tLong = pdf.splitTextToSize(obs.title, 68).length > 1
      pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(...DARK)
      pdf.text(t+(tLong?'…':''), M+12, y+5.2)

      // Statut
      const si = STATUS_INFO[obs.status] || STATUS_INFO.open
      pill(pdf, si.label, M+86, y+1.2, si.bg, si.fg, 26)

      // Criticité
      const ci = CRIT_INFO[obs.criticality] || CRIT_INFO.remark
      pill(pdf, ci.label, M+116, y+1.2, ci.bg, ci.fg, 26)

      // Délai
      pdf.setFontSize(7.5); pdf.setFont('helvetica','normal')
      pdf.setTextColor(...(obs.dueDate ? DARK : SUBTLE))
      pdf.text(obs.dueDate||'—', M+146, y+5.2)

      y += 8
    })
    y += 4
  })

  drawFooter(pdf, dateStr, page)

  // ── Fiches détaillées par lot ─────────────────────────────
  onProgress(30, 'Fiches détaillées...')
  const totalObs = observations.length; let doneObs = 0

  for (const { lot, obs: gObs } of obsGrouped) {
    const lotColor = lot ? hex2rgb(lot.color) : [100,116,139]
    const lotName  = lot?.name || 'Sans lot'

    for (const obs of gObs) {
      doneObs++
      onProgress(30 + (doneObs/totalObs)*35, `Obs. #${obs.number}...`)

      const photos   = await Engine.getPhotos(obs.id)
      const comments = await Engine.getComments(obs.id)

      pdf.addPage(); page++
      pdf.setFillColor(...WHITE); pdf.rect(0,0,W,H,'F')

      y = M + 4

      // Header observation
      pdf.setFillColor(...lotColor); pdf.rect(M, y, W-2*M, 0.8, 'F')
      y += 4

      // Numéro + titre
      pdf.setFillColor(...lotColor); pdf.roundedRect(M, y, 14, 14, 2, 2, 'F')
      pdf.setTextColor(...WHITE); pdf.setFontSize(obs.number>99?7:10); pdf.setFont('helvetica','bold')
      pdf.text(String(obs.number), M+7, y+9.5, { align:'center' })

      pdf.setTextColor(...DARK); pdf.setFontSize(13); pdf.setFont('helvetica','bold')
      const tLines = pdf.splitTextToSize(obs.title, W-2*M-18)
      pdf.text(tLines, M+17, y+8)
      y += Math.max(16, tLines.length*6+4)

      // Pills
      const si = STATUS_INFO[obs.status]||STATUS_INFO.open
      const ci = CRIT_INFO[obs.criticality]||CRIT_INFO.remark
      pill(pdf, si.label, M, y, si.bg, si.fg, 28)
      pill(pdf, ci.label, M+31, y, ci.bg, ci.fg, 26)
      y += 9

      // Méta
      pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...GREY)
      const meta = [
        obs.discipline   && `Discipline : ${obs.discipline}`,
        obs.responsible  && `Responsable : ${obs.responsible}`,
        obs.dueDate      && `Délai : ${obs.dueDate}`,
      ].filter(Boolean)
      if (meta.length) { pdf.text(meta.join('   ·   '), M, y); y += 6 }

      // Séparateur
      pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
      pdf.line(M, y, W-M, y); y += 6

      // Description
      if (obs.description) {
        pdf.setFillColor(249,250,251)
        const dl = pdf.splitTextToSize(obs.description, W-24)
        pdf.roundedRect(M, y, W-2*M, dl.length*4.8+7, 2, 2, 'F')
        pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.setTextColor(...DARK)
        pdf.text(dl, M+4, y+5); y += dl.length*4.8+11
      }

      // Photos
      if (photos.length > 0) {
        pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
        pdf.text(`Photos (${photos.length})`, M, y); y += 5
        const PW=43, PH=33, GAP=4, PER_ROW=4
        let px=M, ry=y
        for (let i=0; i<Math.min(photos.length,8); i++) {
          if (i>0 && i%PER_ROW===0) { ry+=PH+GAP; px=M }
          if (ry+PH > CONTENT_BOTTOM) {
            drawFooter(pdf, dateStr, page)
            pdf.addPage(); page++
            pdf.setFillColor(...WHITE); pdf.rect(0,0,W,H,'F')
            ry=M+6; px=M
          }
          if (photos[i]?.data) {
            try {
              pdf.setFillColor(220,220,220); pdf.rect(px+1,ry+1,PW,PH,'F')
              pdf.addImage(photos[i].data,'JPEG',px,ry,PW,PH)
              pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
              pdf.rect(px,ry,PW,PH,'S')
            } catch(e) {}
          }
          px += PW+GAP
        }
        y = ry+PH+8
      }

      // Commentaires
      if (comments.length > 0 && y < CONTENT_BOTTOM-10) {
        pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
        pdf.text(`Commentaires (${comments.length})`, M, y); y += 5
        comments.forEach(c => {
          if (y+10 > CONTENT_BOTTOM) return
          const cl = pdf.splitTextToSize(c.text||c.content||'', W-24)
          pdf.setFillColor(249,250,251)
          pdf.roundedRect(M, y, W-2*M, cl.length*4.5+7, 1.5, 1.5, 'F')
          pdf.setFontSize(7); pdf.setFont('helvetica','bold'); pdf.setTextColor(...ORANGE)
          pdf.text(c.author||'', M+4, y+4.5)
          pdf.setFont('helvetica','normal'); pdf.setTextColor(...GREY)
          if (c.createdAt) pdf.text(new Date(c.createdAt).toLocaleDateString('fr-FR'), W-M-3, y+4.5, { align:'right' })
          pdf.setFontSize(8.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...DARK)
          pdf.text(cl, M+4, y+9); y += cl.length*4.5+11
        })
      }

      drawFooter(pdf, dateStr, page)
    }
  }

  // ── Plans avec pins ───────────────────────────────────────
  const docsWithPins = []
  for (const doc of documents) {
    const pins = await Engine.getPins(doc.id)
    if (pins.length > 0) docsWithPins.push({ doc, pins })
  }

  for (let di=0; di<docsWithPins.length; di++) {
    const { doc, pins } = docsWithPins[di]
    onProgress(68+(di/Math.max(docsWithPins.length,1))*28, `Plan : ${doc.name}...`)

    const fileData = await Engine.getDocumentFile(doc)
    if (!fileData) continue

    let pdfJs
    try { pdfJs = await pdfjsLib.getDocument({ data: new Uint8Array(fileData.slice(0)) }).promise }
    catch(e) { continue }

    for (let pageIdx=0; pageIdx<pdfJs.numPages; pageIdx++) {
      const pagePins = pins.filter(p=>p.pageIndex===pageIdx)
      try {
        const pdfPage  = await pdfJs.getPage(pageIdx+1)
        const viewport = pdfPage.getViewport({ scale:2.2 })
        const canvas   = globalThis.document.createElement('canvas')
        canvas.width   = viewport.width; canvas.height = viewport.height
        const ctx      = canvas.getContext('2d')
        await pdfPage.render({ canvasContext:ctx, viewport }).promise

        for (const pin of pagePins) {
          const obs = observations.find(o=>o.id===pin.observationId)
          const lot = obs?.lotId ? lots.find(l=>l.id===obs.lotId) : null
          drawPin(ctx, pin.normalizedX*canvas.width, pin.normalizedY*canvas.height, lot?.color||'#9CA3AF', obs?.number??'?')
        }

        const isLandscape = canvas.width > canvas.height
        pdf.addPage(isLandscape ? [297,210] : [210,297]); page++
        const PW = isLandscape ? 297 : 210
        const PH = isLandscape ? 210 : 297
        const maxW = PW-2*M, maxH = PH-2*M
        const ratio = canvas.width/canvas.height
        let iw=maxW, ih=iw/ratio
        if (ih>maxH) { ih=maxH; iw=ih*ratio }
        pdf.addImage(canvas.toDataURL('image/jpeg',0.88),'JPEG', M+(maxW-iw)/2, M+(maxH-ih)/2, iw, ih)

        // Mini header sur le plan
        pdf.setFillColor(255,255,255,200)
        pdf.rect(M, M, iw, 8, 'F')
        pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
        pdf.text(doc.name, M+2, M+5.5)
        if (pagePins.length > 0) {
          pdf.setFont('helvetica','normal'); pdf.setTextColor(...GREY)
          pdf.text(`${pagePins.length} pin${pagePins.length>1?'s':''}  ·  p.${pageIdx+1}/${pdfJs.numPages}`, PW-M-2, M+5.5, { align:'right' })
        }

      } catch(e) { continue }
    }
    try { pdfJs.destroy() } catch(e) {}
  }

  onProgress(100, 'Terminé !')
  return pdf
}
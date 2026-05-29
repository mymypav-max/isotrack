import { jsPDF } from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'
import { Engine } from './syncEngine'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url,
).href

// ── Constantes ────────────────────────────────────────────────
const W = 210, H = 297, M = 14
const ORANGE    = [234, 88, 12]
const OG_LIGHT  = [255, 237, 213]
const DARK      = [17, 24, 39]
const SLATE     = [51, 65, 85]
const MUTED     = [100, 116, 139]
const SUBTLE    = [148, 163, 184]
const LIGHT     = [248, 250, 252]
const BORDER    = [226, 232, 240]
const WHITE     = [255, 255, 255]
const GREEN     = [21, 128, 61]
const RED       = [185, 28, 28]

const VISIT_LABELS = {
  opr:'OPR', reception:'Réception', levee:'Levée de réserves',
  inspection:'Inspection', walkthrough:'Tournée chantier',
}
const STATUS_INFO = {
  open:         { label:'Ouvert',       bg:[254,242,242], fg:RED             },
  inProgress:   { label:'En cours',     bg:[255,247,237], fg:ORANGE          },
  readyToCheck: { label:'À contrôler',  bg:[241,245,249], fg:SLATE           },
  closed:       { label:'Fermé',        bg:[240,253,244], fg:GREEN           },
}
const CRIT_INFO = {
  blocking: { label:'Bloquante',   bg:[254,242,242], fg:RED    },
  major:    { label:'Majeure',     bg:[255,247,237], fg:ORANGE },
  minor:    { label:'Mineure',     bg:[241,245,249], fg:SLATE  },
  remark:   { label:'Observation', bg:[245,245,244], fg:MUTED  },
}

const hex2rgb = h => h ? [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)) : [156,163,175]

// ── Décoration courante (toutes pages sauf couverture) ────────
const runningPage = (pdf, project, section, pageN) => {
  // Bande latérale orange
  pdf.setFillColor(...ORANGE)
  pdf.rect(0, 0, 3.5, H, 'F')
  // Header
  pdf.setFillColor(...LIGHT)
  pdf.rect(3.5, 0, W-3.5, 13, 'F')
  pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
  pdf.line(3.5, 13, W, 13)
  pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...ORANGE)
  pdf.text('IsoTrack', 7, 8.5)
  pdf.setFont('helvetica','normal'); pdf.setTextColor(...SLATE)
  pdf.text(` — ${project.name}`, 7 + pdf.getTextWidth('IsoTrack'), 8.5)
  if (section) {
    pdf.setTextColor(...MUTED)
    pdf.text(`  ·  ${section}`, 7 + pdf.getTextWidth(`IsoTrack — ${project.name}`), 8.5)
  }
  pdf.setFontSize(8); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
  pdf.text(`${pageN}`, W-M, 8.5, { align:'right' })
  // Footer
  pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.25)
  pdf.line(3.5, H-11, W, H-11)
  pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(...SUBTLE)
  pdf.text('IsoTrack — Rapport d\'observations industrielles', 7, H-6)
  pdf.text(new Date().toLocaleDateString('fr-FR'), W-M, H-6, { align:'right' })
}

// ── Pill colorée ──────────────────────────────────────────────
const drawPill = (pdf, text, x, y, bg, fg, w=26) => {
  pdf.setFillColor(...bg)
  pdf.roundedRect(x, y, w, 5.5, 1, 1, 'F')
  pdf.setTextColor(...fg)
  pdf.setFontSize(6); pdf.setFont('helvetica','bold')
  pdf.text(text, x+w/2, y+3.8, { align:'center' })
}

// ── Dessin pin sur canvas ─────────────────────────────────────
const drawPin = (ctx, x, y, hexColor, number) => {
  const [r,g,b] = hex2rgb(hexColor)
  const R = 20
  const cx = x, cy = y - R*2.1
  ctx.save()
  ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=10; ctx.shadowOffsetY=4
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2)
  ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fill()
  ctx.strokeStyle='white'; ctx.lineWidth=3.5; ctx.stroke()
  ctx.shadowBlur=0
  ctx.beginPath()
  ctx.moveTo(cx-7, cy+R-4); ctx.lineTo(cx+7, cy+R-4); ctx.lineTo(cx, y)
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

// ── COUVERTURE ────────────────────────────────────────────────
const drawCover = (pdf, project, visit, observations, lots) => {
  pdf.setFillColor(250, 250, 249)
  pdf.rect(0, 0, W, H, 'F')

  // Bande orange top
  pdf.setFillColor(...ORANGE)
  pdf.rect(0, 0, W, 30, 'F')
  pdf.setTextColor(...WHITE)
  pdf.setFontSize(8.5); pdf.setFont('helvetica','normal')
  pdf.text('RAPPORT D\'OBSERVATIONS INDUSTRIELLES', M, 11)
  pdf.setFontSize(19); pdf.setFont('helvetica','bold')
  pdf.text('VISITE DE CHANTIER', M, 24)
  // Badge IsoTrack
  pdf.setFillColor(255,255,255,30)
  pdf.roundedRect(W-38, 8, 26, 11, 2, 2, 'F')
  pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(255,255,255)
  pdf.text('IsoTrack', W-25, 15, { align:'center' })

  // Zone photo ou bande sombre
  let photoBottom = 30
  if (project.photoData) {
    try {
      pdf.addImage(project.photoData, 'JPEG', 0, 30, W, 80)
      // Bande noire en bas de la photo pour lisibilité
      pdf.setFillColor(17, 24, 39)
      pdf.rect(0, 95, W, 15, 'F')
      photoBottom = 110
    } catch(e) {
      pdf.setFillColor(30, 41, 59)
      pdf.rect(0, 30, W, 60, 'F')
      photoBottom = 90
    }
  } else {
    pdf.setFillColor(30, 41, 59)
    pdf.rect(0, 30, W, 60, 'F')
    if (project.constructionType) {
      pdf.setFontSize(11); pdf.setFont('helvetica','bold')
      pdf.setTextColor(255,255,255)
      pdf.setTextColor(60, 75, 95)
      pdf.text(project.constructionType.toUpperCase(), W/2, 65, { align:'center' })
    }
    photoBottom = 90
  }

  // Ligne accent orange
  pdf.setFillColor(...ORANGE)
  pdf.rect(0, photoBottom, W, 2, 'F')

  let y = photoBottom + 13

  // Nom du projet
  pdf.setTextColor(...DARK)
  pdf.setFontSize(21); pdf.setFont('helvetica','bold')
  const nameLines = pdf.splitTextToSize(project.name, W-2*M)
  pdf.text(nameLines, M, y)
  y += nameLines.length * 9 + 2

  // Infos projet
  pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.setTextColor(...MUTED)
  const infos = [project.client, project.constructionType, project.address].filter(Boolean)
  if (infos.length) {
    infos.forEach((info, i) => {
      if (i > 0) {
        pdf.setTextColor(...BORDER)
        pdf.text(' · ', M + infos.slice(0,i).reduce((acc,s)=>acc+pdf.getTextWidth(s+' · '),0)-pdf.getTextWidth(' · ')/2, y)
      }
    })
    pdf.setTextColor(...SLATE)
    pdf.text(infos.join('  ·  '), M, y)
    y += 7
  }

  // Ligne séparatrice bicolore
  pdf.setFillColor(...ORANGE); pdf.rect(M, y, 20, 0.8, 'F')
  pdf.setFillColor(...BORDER); pdf.rect(M+20, y, W-2*M-20, 0.8, 'F')
  y += 8

  // Encadré visite
  if (visit) {
    pdf.setFillColor(255, 247, 237)
    pdf.roundedRect(M, y, W-2*M, 28, 2.5, 2.5, 'F')
    pdf.setDrawColor(...ORANGE); pdf.setLineWidth(0.6)
    pdf.roundedRect(M, y, W-2*M, 28, 2.5, 2.5, 'S')

    // Badge type de visite
    pdf.setFillColor(...ORANGE)
    pdf.roundedRect(M+5, y+7, 24, 8, 1.5, 1.5, 'F')
    pdf.setTextColor(...WHITE); pdf.setFontSize(6.5); pdf.setFont('helvetica','bold')
    pdf.text((VISIT_LABELS[visit.type]||visit.type).toUpperCase(), M+17, y+12.5, { align:'center' })

    pdf.setTextColor(...DARK); pdf.setFontSize(12); pdf.setFont('helvetica','bold')
    const vl = pdf.splitTextToSize(visit.title, W-2*M-38)
    pdf.text(vl, M+33, y+12)
    pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.setTextColor(...SLATE)
    pdf.text(visit.date, M+33, y+21)
    y += 36
  }

  // Stats
  const stats = [
    { l:'Total',      v:observations.length,                                                                  c:DARK    },
    { l:'Ouvertes',   v:observations.filter(o=>o.status==='open').length,                                     c:RED     },
    { l:'En cours',   v:observations.filter(o=>o.status==='inProgress').length,                               c:ORANGE  },
    { l:'Fermées',    v:observations.filter(o=>o.status==='closed').length,                                   c:GREEN   },
    { l:'Bloquantes', v:observations.filter(o=>o.criticality==='blocking'&&o.status!=='closed').length,       c:RED     },
  ]
  const bw = (W-2*M-16)/5
  stats.forEach(({ l, v, c }, i) => {
    const bx = M + i*(bw+4)
    pdf.setFillColor(...WHITE)
    pdf.roundedRect(bx, y, bw, 24, 2, 2, 'F')
    pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
    pdf.roundedRect(bx, y, bw, 24, 2, 2, 'S')
    // Accent top
    pdf.setFillColor(...c); pdf.rect(bx, y, bw, 1.5, 'F')
    pdf.setFontSize(18); pdf.setFont('helvetica','bold'); pdf.setTextColor(...c)
    pdf.text(String(v), bx+bw/2, y+14, { align:'center' })
    pdf.setFontSize(6.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...MUTED)
    pdf.text(l, bx+bw/2, y+21, { align:'center' })
  })
  y += 32

  // Lots
  if (lots.length > 0 && y < H-40) {
    pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...MUTED)
    pdf.text('LOTS DE TRAVAUX', M, y); y += 6
    const colW = (W-2*M)/3
    lots.forEach((lot, i) => {
      const lx = M + (i%3)*colW
      const ly = y + Math.floor(i/3)*9
      const [r,g,b] = hex2rgb(lot.color)
      pdf.setFillColor(r,g,b); pdf.circle(lx+3.5, ly+3.5, 3.5, 'F')
      pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
      pdf.text(lot.name, lx+9, ly+5)
      const cnt = observations.filter(o=>o.lotId===lot.id).length
      pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...MUTED)
      pdf.text(`${cnt} obs.`, lx+9+pdf.getTextWidth(lot.name)+2, ly+5)
    })
  }

  // Footer couverture
  pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
  pdf.line(M, H-16, W-M, H-16)
  pdf.setFontSize(7.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...MUTED)
  pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, M, H-9)
  pdf.text('Document confidentiel — Usage interne', W-M, H-9, { align:'right' })
  pdf.text('1', W/2, H-9, { align:'center' })
}

// ── EXPORT PRINCIPAL ──────────────────────────────────────────
export const generateReport = async (
  { project, visits, observations, lots, documents, contacts },
  onProgress = () => {}
) => {
  const pdf   = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const visit = visits.find(v=>v.status==='active') || visits[0] || null
  let   page  = 1
  const CONTENT_TOP    = 17   // après header
  const CONTENT_BOTTOM = H-15 // avant footer

  // ── 1. COUVERTURE ─────────────────────────────────────────
  onProgress(5, 'Couverture...')
  drawCover(pdf, project, visit, observations, lots)

  // ── 2. INFORMATIONS PROJET ────────────────────────────────
  if (project.address || project.constructionType || project.description) {
    onProgress(10, 'Informations projet...')
    pdf.addPage(); page++
    runningPage(pdf, project, 'Informations projet', page)
    let y = CONTENT_TOP + 4

    // Titre section
    pdf.setFontSize(14); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
    pdf.text('Informations projet', 7, y); y += 8

    // Photo + infos côte à côte
    if (project.photoData) {
      try {
        pdf.addImage(project.photoData, 'JPEG', 7, y, 80, 55)
      } catch(e) {}
    }
    const ix = project.photoData ? 95 : 7
    const iw = project.photoData ? W-ix-M : W-2*M

    const fields = [
      { l:'Nom du projet',       v: project.name           },
      { l:'Client / MOA',        v: project.client         },
      { l:'Adresse du chantier', v: project.address        },
      { l:'Type de construction',v: project.constructionType},
    ].filter(f=>f.v)

    let iy = y
    fields.forEach(({ l, v }) => {
      pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...MUTED)
      pdf.text(l.toUpperCase(), ix, iy); iy += 4
      pdf.setFontSize(10); pdf.setFont('helvetica','normal'); pdf.setTextColor(...DARK)
      const vl = pdf.splitTextToSize(v, iw)
      pdf.text(vl, ix, iy); iy += vl.length*5 + 4
    })

    y = Math.max(y + 60, iy) + 6

    if (project.description) {
      pdf.setFillColor(250, 250, 249)
      pdf.roundedRect(7, y, W-14, 6+pdf.splitTextToSize(project.description, W-22).length*5, 2, 2, 'F')
      pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
      pdf.roundedRect(7, y, W-14, 6+pdf.splitTextToSize(project.description, W-22).length*5, 2, 2, 'S')
      pdf.setFontSize(8.5); pdf.setFont('helvetica','normal'); pdf.setTextColor(...SLATE)
      const dl = pdf.splitTextToSize(project.description, W-22)
      pdf.text(dl, 12, y+6)
    }
  }

  // ── 3. PARTICIPANTS ───────────────────────────────────────
  if (contacts.length > 0) {
    onProgress(15, 'Participants...')
    pdf.addPage(); page++
    runningPage(pdf, project, 'Participants', page)
    let y = CONTENT_TOP + 4

    pdf.setFontSize(14); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
    pdf.text('Participants', 7, y); y += 8

    // En-tête tableau
    const cols = [{ l:'Nom',           x:7,   w:50 },
                  { l:'Société',        x:59,  w:45 },
                  { l:'Rôle',           x:106, w:30 },
                  { l:'Contact',        x:138, w:55 },
                  { l:'Signature',      x:168, w:35 }]

    pdf.setFillColor(30, 41, 59)
    pdf.rect(7, y, W-14, 8, 'F')
    cols.forEach(c => {
      pdf.setFontSize(7); pdf.setFont('helvetica','bold'); pdf.setTextColor(...WHITE)
      pdf.text(c.l, c.x+2, y+5.2)
    })
    y += 8

    const roleLabels = { moa:'MOA', moe:'MOE', client:'Client', inspection:'Inspection',
      coordinator:'Coordinateur', mainContractor:'Ent. principale', supplier:'Fournisseur', other:'Autre' }

    contacts.forEach((c, i) => {
      if (y+10 > CONTENT_BOTTOM) {
        pdf.addPage(); page++; runningPage(pdf, project, 'Participants (suite)', page); y=CONTENT_TOP+4
      }
      pdf.setFillColor(...(i%2===0 ? WHITE : LIGHT))
      pdf.rect(7, y, W-14, 9, 'F')
      pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.25)
      pdf.rect(7, y, W-14, 9, 'S')

      pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
      pdf.text(c.name, 9, y+6)
      pdf.setFont('helvetica','normal'); pdf.setTextColor(...SLATE)
      pdf.text(c.company||'—', 61, y+6)
      pdf.text(roleLabels[c.role]||c.role||'—', 108, y+6)
      pdf.setFontSize(7.5); pdf.setTextColor(...MUTED)
      const contact = [c.email, c.phone].filter(Boolean).join(' · ')
      pdf.text(contact||'—', 140, y+6)
      y += 9
    })
  }

  // ── 4. RÉCAPITULATIF (PUNCH LIST) ─────────────────────────
  onProgress(22, 'Récapitulatif...')
  pdf.addPage(); page++
  runningPage(pdf, project, 'Récapitulatif des observations', page)
  let y = CONTENT_TOP + 4

  pdf.setFontSize(14); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
  pdf.text('Récapitulatif des observations', 7, y); y += 9

  // Colonnes punch list
  const PC = [
    { l:'N°',          x:7,   w:10 },
    { l:'Titre',       x:19,  w:70 },
    { l:'Lot',         x:91,  w:28 },
    { l:'Statut',      x:121, w:26 },
    { l:'Criticité',   x:149, w:24 },
    { l:'Délai',       x:175, w:28 },
  ]
  // Header
  pdf.setFillColor(...ORANGE)
  pdf.rect(7, y, W-14, 7, 'F')
  PC.forEach(c => {
    pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...WHITE)
    pdf.text(c.l, c.x+1.5, y+4.7)
  })
  y += 7

  const obsGrouped = [...lots.map(lot=>({lot, obs: observations.filter(o=>o.lotId===lot.id)}))
                              .filter(g=>g.obs.length>0),
                       ...observations.filter(o=>!o.lotId).length>0
                         ? [{lot:null, obs:observations.filter(o=>!o.lotId)}] : []]

  obsGrouped.forEach(({ lot, obs: gObs }) => {
    if (y+7 > CONTENT_BOTTOM) {
      pdf.addPage(); page++
      runningPage(pdf, project, 'Récapitulatif (suite)', page)
      y = CONTENT_TOP + 4
    }
    // Sous-titre lot
    const lotColor = lot ? hex2rgb(lot.color) : [100,116,139]
    pdf.setFillColor(...lotColor.map(c=>Math.round(c*0.15+220)))
    pdf.rect(7, y, W-14, 6, 'F')
    pdf.setDrawColor(...lotColor); pdf.setLineWidth(1)
    pdf.line(7, y, 7, y+6)
    pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...lotColor)
    pdf.text((lot?.name||'Sans lot').toUpperCase(), 11, y+4.2)
    if (lot?.company) {
      pdf.setFont('helvetica','normal'); pdf.setTextColor(...MUTED)
      pdf.text(` — ${lot.company}`, 11+pdf.getTextWidth((lot.name||'Sans lot').toUpperCase()+'  '), y+4.2)
    }
    pdf.setLineWidth(0.3)
    y += 6

    gObs.forEach((obs, i) => {
      if (y+8 > CONTENT_BOTTOM) {
        pdf.addPage(); page++
        runningPage(pdf, project, 'Récapitulatif (suite)', page)
        y = CONTENT_TOP + 4
      }
      pdf.setFillColor(...(i%2===0 ? WHITE : LIGHT))
      pdf.rect(7, y, W-14, 8, 'F')
      pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.2)
      pdf.rect(7, y, W-14, 8, 'S')

      // N°
      pdf.setFillColor(...lotColor)
      pdf.roundedRect(7.5, y+1, 8, 6, 1, 1, 'F')
      pdf.setFontSize(6.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...WHITE)
      pdf.text(String(obs.number), 11.5, y+5.2, { align:'center' })

      // Titre
      pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(...DARK)
      const tShort = pdf.splitTextToSize(obs.title, 66)[0]
      const isLong = pdf.splitTextToSize(obs.title, 66).length > 1
      pdf.text(tShort + (isLong?'…':''), 20, y+5.2)

      // Lot
      pdf.setFontSize(7.5); pdf.setTextColor(...MUTED)
      pdf.text(lot?.name||'—', 93, y+5.2)

      // Statut
      const si = STATUS_INFO[obs.status] || STATUS_INFO.open
      drawPill(pdf, si.label, 122, y+1.5, si.bg, si.fg, 24)

      // Criticité
      const ci = CRIT_INFO[obs.criticality] || CRIT_INFO.remark
      drawPill(pdf, ci.label, 150, y+1.5, ci.bg, ci.fg, 22)

      // Délai
      pdf.setFontSize(7.5); pdf.setFont('helvetica','normal')
      pdf.setTextColor(...(obs.dueDate ? DARK : SUBTLE))
      pdf.text(obs.dueDate||'—', 177, y+5.2)

      y += 8
    })
    y += 2
  })

  // ── 5. FICHES DÉTAILLÉES PAR LOT ─────────────────────────
  onProgress(30, 'Fiches détaillées...')
  const totalObs = observations.length; let doneObs = 0

  for (const { lot, obs: gObs } of obsGrouped) {
    const lotColor = lot ? hex2rgb(lot.color) : [100,116,139]
    const lotName  = lot?.name || 'Sans lot'

    pdf.addPage(); page++
    // Page titre de lot
    const [lr,lg,lb] = lotColor
pdf.setFillColor(Math.max(0,lr-60), Math.max(0,lg-60), Math.max(0,lb-60))
pdf.rect(0, 0, W, H, 'F')

    pdf.setTextColor(...WHITE)
    pdf.setFontSize(9); pdf.setFont('helvetica','normal')
    pdf.text('LOT DE TRAVAUX', W/2, H/2-20, { align:'center' })
    pdf.setFontSize(28); pdf.setFont('helvetica','bold')
    pdf.text(lotName, W/2, H/2-8, { align:'center' })
    if (lot?.company) {
      pdf.setFontSize(13); pdf.setFont('helvetica','normal')
      pdf.text(lot.company, W/2, H/2+5, { align:'center' })
    }
    pdf.setFontSize(11)
    pdf.text(`${gObs.length} observation${gObs.length>1?'s':''}`, W/2, H/2+16, { align:'center' })

    // Stats du lot
    const stOpen   = gObs.filter(o=>o.status==='open').length
    const stClosed = gObs.filter(o=>o.status==='closed').length
    const stBlock  = gObs.filter(o=>o.criticality==='blocking'&&o.status!=='closed').length
    pdf.setFontSize(9)
    pdf.text(`${stOpen} ouvertes  ·  ${stClosed} fermées  ·  ${stBlock} bloquantes`, W/2, H/2+26, { align:'center' })

    pdf.setFontSize(8); pdf.setTextColor(255,255,255,80)
    pdf.text(`Page ${page}`, W/2, H-12, { align:'center' })

    for (const obs of gObs) {
      doneObs++
      onProgress(30 + (doneObs/totalObs)*35, `Obs. #${obs.number}...`)

      const photos   = await Engine.getPhotos(obs.id)
      const comments = await Engine.getComments(obs.id)

      pdf.addPage(); page++
      runningPage(pdf, project, `${lotName} — Obs. #${obs.number}`, page)
      y = CONTENT_TOP + 3

      // Ligne couleur lot en haut du contenu
      pdf.setFillColor(...lotColor)
      pdf.rect(7, y, W-14, 1.5, 'F')
      y += 5

      // En-tête observation
      // Badge numéro
      pdf.setFillColor(...lotColor)
      pdf.roundedRect(7, y, 16, 16, 2, 2, 'F')
      pdf.setTextColor(...WHITE)
      pdf.setFontSize(obs.number>99?8:11); pdf.setFont('helvetica','bold')
      pdf.text(String(obs.number), 15, y+10.5, { align:'center' })

      // Titre
      pdf.setTextColor(...DARK); pdf.setFontSize(13); pdf.setFont('helvetica','bold')
      const tLines = pdf.splitTextToSize(obs.title, W-40)
      pdf.text(tLines, 27, y+7)
      y += Math.max(18, tLines.length*6+4)

      // Pills statut + criticité
      const si = STATUS_INFO[obs.status]||STATUS_INFO.open
      const ci = CRIT_INFO[obs.criticality]||CRIT_INFO.remark
      drawPill(pdf, si.label, 7, y, si.bg, si.fg, 30)
      drawPill(pdf, ci.label, 41, y, ci.bg, ci.fg, 28)
      y += 9

      // Méta
      pdf.setFontSize(8); pdf.setFont('helvetica','normal'); pdf.setTextColor(...MUTED)
      const meta = [
        obs.discipline && `Discipline : ${obs.discipline}`,
        obs.responsible && `Responsable : ${obs.responsible}`,
        obs.dueDate && `Délai : ${obs.dueDate}`,
        obs.createdAt && `Créé le : ${new Date(obs.createdAt).toLocaleDateString('fr-FR')}`,
      ].filter(Boolean)
      if (meta.length) {
        pdf.text(meta.slice(0,2).join('   ·   '), 7, y); y += 5
        if (meta.length>2) { pdf.text(meta.slice(2).join('   ·   '), 7, y); y += 5 }
      }

      // Séparateur
      pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
      pdf.line(7, y+1, W-7, y+1); y += 6

      // Description
      if (obs.description) {
        pdf.setFillColor(250, 250, 249)
        const dl = pdf.splitTextToSize(obs.description, W-24)
        pdf.roundedRect(7, y, W-14, dl.length*4.8+8, 2, 2, 'F')
        pdf.setDrawColor(...BORDER); pdf.roundedRect(7, y, W-14, dl.length*4.8+8, 2, 2, 'S')
        pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.setTextColor(...SLATE)
        pdf.text(dl, 12, y+6); y += dl.length*4.8+12
      }

      // Photos
      if (photos.length > 0) {
        pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
        pdf.text(`Photos (${photos.length})`, 7, y); y += 5

        const PW=43, PH=33, GAP=4, PER_ROW=4
        let px=7, ry=y
        for (let i=0; i<Math.min(photos.length,8); i++) {
          if (i>0 && i%PER_ROW===0) { ry+=PH+GAP; px=7 }
          if (ry+PH > CONTENT_BOTTOM) {
            pdf.addPage(); page++
            runningPage(pdf, project, `${lotName} — Obs. #${obs.number} (photos)`, page)
            ry=CONTENT_TOP+6; px=7
          }
          if (photos[i]?.data) {
            try {
              // Ombre légère
              pdf.setFillColor(200,200,200)
              pdf.roundedRect(px+1, ry+1, PW, PH, 1.5, 1.5, 'F')
              pdf.addImage(photos[i].data, 'JPEG', px, ry, PW, PH)
              pdf.setDrawColor(...BORDER); pdf.setLineWidth(0.3)
              pdf.roundedRect(px, ry, PW, PH, 1.5, 1.5, 'S')
            } catch(e) {}
          }
          px += PW+GAP
        }
        y = ry+PH+8
      }

      // Commentaires
      if (comments.length > 0) {
        if (y+15 > CONTENT_BOTTOM) {
          pdf.addPage(); page++
          runningPage(pdf, project, `${lotName} — Obs. #${obs.number} (commentaires)`, page)
          y = CONTENT_TOP+6
        }
        pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...DARK)
        pdf.text(`Commentaires (${comments.length})`, 7, y); y += 5
        comments.forEach(c => {
          if (y+12 > CONTENT_BOTTOM) {
            pdf.addPage(); page++
            runningPage(pdf, project, `${lotName} — Obs. #${obs.number} (commentaires)`, page)
            y = CONTENT_TOP+6
          }
          pdf.setFillColor(250,250,249)
          const cl = pdf.splitTextToSize(c.text||c.content||'', W-22)
          pdf.roundedRect(7, y, W-14, cl.length*4.5+8, 1.5, 1.5, 'F')
          pdf.setFontSize(7.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...ORANGE)
          pdf.text(c.author||'Anonyme', 11, y+5)
          if (c.createdAt) {
            pdf.setFont('helvetica','normal'); pdf.setTextColor(...MUTED)
            pdf.text(new Date(c.createdAt).toLocaleDateString('fr-FR'), W-11, y+5, { align:'right' })
          }
          pdf.setFont('helvetica','normal'); pdf.setTextColor(...SLATE)
          pdf.text(cl, 11, y+10)
          y += cl.length*4.5+12
        })
      }
    }
  }

  // ── 6. PLANS AVEC PINS ────────────────────────────────────
  const docsWithPins = []
  for (const doc of documents) {
    const pins = await Engine.getPins(doc.id)
    if (pins.length > 0) docsWithPins.push({ doc, pins })
  }

  for (let di=0; di<docsWithPins.length; di++) {
    const { doc, pins } = docsWithPins[di]
    onProgress(68 + (di/Math.max(docsWithPins.length,1))*28, `Plan : ${doc.name}...`)

    const fileData = await Engine.getDocumentFile(doc)
    if (!fileData) continue

    let pdfJs
    try { pdfJs = await pdfjsLib.getDocument({ data: new Uint8Array(fileData) }).promise }
    catch(e) { continue }

    // Page titre du document
    pdf.addPage(); page++
    pdf.setFillColor(30, 41, 59); pdf.rect(0, 0, W, H, 'F')
    pdf.setFillColor(...ORANGE); pdf.rect(0, 0, 4, H, 'F')
    pdf.setTextColor(...WHITE)
    pdf.setFontSize(9); pdf.setFont('helvetica','normal'); pdf.setTextColor(148,163,184)
    pdf.text('DOCUMENT TECHNIQUE', W/2, H/2-18, { align:'center' })
    pdf.setFontSize(20); pdf.setFont('helvetica','bold'); pdf.setTextColor(...WHITE)
    const docLines = pdf.splitTextToSize(doc.name, W-30)
    pdf.text(docLines, W/2, H/2-4, { align:'center' })
    pdf.setFontSize(10); pdf.setFont('helvetica','normal'); pdf.setTextColor(148,163,184)
    pdf.text(`${pins.length} pin${pins.length>1?'s':''}  ·  ${pdfJs.numPages} page${pdfJs.numPages>1?'s':''}`, W/2, H/2+14, { align:'center' })
    pdf.text(`Page ${page}`, W/2, H-12, { align:'center' })

    for (let pageIdx=0; pageIdx<pdfJs.numPages; pageIdx++) {
      const pagePins = pins.filter(p=>p.pageIndex===pageIdx)

      try {
        const pdfPage  = await pdfJs.getPage(pageIdx+1)
        const viewport = pdfPage.getViewport({ scale: 2.2 })
        const canvas   = globalThis.document.createElement('canvas')
        canvas.width   = viewport.width
        canvas.height  = viewport.height
        const ctx      = canvas.getContext('2d')
        await pdfPage.render({ canvasContext:ctx, viewport }).promise

        // Dessiner pins
        for (const pin of pagePins) {
          const obs   = observations.find(o=>o.id===pin.observationId)
          const lot   = obs?.lotId ? lots.find(l=>l.id===obs.lotId) : null
          drawPin(ctx, pin.normalizedX*canvas.width, pin.normalizedY*canvas.height,
                  lot?.color||'#9CA3AF', obs?.number??'?')
        }

        const isLandscape = canvas.width > canvas.height
        const orientation = isLandscape ? 'landscape' : 'portrait'

        if (orientation === 'landscape') {
          pdf.addPage([297, 210])
        } else {
          pdf.addPage()
        }
        page++

        const PW = isLandscape ? 297 : 210
        const PH = isLandscape ? 210 : 297
        const headerH = 14, footerH = 10
        const maxW = PW - 2*M
        const maxH = PH - headerH - footerH - 4
        const ratio = canvas.width / canvas.height
        let iw = maxW, ih = iw/ratio
        if (ih > maxH) { ih = maxH; iw = ih*ratio }

        // Header simple
        pdf.setFillColor(30, 41, 59); pdf.rect(0, 0, PW, headerH, 'F')
        pdf.setFillColor(...ORANGE); pdf.rect(0, 0, 3, headerH, 'F')
        pdf.setFontSize(8.5); pdf.setFont('helvetica','bold'); pdf.setTextColor(...WHITE)
        pdf.text(doc.name, 7, headerH/2+2.5)
        pdf.setFont('helvetica','normal'); pdf.setFontSize(8)
        pdf.text(`p. ${pageIdx+1}/${pdfJs.numPages}  ·  ${pagePins.length} pin${pagePins.length>1?'s':''}`, PW-M, headerH/2+2.5, { align:'right' })

        // Image centrée
        const ix = M + (maxW-iw)/2
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', ix, headerH+2, iw, ih)

        // Footer
        pdf.setFontSize(7); pdf.setFont('helvetica','normal'); pdf.setTextColor(...SUBTLE)
        pdf.text(`IsoTrack — ${project.name}`, M, PH-4)
        pdf.text(`Page ${page}`, PW-M, PH-4, { align:'right' })

      } catch(e) { continue }
    }

    try { pdfJs.destroy() } catch(e) {}
  }

  onProgress(100, 'Terminé !')
  return pdf
}
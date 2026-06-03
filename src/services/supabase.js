import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const now = () => new Date().toISOString()

// ── Conversions ──────────────────────────────────────────────
const toLocal = {
  project: (r) => r && {
    id: r.id, name: r.name, client: r.client || '',
    address:          r.address           || '',
    constructionType: r.construction_type || '',
    photoData:        r.photo_data        || null,
    description: r.description || '', nextObsNumber: r.next_obs_number || 1,
    createdAt: r.created_at, updatedAt: r.updated_at,
  },
  lot: (r) => r && {
    id: r.id, projectId: r.project_id, name: r.name,
    company: r.company || '', contact: r.contact || '',
    color: r.color, notes: r.notes || '',
    createdAt: r.created_at, updatedAt: r.updated_at,
  },
  visit: (r) => r && {
    id: r.id, projectId: r.project_id, type: r.type,
    title: r.title, date: r.date, notes: r.notes || '',
    status: r.status, participants: r.participants || [],
    createdAt: r.created_at, updatedAt: r.updated_at,
  },
  observation: (r) => r && {
    id: r.id, projectId: r.project_id,
    creationVisitId: r.creation_visit_id,
    creationVisitType: r.creation_visit_type,
    number: r.number, title: r.title,
    description: r.description || '', status: r.status,
    criticality: r.criticality, discipline: r.discipline,
    lotId: r.lot_id, responsible: r.responsible || '',
    dueDate: r.due_date, createdAt: r.created_at,
    closedAt: r.closed_at, updatedAt: r.updated_at,
  },
  document: (r) => r && {
    id: r.id, projectId: r.project_id, name: r.name,
    type: r.type, storagePath: r.storage_path,
    fileName: r.file_name, fileSize: r.file_size,
    createdAt: r.created_at, updatedAt: r.updated_at,
  },
  pin: (r) => r && {
    id: r.id, observationId: r.observation_id,
    documentId: r.document_id, pageIndex: r.page_index,
    normalizedX: r.normalized_x, normalizedY: r.normalized_y,
  },
  photo: (r) => r && {
    id: r.id, observationId: r.observation_id,
    storagePath: r.storage_path, name: r.name,
    createdAt: r.created_at,
  },
  comment: (r) => r && {
    id: r.id, observationId: r.observation_id,
    author: r.author, text: r.text, createdAt: r.created_at,
  },
  contact: (r) => r && {
    id: r.id, projectId: r.project_id, name: r.name,
    company: r.company || '', role: r.role,
    phone: r.phone || '', email: r.email || '',
    createdAt: r.created_at,
  },
}

// ── Projects ─────────────────────────────────────────────────
export const sb = {

  projects: {
    getAll: async () => {
      const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      return (data || []).map(toLocal.project)
    },
    upsert: async (p) => {
  const { error } = await supabase.from('projects').upsert({
    id: p.id, name: p.name, client: p.client || '',
    address:           p.address           || null,
    construction_type: p.constructionType  || null,
    photo_data:        p.photoData         || null,
    description: p.description || '', next_obs_number: p.nextObsNumber || 1,
    created_at: p.createdAt, updated_at: now(),
  })
  if (error) {
    console.error('Supabase projects upsert error:', error)
    throw error
  }
},
    delete: async (id) => {
      await supabase.from('projects').delete().eq('id', id)
    },
  },

  lots: {
    getByProject: async (projectId) => {
      const { data } = await supabase.from('lots').select('*').eq('project_id', projectId)
      return (data || []).map(toLocal.lot)
    },
    upsert: async (l) => {
  await supabase.from('lots').upsert({
    id: l.id, project_id: l.projectId, name: l.name,
    company: l.company || '', contact: l.contact || '',
    color: l.color, notes: l.notes || '',
    created_at: l.createdAt, updated_at: now(),
  })
},
    delete: async (id) => {
      await supabase.from('lots').delete().eq('id', id)
    },
  },

  visits: {
    getByProject: async (projectId) => {
      const { data } = await supabase.from('site_visits').select('*').eq('project_id', projectId)
      return (data || []).map(toLocal.visit)
    },
    upsert: async (v) => {
      await supabase.from('site_visits').upsert({
        id: v.id, project_id: v.projectId, type: v.type,
        title: v.title, date: v.date, notes: v.notes || '',
        status: v.status, participants: v.participants || [],
        created_at: v.createdAt, updated_at: now(),
      })
    },
    delete: async (id) => {
      await supabase.from('site_visits').delete().eq('id', id)
    },
  },

  observations: {
    getByProject: async (projectId) => {
      const { data } = await supabase.from('observations').select('*').eq('project_id', projectId)
      return (data || []).map(toLocal.observation)
    },
    upsert: async (o) => {
      await supabase.from('observations').upsert({
        id: o.id, project_id: o.projectId,
        creation_visit_id: o.creationVisitId || null,
        creation_visit_type: o.creationVisitType || null,
        number: o.number, title: o.title,
        description: o.description || '', status: o.status,
        criticality: o.criticality, discipline: o.discipline,
        lot_id: o.lotId || null, responsible: o.responsible || '',
        due_date: o.dueDate || null,
        created_at: o.createdAt, closed_at: o.closedAt || null,
        updated_at: now(),
      })
    },
    delete: async (id) => {
      await supabase.from('observations').delete().eq('id', id)
    },
  },

  documents: {
    getByProject: async (projectId) => {
      const { data } = await supabase.from('documents').select('*').eq('project_id', projectId)
      return (data || []).map(toLocal.document)
    },
    upsert: async (d) => {
      await supabase.from('documents').upsert({
        id: d.id, project_id: d.projectId, name: d.name,
        type: d.type, storage_path: d.storagePath,
        file_name: d.fileName, file_size: d.fileSize,
        created_at: d.createdAt, updated_at: now(),
      })
    },
    delete: async (id, storagePath) => {
      if (storagePath) await supabase.storage.from('documents').remove([storagePath])
      await supabase.from('documents').delete().eq('id', id)
    },
    uploadFile: async (id, projectId, arrayBuffer, fileName) => {
      const path = `${projectId}/${id}.pdf`
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
      await supabase.storage.from('documents').upload(path, blob, { upsert: true })
      return path
    },
    downloadFile: async (storagePath) => {
      const { data } = await supabase.storage.from('documents').download(storagePath)
      return data ? await data.arrayBuffer() : null
    },
  },

  pins: {
    getByDocument: async (documentId) => {
      const { data } = await supabase.from('pins').select('*').eq('document_id', documentId)
      return (data || []).map(toLocal.pin)
    },
    upsert: async (p) => {
      await supabase.from('pins').upsert({
        id: p.id, observation_id: p.observationId,
        document_id: p.documentId, page_index: p.pageIndex || 0,
        normalized_x: p.normalizedX, normalized_y: p.normalizedY,
        created_at: new Date(), updated_at: now(),
      })
    },
    delete: async (id) => {
      await supabase.from('pins').delete().eq('id', id)
    },
    deleteByObservation: async (observationId) => {
      await supabase.from('pins').delete().eq('observation_id', observationId)
    },
  },

  photos: {
    getByObservation: async (observationId) => {
      const { data } = await supabase.from('photos').select('*').eq('observation_id', observationId)
      return (data || []).map(toLocal.photo)
    },
    upsert: async (p) => {
      await supabase.from('photos').upsert({
        id: p.id, observation_id: p.observationId,
        storage_path: p.storagePath, name: p.name,
        created_at: p.createdAt, updated_at: now(),
      })
    },
    uploadFile: async (id, observationId, base64DataUrl) => {
      const path = `${observationId}/${id}.jpg`
      const base64 = base64DataUrl.split(',')[1]
      const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'image/jpeg' })
      await supabase.storage.from('photos').upload(path, blob, { upsert: true })
      return path
    },
    downloadFile: async (storagePath) => {
      const { data } = await supabase.storage.from('photos').download(storagePath)
      if (!data) return null
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(data)
      })
    },
    delete: async (id, storagePath) => {
      if (storagePath) await supabase.storage.from('photos').remove([storagePath])
      await supabase.from('photos').delete().eq('id', id)
    },
  },

  comments: {
    getByObservation: async (observationId) => {
      const { data } = await supabase.from('comments').select('*').eq('observation_id', observationId).order('created_at')
      return (data || []).map(toLocal.comment)
    },
    upsert: async (c) => {
      await supabase.from('comments').upsert({
        id: c.id, observation_id: c.observationId,
        author: c.author, text: c.text,
        created_at: c.createdAt, updated_at: now(),
      })
    },
    delete: async (id) => {
      await supabase.from('comments').delete().eq('id', id)
    },
  },

  contacts: {
    getByProject: async (projectId) => {
      const { data } = await supabase.from('contacts').select('*').eq('project_id', projectId)
      return (data || []).map(toLocal.contact)
    },
    upsert: async (c) => {
      await supabase.from('contacts').upsert({
        id: c.id, project_id: c.projectId, name: c.name,
        company: c.company || '', role: c.role,
        phone: c.phone || '', email: c.email || '',
        created_at: c.createdAt, updated_at: now(),
      })
    },
    delete: async (id) => {
      await supabase.from('contacts').delete().eq('id', id)
    },
  },
}
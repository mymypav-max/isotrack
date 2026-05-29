import { local, getProjectStats, getNextObsNumber } from './localDb'
import { sb } from './supabase'

const isOnline = () => navigator.onLine

// ── Push : local → Supabase ──────────────────────────────────
const push = async () => {
  if (!isOnline()) return { pushed: 0, errors: 0 }
  let pushed = 0, errors = 0

  const tables = [
    { key: 'projects',     sbObj: sb.projects,     localObj: local.projects },
    { key: 'lots',         sbObj: sb.lots,         localObj: local.lots },
    { key: 'visits',       sbObj: sb.visits,       localObj: local.visits },
    { key: 'observations', sbObj: sb.observations, localObj: local.observations },
    { key: 'documents',    sbObj: sb.documents,    localObj: local.documents },
    { key: 'pins',         sbObj: sb.pins,         localObj: local.pins },
    { key: 'comments',     sbObj: sb.comments,     localObj: local.comments },
    { key: 'contacts',     sbObj: sb.contacts,     localObj: local.contacts },
  ]

  for (const { sbObj, localObj } of tables) {
    const unsynced = await localObj.getUnsynced()
    for (const record of unsynced) {
      try {
        await sbObj.upsert(record)
        await localObj.markSynced(record.id)
        pushed++
      } catch (e) {
        console.warn('Sync push error:', e)
        errors++
      }
    }
  }

  // Photos : upload des fichiers non uploadés
  const unsyncedPhotos = await local.photos.getUnsynced()
  for (const photo of unsyncedPhotos) {
    try {
      if (photo.data && !photo.storagePath) {
        const path = await sb.photos.uploadFile(photo.id, photo.observationId, photo.data)
        await local.photos.update(photo.id, { storagePath: path })
        await sb.photos.upsert({ ...photo, storagePath: path })
        await local.photos.markSynced(photo.id)
        pushed++
      }
    } catch (e) {
      errors++
    }
  }

  return { pushed, errors }
}

// ── Pull : Supabase → local ──────────────────────────────────
const pull = async (projectId) => {
  if (!isOnline()) return

  const [lots, visits, docs, contacts, obs, pins] = await Promise.all([
    sb.lots.getByProject(projectId),
    sb.visits.getByProject(projectId),
    sb.documents.getByProject(projectId),
    sb.contacts.getByProject(projectId),
    sb.observations.getByProject(projectId),
    Promise.resolve([]),
  ])

  for (const lot  of lots)     await local.lots.put({ ...lot, syncedAt: new Date() })
  for (const v    of visits)   await local.visits.put({ ...v, syncedAt: new Date() })
  for (const d of docs) {
  const existing = await local.documents.get(d.id)
  await local.documents.put({
    ...d,
    ...(existing?.fileData ? { fileData: existing.fileData } : {}),
    syncedAt: new Date()
  })
}
  for (const c    of contacts) await local.contacts.put({ ...c, syncedAt: new Date() })
  for (const o    of obs)      await local.observations.put({ ...o, syncedAt: new Date() })

  // Pins par document
  for (const doc of docs) {
    const docPins = await sb.pins.getByDocument(doc.id)
    for (const pin of docPins) await local.pins.put({ ...pin, syncedAt: new Date() })
  }
}

// ── Pull de tous les projets ─────────────────────────────────
const pullProjects = async () => {
  if (!isOnline()) return
  const projects = await sb.projects.getAll()
  for (const p of projects) {
    await local.projects.put({ ...p, syncedAt: new Date() })
  }
  return projects
}

// ── Sync complet ─────────────────────────────────────────────
export const syncAll = async (projectId) => {
  const pushResult = await push()
  if (projectId) await pull(projectId)
  await pullProjects()
  return pushResult
}

// ── API principale — utilisée par les composants ─────────────
export const Engine = {

  // Stats
  getProjectStats,
  getNextObsNumber,

  // Projects
  getProjects: async () => {
    await pullProjects()
    return local.projects.getAll()
  },
  createProject: async (data) => {
    const id = await local.projects.add(data)
    if (isOnline()) {
      const project = await local.projects.get(id)
      await sb.projects.upsert(project)
      await local.projects.markSynced(id)
    }
    return id
  },
  updateProject: async (id, data) => {
    await local.projects.update(id, data)
    if (isOnline()) {
      const project = await local.projects.get(id)
      await sb.projects.upsert(project)
      await local.projects.markSynced(id)
    }
  },
  deleteProject: async (id) => {
    await local.projects.delete(id)
    if (isOnline()) await sb.projects.delete(id)
  },

  // Lots
  getProjectData: async (projectId) => {
    if (isOnline()) await pull(projectId)
    const [obs, visits, docs, contacts, lots] = await Promise.all([
      local.observations.getByProject(projectId),
      local.visits.getByProject(projectId),
      local.documents.getByProject(projectId),
      local.contacts.getByProject(projectId),
      local.lots.getByProject(projectId),
    ])
    return { observations: obs, visits, documents: docs, contacts, lots }
  },
  createLot: async (data) => {
    const id = await local.lots.add(data)
    if (isOnline()) { const l = await local.lots.getByProject(data.projectId).then(ls => ls.find(x => x.id === id)); if(l) { await sb.lots.upsert(l); await local.lots.markSynced(id) } }
    return id
  },
  updateLot: async (id, data) => {
    await local.lots.update(id, data)
    if (isOnline()) { const all = await local.lots.getByProject(data.projectId || ''); const l = all.find(x=>x.id===id); if(l){await sb.lots.upsert(l); await local.lots.markSynced(id)} }
  },
  deleteLot: async (id) => {
    await local.lots.delete(id)
    if (isOnline()) await sb.lots.delete(id)
  },

  // Visits
  createVisit: async (data) => {
    const id = await local.visits.add(data)
    if (isOnline()) { const visits = await local.visits.getByProject(data.projectId); const v = visits.find(x=>x.id===id); if(v){await sb.visits.upsert(v); await local.visits.markSynced(id)} }
    return id
  },
  updateVisit: async (id, data) => {
    await local.visits.update(id, data)
    if (isOnline()) { const visits = await local.visits.getByProject(data.projectId||''); const v = visits.find(x=>x.id===id); if(v){await sb.visits.upsert(v); await local.visits.markSynced(id)} }
  },
  deleteVisit: async (id) => {
    await local.visits.delete(id)
    if (isOnline()) await sb.visits.delete(id)
  },

  // Documents
  createDocument: async (data, fileArrayBuffer) => {
    const id = await local.documents.add({ ...data, fileData: fileArrayBuffer })
    if (isOnline()) {
      const storagePath = await sb.documents.uploadFile(id, data.projectId, fileArrayBuffer, data.fileName)
      await local.documents.update(id, { storagePath })
      const doc = await local.documents.get(id)
      await sb.documents.upsert(doc)
      await local.documents.markSynced(id)
    }
    return id
  },
  updateDocument: async (id, data) => {
    await local.documents.update(id, data)
    if (isOnline()) { const doc = await local.documents.get(id); if(doc){await sb.documents.upsert(doc); await local.documents.markSynced(id)} }
  },
  deleteDocument: async (id) => {
    const doc = await local.documents.get(id)
    await local.documents.delete(id)
    if (isOnline()) await sb.documents.delete(id, doc?.storagePath)
  },
  getDocumentFile: async (doc) => {
  const localDoc = await local.documents.get(doc.id)
  if (localDoc?.fileData) return localDoc.fileData
  const storagePath = doc.storagePath || localDoc?.storagePath
  if (storagePath && isOnline()) {
    const data = await sb.documents.downloadFile(storagePath)
    if (data) await local.documents.update(doc.id, { fileData: data })
    return data
  }
  return null
},

  // Observations
  createObservation: async (data) => {
    const id = await local.observations.add(data)
    if (isOnline()) { const obs = await local.observations.get(id); if(obs){await sb.observations.upsert(obs); await local.observations.markSynced(id)} }
    return id
  },
  updateObservation: async (id, data) => {
    await local.observations.update(id, data)
    if (isOnline()) { const obs = await local.observations.get(id); if(obs){await sb.observations.upsert(obs); await local.observations.markSynced(id)} }
  },
  deleteObservation: async (id) => {
    await local.observations.delete(id)
    if (isOnline()) await sb.observations.delete(id)
  },
  getObservation: (id) => local.observations.get(id),

  // Pins
  getPins: (documentId) =>  local.pins.getByDocument(documentId),
  createPin: async (data) => {
    const id = await local.pins.add(data)

    if (isOnline()) {
      await sb.pins.upsert({ ...data, id })
      await local.pins.markSynced(id)
    }

    return id
  },
  deletePin: async (id) => {
    await local.pins.delete(id)
    if (isOnline()) await sb.pins.delete(id)
  },

  // Comments
  getComments: (obsId) => local.comments.getByObservation(obsId),
  createComment: async (data) => {
    const id = await local.comments.add(data)
    if (isOnline()) { const comments = await local.comments.getByObservation(data.observationId); const c = comments.find(x=>x.id===id); if(c){await sb.comments.upsert(c); await local.comments.markSynced(id)} }
    return id
  },
  deleteComment: async (id) => {
    await local.comments.delete(id)
    if (isOnline()) await sb.comments.delete(id)
  },

  // Contacts
  createContact: async (data) => {
    const id = await local.contacts.add(data)
    if (isOnline()) { const contacts = await local.contacts.getByProject(data.projectId); const c = contacts.find(x=>x.id===id); if(c){await sb.contacts.upsert(c); await local.contacts.markSynced(id)} }
    return id
  },
  updateContact: async (id, data) => {
    await local.contacts.update(id, data)
    if (isOnline()) { const contacts = await local.contacts.getByProject(data.projectId||''); const c = contacts.find(x=>x.id===id); if(c){await sb.contacts.upsert(c); await local.contacts.markSynced(id)} }
  },
  deleteContact: async (id) => {
    await local.contacts.delete(id)
    if (isOnline()) await sb.contacts.delete(id)
  },

  // Photos
  getPhotos: (obsId) => local.photos.getByObservation(obsId),
  createPhoto: async (observationId, base64Data, name) => {
    const id = await local.photos.add({ observationId, data: base64Data, name })
    if (isOnline()) {
      try {
        const path = await sb.photos.uploadFile(id, observationId, base64Data)
        await local.photos.update(id, { storagePath: path })
        const photo = await local.photos.get(id)
        await sb.photos.upsert(photo)
        await local.photos.markSynced(id)
      } catch(e) { console.warn('Photo upload error:', e) }
    }
    return id
  },
  deletePhoto: async (id) => {
    const photo = await local.photos.get(id)
    await local.photos.delete(id)
    if (isOnline() && photo?.storagePath) await sb.photos.delete(id, photo.storagePath)
  },

  // Sync manuel
  syncAll,
}
export { getProjectStats, getNextObsNumber }
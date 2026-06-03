import { db } from '../db/database'

const uuid = () => crypto.randomUUID()
const now  = () => new Date()

export const local = {

  projects: {
    getAll: () => db.projects.orderBy('createdAt').reverse().toArray(),
    get: (id) => db.projects.get(id),
    add: async (data) => {
      const id = data.id || uuid()
      await db.projects.add({ ...data, id, syncedAt: null, createdAt: now(), updatedAt: now() })
      return id
    },
    update: (id, data) => db.projects.update(id, { ...data, updatedAt: now(), syncedAt: null }),
    delete: async (id) => {
      const obsIds = (await db.observations.where('projectId').equals(id).toArray()).map(o => o.id)
      if (obsIds.length) {
        await db.pins.where('observationId').anyOf(obsIds).delete()
        await db.photos.where('observationId').anyOf(obsIds).delete()
        await db.comments.where('observationId').anyOf(obsIds).delete()
        await db.observations.where('projectId').equals(id).delete()
      }
      await db.siteVisits.where('projectId').equals(id).delete()
      await db.documents.where('projectId').equals(id).delete()
      await db.contacts.where('projectId').equals(id).delete()
      await db.lots.where('projectId').equals(id).delete()
      await db.projects.delete(id)
    },
    put: (data) => db.projects.put(data),
    markSynced: (id) => db.projects.update(id, { syncedAt: now() }),
    getUnsynced: () => db.projects.filter(p => !p.syncedAt).toArray(),
  },

  lots: {
    getByProject: (projectId) => db.lots.where('projectId').equals(projectId).toArray(),
    get: (id) => db.lots.get(id),
    add: async (data) => {
      const id = data.id || uuid()
      await db.lots.add({ ...data, id, syncedAt: null, createdAt: now(), updatedAt: now() })
      return id
    },
    update: (id, data) => db.lots.update(id, { ...data, updatedAt: now(), syncedAt: null }),
    delete: (id) => db.lots.delete(id),
    put: (data) => db.lots.put(data),
    markSynced: (id) => db.lots.update(id, { syncedAt: now() }),
    getUnsynced: () => db.lots.filter(l => !l.syncedAt).toArray(),
  },

  visits: {
    getByProject: (projectId) => db.siteVisits.where('projectId').equals(projectId).reverse().sortBy('createdAt'),
    add: async (data) => {
      const id = data.id || uuid()
      await db.siteVisits.add({ ...data, id, syncedAt: null, createdAt: now(), updatedAt: now() })
      return id
    },
    update: (id, data) => db.siteVisits.update(id, { ...data, updatedAt: now(), syncedAt: null }),
    delete: (id) => db.siteVisits.delete(id),
    put: (data) => db.siteVisits.put(data),
    markSynced: (id) => db.siteVisits.update(id, { syncedAt: now() }),
    getUnsynced: () => db.siteVisits.filter(v => !v.syncedAt).toArray(),
  },

  observations: {
    getByProject: (projectId) => db.observations.where('projectId').equals(projectId).toArray(),
    get: (id) => db.observations.get(id),
    add: async (data) => {
      const id = data.id || uuid()
      await db.observations.add({ ...data, id, syncedAt: null, createdAt: now(), updatedAt: now() })
      return id
    },
    update: (id, data) => db.observations.update(id, { ...data, updatedAt: now(), syncedAt: null }),
    delete: async (id) => {
      await db.pins.where('observationId').equals(id).delete()
      await db.photos.where('observationId').equals(id).delete()
      await db.comments.where('observationId').equals(id).delete()
      await db.observations.delete(id)
    },
    put: (data) => db.observations.put(data),
    markSynced: (id) => db.observations.update(id, { syncedAt: now() }),
    getUnsynced: () => db.observations.filter(o => !o.syncedAt).toArray(),
  },

  documents: {
    getByProject: (projectId) => db.documents.where('projectId').equals(projectId).toArray(),
    get: (id) => db.documents.get(id),
    add: async (data) => {
      const id = data.id || uuid()
      await db.documents.add({ ...data, id, syncedAt: null, createdAt: now(), updatedAt: now() })
      return id
    },
    update: (id, data) => db.documents.update(id, { ...data, syncedAt: null }),
    delete: async (id) => {
      await db.pins.where('documentId').equals(id).delete()
      await db.documents.delete(id)
    },
    put: (data) => db.documents.put(data),
    markSynced: (id) => db.documents.update(id, { syncedAt: now() }),
    getUnsynced: () => db.documents.filter(d => !d.syncedAt).toArray(),
  },

  pins: {
    getByDocument: (documentId) => db.pins.where('documentId').equals(documentId).toArray(),
    getByObservation: (observationId) => db.pins.where('observationId').equals(observationId).toArray(),
    add: async (data) => {
      const id = data.id || uuid()
      await db.pins.add({ ...data, id, syncedAt: null })
      return id
    },
    delete: (id) => db.pins.delete(id),
    put: (data) => db.pins.put(data),
    markSynced: (id) => db.pins.update(id, { syncedAt: now() }),
    getUnsynced: () => db.pins.filter(p => !p.syncedAt).toArray(),
  },

  photos: {
    getByObservation: (obsId) => db.photos.where('observationId').equals(obsId).sortBy('createdAt'),
    get: (id) => db.photos.get(id),
    add: async (data) => {
      const id = data.id || uuid()
      await db.photos.add({ ...data, id, syncedAt: null, createdAt: now() })
      return id
    },
    update: (id, data) => db.photos.update(id, { ...data, syncedAt: null }),
    delete: (id) => db.photos.delete(id),
    deleteByObservation: (obsId) => db.photos.where('observationId').equals(obsId).delete(),
    put: (data) => db.photos.put(data),
    markSynced: (id) => db.photos.update(id, { syncedAt: now() }),
    getUnsynced: () => db.photos.filter(p => !p.syncedAt).toArray(),
  },

  comments: {
    getByObservation: (obsId) => db.comments.where('observationId').equals(obsId).sortBy('createdAt'),
    add: async (data) => {
      const id = data.id || uuid()
      await db.comments.add({ ...data, id, syncedAt: null, createdAt: now() })
      return id
    },
    delete: (id) => db.comments.delete(id),
    deleteByObservation: (obsId) => db.comments.where('observationId').equals(obsId).delete(),
    put: (data) => db.comments.put(data),
    markSynced: (id) => db.comments.update(id, { syncedAt: now() }),
    getUnsynced: () => db.comments.filter(c => !c.syncedAt).toArray(),
  },

  contacts: {
    getByProject: (projectId) => db.contacts.where('projectId').equals(projectId).toArray(),
    add: async (data) => {
      const id = data.id || uuid()
      await db.contacts.add({ ...data, id, syncedAt: null, createdAt: now() })
      return id
    },
    update: (id, data) => db.contacts.update(id, { ...data, syncedAt: null }),
    delete: (id) => db.contacts.delete(id),
    put: (data) => db.contacts.put(data),
    markSynced: (id) => db.contacts.update(id, { syncedAt: now() }),
    getUnsynced: () => db.contacts.filter(c => !c.syncedAt).toArray(),
  },
}

export const getProjectStats = async (projectId) => {
  const obs = await db.observations.where('projectId').equals(projectId).toArray()
  return {
    total:        obs.length,
    open:         obs.filter(o => o.status === 'open').length,
    inProgress:   obs.filter(o => o.status === 'inProgress').length,
    readyToCheck: obs.filter(o => o.status === 'readyToCheck').length,
    closed:       obs.filter(o => o.status === 'closed').length,
    blocking:     obs.filter(o => o.criticality === 'blocking' && o.status !== 'closed').length,
  }
}

export const getNextObsNumber = async (projectId) => {
  const project = await db.projects.get(projectId)
  const n = project?.nextObsNumber || 1
  await db.projects.update(projectId, { nextObsNumber: n + 1, syncedAt: null })
  return n
}
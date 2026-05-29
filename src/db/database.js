import Dexie from 'dexie'

export const db = new Dexie('IsoTrackDB_v2')

db.version(1).stores({
  projects:     'id, name, client, createdAt, updatedAt, syncedAt',
  siteVisits:   'id, projectId, type, date, status, createdAt, syncedAt',
  observations: 'id, projectId, creationVisitId, number, status, criticality, discipline, lotId, createdAt, updatedAt, syncedAt',
  documents:    'id, projectId, name, type, createdAt, syncedAt',
  pins:         'id, observationId, documentId, pageIndex, syncedAt',
  photos:       'id, observationId, createdAt, syncedAt',
  comments:     'id, observationId, createdAt, syncedAt',
  contacts:     'id, projectId, role, syncedAt',
  lots:         'id, projectId, name, color, createdAt, syncedAt',
})

// Version 2 : UUID + syncedAt + storagePath pour docs/photos
db.version(2).stores({
  projects:     'id, name, client, createdAt, updatedAt, syncedAt',
  siteVisits:   'id, projectId, type, date, status, createdAt, syncedAt',
  observations: 'id, projectId, creationVisitId, number, status, criticality, discipline, lotId, createdAt, updatedAt, syncedAt',
  documents:    'id, projectId, name, type, createdAt, syncedAt',
  pins:         'id, observationId, documentId, pageIndex, syncedAt',
  photos:       'id, observationId, createdAt, syncedAt',
  comments:     'id, observationId, createdAt, syncedAt',
  contacts:     'id, projectId, role, syncedAt',
  lots:         'id, projectId, name, color, createdAt, syncedAt',
}).upgrade(async tx => {
  // Migration v1→v2 : les IDs passent de int à UUID
  // On vide toutes les tables (données de test uniquement à ce stade)
  const tables = ['projects','siteVisits','observations','documents',
                  'pins','photos','comments','contacts','lots','auditEvents']
  for (const t of tables) {
    try { await tx.table(t).clear() } catch(e) {}
  }
})
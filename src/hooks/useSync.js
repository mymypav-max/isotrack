import { useState, useEffect, useCallback } from 'react'
import { syncAll } from '../services/syncEngine'

export function useSync(projectId) {
  const [syncing,   setSyncing]   = useState(false)
  const [online,    setOnline]    = useState(navigator.onLine)
  const [lastSync,  setLastSync]  = useState(null)
  const [pending,   setPending]   = useState(0)

  useEffect(() => {
    const goOnline  = () => { setOnline(true);  triggerSync() }
    const goOffline = () => setOnline(false)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [projectId])

  const triggerSync = useCallback(async () => {
    if (syncing || !navigator.onLine) return
    setSyncing(true)
    try {
      const result = await syncAll(projectId)
      setLastSync(new Date())
      setPending(result?.errors || 0)
    } catch (e) {
      console.warn('Sync error:', e)
    } finally {
      setSyncing(false)
    }
  }, [projectId, syncing])

  // Auto-sync au montage
  useEffect(() => {
    triggerSync()
    const interval = setInterval(triggerSync, 60_000) // toutes les 60s
    return () => clearInterval(interval)
  }, [])

  return { online, syncing, lastSync, pending, sync: triggerSync }
}
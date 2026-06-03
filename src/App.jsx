import { useState, useEffect } from 'react'
import ProjectsList from './screens/ProjectsList'
import ProjectDetail from './screens/ProjectDetail'
import { syncAll } from './services/syncEngine'

export default function App() {
  const [screen, setScreen] = useState('projects')
  const [activeProject, setActiveProject] = useState(null)
  useEffect(() => {
  // Sync au démarrage
  if (navigator.onLine) syncAll()

  // Sync quand on revient en ligne (ex: après visite terrain offline)
  const handleOnline = () => {
    console.log('Retour en ligne — sync en cours...')
    syncAll()
  }
  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}, [])

  const navigate = (targetScreen, data = {}) => {
    if (data.project) setActiveProject(data.project)
    setScreen(targetScreen)
  }

  const goBack = () => setScreen('projects')

  return (
    <div className="app">
      {screen === 'projects' && (
        <ProjectsList
          onSelect={(project) => navigate('project', { project })}
        />
      )}
      {screen === 'project' && (
        <ProjectDetail
          project={activeProject}
          onBack={goBack}
          onProjectUpdate={(updated) => setActiveProject(updated)}
        />
      )}
    </div>
  )
}
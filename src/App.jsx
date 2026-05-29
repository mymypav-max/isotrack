import { useState } from 'react'
import ProjectsList from './screens/ProjectsList'
import ProjectDetail from './screens/ProjectDetail'

export default function App() {
  const [screen, setScreen] = useState('projects')
  const [activeProject, setActiveProject] = useState(null)

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
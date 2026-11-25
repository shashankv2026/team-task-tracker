import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import ProjectDetail from './pages/ProjectDetail'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentProject, setCurrentProject] = useState(null)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>

  // Not logged in → show Auth page
  if (!session) return <Auth />

  // Logged in and selected a project → show Project page
  if (currentProject) {
    return (
      <ProjectDetail
        project={currentProject}
        session={session}
        onBack={() => setCurrentProject(null)}
      />
    )
  }

  // Logged in, no project selected → show Dashboard
  return (
    <Dashboard
      session={session}
      onSelectProject={setCurrentProject}
    />
  )
}
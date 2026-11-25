import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Dashboard({ session, onSelectProject }) {
  const [projects, setProjects] = useState([])
  const [newProjectName, setNewProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log('Fetch error:', error)
      setError(error.message)
    }
    if (data) setProjects(data)
    setLoading(false)
  }

  async function createProject(e) {
    e.preventDefault()
    if (!newProjectName.trim()) return
    setError('')

    console.log('Creating project for user:', session.user.id)

    const { data, error } = await supabase.from('projects').insert({
      name: newProjectName,
      owner_id: session.user.id
    }).select()

    console.log('Result:', data, error)

    if (error) {
      setError(error.message)
    } else {
      setNewProjectName('')
      fetchProjects()
    }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>My Projects</h1>
        <button onClick={logout} style={{ background: '#dc2626' }}>Logout</button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Create New Project</h3>
        {error && <p className="error">{error}</p>}
        <form onSubmit={createProject} style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder="Project name"
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            style={{ marginBottom: 0 }}
            required
          />
          <button type="submit">Create</button>
        </form>
      </div>

      {loading ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', marginTop: 40 }}>
          No projects yet. Create one above!
        </p>
      ) : (
        projects.map(project => (
          <div
            key={project.id}
            className="card"
            onClick={() => onSelectProject(project)}
            style={{ cursor: 'pointer', borderLeft: '4px solid #2563eb' }}
          >
            <h3>{project.name}</h3>
            <p style={{ color: '#666', fontSize: 13 }}>
              Created: {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
        ))
      )}
    </div>
  )
}
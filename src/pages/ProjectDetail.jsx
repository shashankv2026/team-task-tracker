import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const STATUSES = ['Todo', 'In Progress', 'In Review', 'Done']
const PRIORITY_COLORS = { High: '#dc2626', Medium: '#d97706', Low: '#16a34a' }

export default function ProjectDetail({ project, session, onBack }) {
  const [isOwner, setIsOwner] = useState(false)
  const [milestones, setMilestones] = useState([])
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [newMilestone, setNewMilestone] = useState({ title: '', planned_date: '' })
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium', planned_date: '', assigned_to: '', milestone_id: '' })
  const [memberEmail, setMemberEmail] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setIsOwner(project.owner_id === session.user.id)
    fetchAll()
  }, [])

  async function fetchAll() {
    await fetchMilestones()
    await fetchTasks()
    await fetchMembers()
  }

  async function fetchMilestones() {
    const { data } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', project.id)
    setMilestones(data || [])
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*, profiles(name)')
      .eq('project_id', project.id)
    setTasks(data || [])
  }

  async function fetchMembers() {
    const { data, error } = await supabase
      .from('project_members')
      .select('user_id, profiles(id, name, email)')
      .eq('project_id', project.id)

    console.log('Members:', data, error)

    if (data) {
      // Filter out any rows where profiles is null
      const validMembers = data.filter(m => m.profiles !== null)
      setMembers(validMembers)
    }
  }

  async function addMilestone(e) {
    e.preventDefault()
    const { error } = await supabase.from('milestones').insert({
      ...newMilestone,
      project_id: project.id
    })
    if (!error) {
      setNewMilestone({ title: '', planned_date: '' })
      fetchMilestones()
    }
  }

  async function toggleMilestone(m) {
    await supabase.from('milestones').update({
      status: m.status === 'Open' ? 'Done' : 'Open'
    }).eq('id', m.id)
    fetchMilestones()
  }

  async function addTask(e) {
    e.preventDefault()
    if (!newTask.milestone_id) return setMessage('Select a milestone first')

    const payload = {
      title: newTask.title,
      priority: newTask.priority,
      planned_date: newTask.planned_date || null,
      assigned_to: newTask.assigned_to || null,
      milestone_id: newTask.milestone_id,
      project_id: project.id
    }

    const { error } = await supabase.from('tasks').insert(payload)
    if (error) setMessage(error.message)
    else {
      setNewTask({ title: '', priority: 'Medium', planned_date: '', assigned_to: '', milestone_id: '' })
      setMessage('')
      fetchTasks()
    }
  }

  async function updateTaskStatus(taskId, newStatus) {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    fetchTasks()
  }

  async function addMember(e) {
    e.preventDefault()
    setMessage('')

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', memberEmail)
      .single()

    if (error || !profile) {
      setMessage('User not found. They must sign up first.')
      return
    }

    const { error: insertError } = await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: profile.id
    })

    if (insertError) setMessage(insertError.message)
    else {
      setMemberEmail('')
      fetchMembers()
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '30px auto', padding: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: '#6b7280' }}>← Back</button>
        <h1>{project.name}</h1>
        {isOwner && <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: 20, fontSize: 13 }}>Owner</span>}
      </div>

      {message && <p className="error">{message}</p>}

      {/* MILESTONES */}
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Milestones</h2>
        {isOwner && (
          <form onSubmit={addMilestone} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <input
              placeholder="Milestone title"
              value={newMilestone.title}
              onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })}
              style={{ flex: 1, marginBottom: 0 }}
              required
            />
            <input
              type="date"
              value={newMilestone.planned_date}
              onChange={e => setNewMilestone({ ...newMilestone, planned_date: e.target.value })}
              style={{ width: 160, marginBottom: 0 }}
            />
            <button type="submit">Add</button>
          </form>
        )}
        {milestones.length === 0 ? (
          <p style={{ color: '#666' }}>No milestones yet.</p>
        ) : (
          milestones.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <div>
                <strong>{m.title}</strong>
                {m.planned_date && <span style={{ color: '#666', marginLeft: 8, fontSize: 13 }}>{m.planned_date}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: m.status === 'Done' ? '#d1fae5' : '#fee2e2',
                  color: m.status === 'Done' ? '#065f46' : '#991b1b',
                  padding: '2px 10px', borderRadius: 20, fontSize: 13
                }}>{m.status}</span>
                {isOwner && (
                  <button onClick={() => toggleMilestone(m)} style={{ background: '#6b7280', fontSize: 12, padding: '4px 10px' }}>
                    Toggle
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD TASK */}
      {isOwner && (
        <div className="card">
          <h2 style={{ marginBottom: 12 }}>Add Task</h2>
          <form onSubmit={addTask}>
            <select
              value={newTask.milestone_id}
              onChange={e => setNewTask({ ...newTask, milestone_id: e.target.value })}
              required
            >
              <option value="">Select Milestone</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
            <input
              placeholder="Task title (required)"
              value={newTask.title}
              onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              required
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <input
                type="date"
                value={newTask.planned_date}
                onChange={e => setNewTask({ ...newTask, planned_date: e.target.value })}
              />
              <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.profiles?.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" style={{ marginTop: 8 }}>Add Task</button>
          </form>
        </div>
      )}

      {/* KANBAN BOARD */}
      <h2 style={{ margin: '24px 0 12px' }}>Kanban Board</h2>
      {tasks.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center' }}>No tasks yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {STATUSES.map(status => {
            const columnTasks = tasks.filter(t => t.status === status)
            return (
              <div key={status} style={{ background: '#f8fafc', borderRadius: 10, padding: 12 }}>
                <h3 style={{ marginBottom: 10, fontSize: 14, textTransform: 'uppercase', color: '#475569' }}>
                  {status} ({columnTasks.length})
                </h3>
                {columnTasks.length === 0 && <p style={{ color: '#94a3b8', fontSize: 13 }}>No tasks</p>}
                {columnTasks.map(task => (
                  <div key={task.id} className="card" style={{ borderLeft: `4px solid ${PRIORITY_COLORS[task.priority]}`, padding: 10, marginBottom: 8 }}>
                    <strong style={{ display: 'block', marginBottom: 4 }}>{task.title}</strong>
                    <p style={{ fontSize: 12, color: '#666' }}>👤 {task.profiles?.name || 'Unassigned'}</p>
                    {task.planned_date && <p style={{ fontSize: 12, color: '#666' }}>📅 {task.planned_date}</p>}
                    <span style={{
                      display: 'inline-block', fontSize: 11, padding: '1px 6px', borderRadius: 10,
                      background: PRIORITY_COLORS[task.priority] + '22', color: PRIORITY_COLORS[task.priority], marginBottom: 6
                    }}>{task.priority}</span>
                    {(isOwner || task.assigned_to === session.user.id) && (
                      <select
                        value={task.status}
                        onChange={e => updateTaskStatus(task.id, e.target.value)}
                        style={{ fontSize: 12, padding: 4, display: 'block', marginTop: 4 }}
                      >
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* TEAM */}
      {isOwner && (
        <div className="card" style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 12 }}>Team Members</h2>
          {members.length === 0 ? (
            <p style={{ color: '#666', marginBottom: 12 }}>No members yet.</p>
          ) : (
            members.map(m => (
              <div key={m.user_id} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
                <strong>{m.profiles?.name}</strong>
                <span style={{ color: '#666', marginLeft: 8, fontSize: 13 }}>{m.profiles?.email}</span>
              </div>
            ))
          )}
          <form onSubmit={addMember} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="email"
              placeholder="Member email"
              value={memberEmail}
              onChange={e => setMemberEmail(e.target.value)}
              style={{ marginBottom: 0 }}
              required
            />
            <button type="submit">Add Member</button>
          </form>
        </div>
      )}
    </div>
  )
}
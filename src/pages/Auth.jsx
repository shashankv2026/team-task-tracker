import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (isLogin) {
      // LOGIN
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      // SIGN UP
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }  // this sends name to our trigger
      })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account!')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }} className="card">
      <h2 style={{ marginBottom: 20 }}>{isLogin ? 'Login' : 'Sign Up'}</h2>

      {error && <p className="error">{error}</p>}
      {message && <p style={{ color: 'green', marginBottom: 10 }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <input
            placeholder="Your Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" style={{ width: '100%' }}>
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>

      <p style={{ marginTop: 16, textAlign: 'center' }}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span
          onClick={() => setIsLogin(!isLogin)}
          style={{ color: '#2563eb', cursor: 'pointer' }}
        >
          {isLogin ? 'Sign Up' : 'Login'}
        </span>
      </p>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function StrengthBar({ password }) {
  const score = [
    password.length >= 6,
    password.length >= 10,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
  const labels = ['', 'Molto debole', 'Debole', 'Discreta', 'Buona', 'Ottima']

  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? colors[score] : '#d1d5db' }} />
        ))}
      </div>
      <p className="text-xs" style={{ color: colors[score] }}>{labels[score]}</p>
    </div>
  )
}

export default function NuovaPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking] = useState(true)

  // Supabase scrive la sessione nell'URL dopo il click sul link email.
  // Aspettiamo che onAuthStateChange la rilevi.
    useEffect(() => {
  const hash = window.location.hash
  if (hash) {
    const params = new URLSearchParams(hash.replace('#', ''))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const type = params.get('type')

    if (access_token && type === 'recovery') {
      supabase.auth.setSession({ access_token, refresh_token: refresh_token || '' })
        .then(({ error }) => {
          if (!error) setValidSession(true)
          setChecking(false)
        })
      return
    }
  }

  // Fallback: ascolta onAuthStateChange
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session) {
      setValidSession(true)
    }
    setChecking(false)
  })
  return () => subscription.unsubscribe()
}, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri')
      return
    }
    if (password !== conferma) {
      setError('Le password non coincidono')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "'Georgia', serif" }}>

      {/* LEFT */}
      <div className="w-1/2 bg-[#8b3a1e] hidden lg:flex flex-col justify-between px-14 py-14">
        <div>
          <p className="text-[#f5d9c8]/40 text-xs uppercase tracking-[0.2em] mb-3">Catania, Sicilia</p>
          <h1 className="text-[#f5d9c8] text-4xl font-bold leading-tight">
            Campo Sportivo<br />Panoramica
          </h1>
        </div>
        <div className="border-l-2 border-[#f5d9c8]/20 pl-6">
          <p className="text-[#f5d9c8]/65 text-xl leading-snug italic">
            "Un nuovo inizio<br />comincia da qui."
          </p>
        </div>
        <p className="text-[#f5d9c8]/25 text-xs uppercase tracking-[0.2em]">Est. 2010</p>
      </div>

      {/* RIGHT */}
      <div className="flex-1 bg-[#f2e8d9] flex items-center justify-center px-10 py-14">
        <div className="w-full max-w-sm">

          {checking ? (
            <div className="text-center text-[#3d1a0a]/40 text-sm">Verifica in corso...</div>

          ) : success ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <h2 className="text-2xl font-bold text-[#3d1a0a]">Password aggiornata!</h2>
              <p className="text-[#3d1a0a]/50 text-sm">Verrai reindirizzato al login tra pochi secondi...</p>
            </div>

          ) : !validSession ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">⚠️</div>
              <h2 className="text-2xl font-bold text-[#3d1a0a]">Link non valido</h2>
              <p className="text-[#3d1a0a]/50 text-sm leading-relaxed">
                Il link è scaduto o già utilizzato.<br />Richiedi un nuovo link di recupero.
              </p>
              <Link href="/recupera-password"
                className="inline-block mt-2 bg-[#8b3a1e] text-[#f2e8d9] font-semibold text-sm px-6 py-3 rounded-lg hover:bg-[#a04522] transition">
                Richiedi nuovo link
              </Link>
            </div>

          ) : (
            <>
              <div className="mb-8">
                <p className="text-[#8b3a1e]/50 text-xs uppercase tracking-[0.2em] mb-2">Nuova password</p>
                <h2 className="text-3xl font-bold text-[#3d1a0a] leading-tight mb-2">Reimposta la password</h2>
                <p className="text-[#3d1a0a]/50 text-sm">Scegli una password sicura per il tuo account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#3d1a0a]/50 mb-2">
                    Nuova password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-white border border-[#8b3a1e]/15 rounded-lg px-4 py-3 text-[#3d1a0a] text-sm placeholder:text-[#3d1a0a]/25 outline-none focus:border-[#8b3a1e] transition"
                  />
                  <StrengthBar password={password} />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#3d1a0a]/50 mb-2">
                    Conferma password
                  </label>
                  <input
                    type="password"
                    value={conferma}
                    onChange={(e) => setConferma(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-white border border-[#8b3a1e]/15 rounded-lg px-4 py-3 text-[#3d1a0a] text-sm placeholder:text-[#3d1a0a]/25 outline-none focus:border-[#8b3a1e] transition"
                  />
                  {conferma && password !== conferma && (
                    <p className="text-xs text-red-500 mt-1">⚠ Le password non coincidono</p>
                  )}
                  {conferma && password === conferma && (
                    <p className="text-xs text-green-600 mt-1">✓ Le password coincidono</p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    ⚠️ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#8b3a1e] text-[#f2e8d9] font-semibold text-sm py-3.5 rounded-lg hover:bg-[#a04522] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvataggio...' : 'Salva nuova password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

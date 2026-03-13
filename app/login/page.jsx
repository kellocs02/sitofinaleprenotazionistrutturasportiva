'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const LOCKOUT_KEY = 'login_lockout'
const ATTEMPTS_KEY = 'login_attempts'
const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 2 * 60 * 1000

function getLockoutState() {
  if (typeof window === 'undefined') return { locked: false, remaining: 0 }
  try {
    const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10)
    const now = Date.now()
    if (lockoutUntil && now < lockoutUntil) return { locked: true, remaining: lockoutUntil - now }
    return { locked: false, remaining: 0 }
  } catch { return { locked: false, remaining: 0 } }
}

function getAttempts() {
  if (typeof window === 'undefined') return 0
  try { return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) } catch { return 0 }
}

function formatTimeLeft(ms) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [locked, setLocked] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    setMounted(true)
    const { locked: isLocked, remaining } = getLockoutState()
    setLocked(isLocked)
    setTimeLeft(remaining)
    setAttempts(getAttempts())
  }, [])

  useEffect(() => {
    if (!locked) return
    const interval = setInterval(() => {
      const { locked: stillLocked, remaining } = getLockoutState()
      if (!stillLocked) {
        setLocked(false)
        setTimeLeft(0)
        setAttempts(0)
        localStorage.removeItem(LOCKOUT_KEY)
        localStorage.removeItem(ATTEMPTS_KEY)
        clearInterval(interval)
      } else {
        setTimeLeft(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [locked])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const { locked: isLocked } = getLockoutState()
    if (isLocked) return
    setLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      if (signInError) throw signInError
      localStorage.removeItem(ATTEMPTS_KEY)
      localStorage.removeItem(LOCKOUT_KEY)
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      const msg = err?.message?.toLowerCase() || ''
      if (msg.includes('rate') || msg.includes('too many') || msg.includes('limit')) {
        const lockoutUntil = Date.now() + 5 * 60 * 1000
        localStorage.setItem(LOCKOUT_KEY, String(lockoutUntil))
        setLocked(true)
        setTimeLeft(5 * 60 * 1000)
        setError(null)
        setLoading(false)
        return
      }
      const currentAttempts = getAttempts() + 1
      localStorage.setItem(ATTEMPTS_KEY, String(currentAttempts))
      setAttempts(currentAttempts)
      if (currentAttempts >= MAX_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS
        localStorage.setItem(LOCKOUT_KEY, String(lockoutUntil))
        setLocked(true)
        setTimeLeft(LOCKOUT_DURATION_MS)
        setError(null)
      } else {
        setError(`Email o password non validi. Tentativo ${currentAttempts} di ${MAX_ATTEMPTS}.`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Georgia&display=swap');
        @keyframes fadeUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes pulse-lock { 0%,100% { box-shadow:0 0 0 0 rgba(139,58,30,0.3); } 50% { box-shadow:0 0 0 8px rgba(139,58,30,0); } }
        .animate-in { animation: fadeUp 0.6s ease both; }
        .animate-in-2 { animation: fadeUp 0.6s ease both; animation-delay: 0.15s; }
        .spinner { width:14px; height:14px; border:2px solid rgba(242,232,217,0.3); border-top-color:#f2e8d9; border-radius:50%; animation:spin 0.7s linear infinite; }
        .lock-pulse { animation: pulse-lock 1.8s ease infinite; }
        .field-lines-svg { opacity:0.12; }
      `}</style>

      <div style={{ fontFamily: "'Georgia', serif" }} className="flex min-h-screen">

        {/* ── LEFT PANEL — Terracotta ── */}
        <div className="hidden lg:flex w-1/2 bg-[#8b3a1e] flex-col justify-between px-14 py-14 relative overflow-hidden">

          {/* Campo SVG di sfondo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="field-lines-svg w-3/4 h-3/4" viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="396" height="276" stroke="#f5d9c8" strokeWidth="3"/>
              <line x1="200" y1="2" x2="200" y2="278" stroke="#f5d9c8" strokeWidth="2"/>
              <circle cx="200" cy="140" r="40" stroke="#f5d9c8" strokeWidth="2"/>
              <circle cx="200" cy="140" r="3" fill="#f5d9c8"/>
              <rect x="2" y="75" width="70" height="130" stroke="#f5d9c8" strokeWidth="2"/>
              <rect x="2" y="105" width="30" height="70" stroke="#f5d9c8" strokeWidth="2"/>
              <rect x="328" y="75" width="70" height="130" stroke="#f5d9c8" strokeWidth="2"/>
              <rect x="368" y="105" width="30" height="70" stroke="#f5d9c8" strokeWidth="2"/>
            </svg>
          </div>

          <div className="relative z-10">
            <p className="text-[#f5d9c8]/40 text-xs uppercase tracking-[0.2em] mb-3">Messina, Sicilia</p>
            <h1 className="text-[#f5d9c8] text-4xl font-bold leading-tight">
              Campo Sportivo<br />Panoramica
            </h1>
          </div>

          <div className="relative z-10 border-l-2 border-[#f5d9c8]/20 pl-6 animate-in">
            <p className="text-[#f5d9c8]/65 text-xl leading-snug italic">
              "Il campo ti aspetta.<br />Tutto il resto è solo una scusa."
            </p>
          </div>

          <p className="relative z-10 text-[#f5d9c8]/25 text-xs uppercase tracking-[0.2em]">Est. 2010</p>
        </div>

        {/* ── RIGHT PANEL — Crema sabbia ── */}
        <div className="w-full lg:w-1/2 bg-[#f2e8d9] flex flex-col justify-between px-14 py-14">

          <div className="flex justify-end">
            <span className="text-[#8b3a1e]/30 text-xs uppercase tracking-[0.2em]">Accesso piattaforma</span>
          </div>

          <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            <p className="text-[#8b3a1e]/40 text-xs uppercase tracking-[0.2em] mb-3">Bentornato</p>
            <h2 className="text-[#3d1a0a] text-3xl font-bold leading-tight mb-3">
              Accedi al tuo<br />account
            </h2>
            <p className="text-[#3d1a0a]/50 text-sm leading-relaxed mb-8 max-w-xs">
              Inserisci le tue credenziali per continuare a prenotare i tuoi campi.
            </p>

            {locked ? (
              <div className="lock-pulse max-w-xs rounded-xl border border-[#8b3a1e]/30 bg-[#8b3a1e]/10 p-6 text-center space-y-3">
                <div className="text-3xl">🔒</div>
                <p className="text-[#8b3a1e] font-semibold text-sm uppercase tracking-wide">Account temporaneamente bloccato</p>
                <p className="text-[#3d1a0a]/50 text-xs leading-relaxed">
                  Troppi tentativi falliti.<br />Riprova tra:
                </p>
                <div className="text-4xl font-bold text-[#8b3a1e] tracking-wider">
                  {formatTimeLeft(timeLeft)}
                </div>
                <p className="text-[#3d1a0a]/30 text-[11px]">minuti : secondi</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 max-w-xs">

                {attempts > 0 && (
                  <div className="flex gap-1.5 items-center">
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <div key={i} className={`h-0.5 flex-1 rounded-full transition-all duration-300
                        ${i < attempts ? 'bg-[#8b3a1e]' : 'bg-[#8b3a1e]/15'}`} />
                    ))}
                    <span className="text-[11px] text-[#3d1a0a]/30 ml-1 whitespace-nowrap">
                      {MAX_ATTEMPTS - attempts} rimasti
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold tracking-[1.5px] uppercase text-[#3d1a0a]/40 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="mario@example.com"
                    className="w-full bg-white/60 border border-[#8b3a1e]/15 rounded-lg px-4 py-3 text-[#3d1a0a] text-sm
                      placeholder:text-[#3d1a0a]/25 outline-none transition-all duration-200
                      focus:border-[#8b3a1e]/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,58,30,0.08)]"
                    style={{ fontFamily: "'Georgia', serif" }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-[1.5px] uppercase text-[#3d1a0a]/40 mb-1.5">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full bg-white/60 border border-[#8b3a1e]/15 rounded-lg px-4 py-3 text-[#3d1a0a] text-sm
                      placeholder:text-[#3d1a0a]/25 outline-none transition-all duration-200
                      focus:border-[#8b3a1e]/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(139,58,30,0.08)]"
                    style={{ fontFamily: "'Georgia', serif" }}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-[#8b3a1e]/8 border border-[#8b3a1e]/20 text-[#8b3a1e] px-4 py-3 rounded-lg text-[13px]">
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#8b3a1e] text-[#f2e8d9] font-semibold text-sm py-3.5 rounded-lg
                    transition-all duration-200 hover:enabled:bg-[#a04522] hover:enabled:-translate-y-px
                    hover:enabled:shadow-[0_6px_20px_rgba(139,58,30,0.25)]
                    active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="spinner" />
                      Accesso in corso…
                    </span>
                  ) : 'Accedi'}
                </button>
              </form>
            )}

          </div>

          <div className="space-y-1.5">
            <p className="text-[#3d1a0a]/40 text-xs">
              Non hai un account?{' '}
              <Link href="/registrazione" className="text-[#8b3a1e] font-semibold hover:text-[#a04522] transition-colors">
                Registrati gratis
              </Link>
            </p>
            <p>
              <a href="/recupera-password" className="text-[#3d1a0a]/30 text-xs hover:text-[#8b3a1e] transition-colors">
                Password dimenticata?
              </a>
            </p>
            <p className="text-[#3d1a0a]/20 text-xs pt-2">© 2025 Campo Sportivo Panoramica</p>
          </div>

        </div>
      </div>
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const LOCKOUT_KEY = 'login_lockout'
const ATTEMPTS_KEY = 'login_attempts'
const MAX_ATTEMPTS = 3
const LOCKOUT_DURATION_MS = 2 * 60 * 1000 // 2 minuti

function getLockoutState() {
  if (typeof window === 'undefined') return { locked: false, remaining: 0 }
  try {
    const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10)
    const now = Date.now()
    if (lockoutUntil && now < lockoutUntil) {
      return { locked: true, remaining: lockoutUntil - now }
    }
    return { locked: false, remaining: 0 }
  } catch {
    return { locked: false, remaining: 0 }
  }
}

function getAttempts() {
  if (typeof window === 'undefined') return 0
  try {
    return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10)
  } catch {
    return 0
  }
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

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

      // Bloccato da Supabase server-side per rate limit
      if (msg.includes('rate') || msg.includes('too many') || msg.includes('limit')) {
        const lockoutUntil = Date.now() + 5 * 60 * 1000 // 5 min allineato al rate limit di Supabase
        localStorage.setItem(LOCKOUT_KEY, String(lockoutUntil))
        setLocked(true)
        setTimeLeft(5 * 60 * 1000)
        setError(null)
        setLoading(false)
        return
      }

      // Contatore locale
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
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        .font-bebas { font-family: 'Bebas Neue', sans-serif; }
        .font-dm    { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes pulse-glow { 0%,100% { box-shadow:0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow:0 0 0 8px rgba(239,68,68,0); } }
        .animate-fadeup-2{ animation: fadeUp 0.8s ease both; animation-delay:0.2s; }
        .animate-fadeup-4{ animation: fadeUp 0.8s ease both; animation-delay:0.4s; }
        .spinner { width:16px; height:16px; border:2px solid rgba(0,0,0,0.2); border-top-color:#0a0a0a; border-radius:50%; animation:spin 0.7s linear infinite; }
        .lock-pulse { animation: pulse-glow 1.5s ease infinite; }
        .field-lines-svg { opacity:0.18; }
      `}</style>

      <div className="font-dm flex min-h-screen bg-[#0a0a0a]">

        {/* ── LEFT PANEL ── */}
        <div className="hidden lg:block flex-1 relative overflow-hidden">
          <div className="absolute inset-0" style={{
            background: `
              linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.7) 100%),
              repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.03) 60px, rgba(255,255,255,0.03) 61px),
              repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.03) 60px, rgba(255,255,255,0.03) 61px),
              linear-gradient(175deg, #1a6b2a 0%, #0d4a1a 40%, #0a3d14 70%, #071f0b 100%)`
          }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="field-lines-svg w-3/4 h-3/4" viewBox="0 0 400 280" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="396" height="276" stroke="white" strokeWidth="3"/>
              <line x1="200" y1="2" x2="200" y2="278" stroke="white" strokeWidth="2"/>
              <circle cx="200" cy="140" r="40" stroke="white" strokeWidth="2"/>
              <circle cx="200" cy="140" r="3" fill="white"/>
              <rect x="2" y="75" width="70" height="130" stroke="white" strokeWidth="2"/>
              <rect x="2" y="105" width="30" height="70" stroke="white" strokeWidth="2"/>
              <rect x="328" y="75" width="70" height="130" stroke="white" strokeWidth="2"/>
              <rect x="368" y="105" width="30" height="70" stroke="white" strokeWidth="2"/>
              <path d="M2 2 Q12 2 12 12" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M398 2 Q388 2 388 12" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M2 278 Q12 278 12 268" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M398 278 Q388 278 388 268" stroke="white" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between p-12">
            <div className="inline-flex items-center gap-2.5 bg-white/[0.08] border border-white/15 backdrop-blur-md px-[18px] py-2.5 rounded-full w-fit">
              <span className="font-bebas text-xl text-green-400 tracking-[2px]">⚽ CAMPO+</span>
            </div>
            <div className="animate-fadeup-2">
              <h2 className="font-bebas text-[clamp(52px,6vw,88px)] text-white leading-[0.95] tracking-[2px]">
                PRENOTA<br />IL TUO<br /><span className="text-green-400">CAMPO.</span>
              </h2>
              <p className="text-white/60 text-base mt-5 max-w-[340px] leading-relaxed font-light">
                La piattaforma più veloce per prenotare campi da calcio nella tua città. In pochi click, sei in campo.
              </p>
            </div>
            <div className="flex gap-8 animate-fadeup-4">
              {[['12+','Campi'],['500+','Prenotazioni'],['24/7','Disponibile']].map(([num, label]) => (
                <div key={label}>
                  <div className="font-bebas text-[36px] text-green-400 leading-none">{num}</div>
                  <div className="text-[11px] text-white/45 uppercase tracking-[1px] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-full lg:w-[480px] lg:shrink-0 bg-[#0f0f0f] flex items-center justify-center px-10 py-12 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-[120px] -right-[80px] w-[350px] h-[350px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)' }} />
          <div className="pointer-events-none absolute -bottom-[100px] -left-[60px] w-[280px] h-[280px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.05) 0%, transparent 70%)' }} />

          <div className={`w-full max-w-[380px] relative z-10 transition-all duration-700 ease-out
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

            <div className="mb-10">
              <p className="text-[11px] font-semibold tracking-[3px] uppercase text-green-400 mb-3">Accesso</p>
              <h1 className="font-bebas text-[52px] text-white leading-none tracking-[2px]">BENTORNATO</h1>
              <p className="text-white/35 text-sm mt-2.5 font-light">Inserisci le tue credenziali per continuare</p>
            </div>

            {locked ? (
              <div className="lock-pulse rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-3">
                <div className="text-4xl">🔒</div>
                <p className="text-red-300 font-semibold text-sm tracking-wide uppercase">Account temporaneamente bloccato</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  Troppi tentativi falliti.<br />Riprova tra:
                </p>
                <div className="font-bebas text-5xl text-red-400 tracking-wider">
                  {formatTimeLeft(timeLeft)}
                </div>
                <p className="text-white/30 text-[11px]">minuti : secondi</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">

                {attempts > 0 && (
                  <div className="flex gap-1.5 items-center">
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                        ${i < attempts ? 'bg-red-500' : 'bg-white/10'}`} />
                    ))}
                    <span className="text-[11px] text-white/30 ml-1 whitespace-nowrap">
                      {MAX_ATTEMPTS - attempts} rimasti
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold tracking-[1.5px] uppercase text-white/40 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="mario@example.com"
                    className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-[18px] py-3.5 text-white text-[15px]
                      placeholder:text-white/20 outline-none transition-all duration-200
                      focus:border-green-400 focus:bg-green-400/5 focus:shadow-[0_0_0_3px_rgba(74,222,128,0.1)] font-dm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-[1.5px] uppercase text-white/40 mb-2">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/[0.08] rounded-xl px-[18px] py-3.5 text-white text-[15px]
                      placeholder:text-white/20 outline-none transition-all duration-200
                      focus:border-green-400 focus:bg-green-400/5 focus:shadow-[0_0_0_3px_rgba(74,222,128,0.1)] font-dm"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-300 px-4 py-3 rounded-xl text-[13px]">
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-green-400 text-[#0a0a0a] border-none rounded-xl py-4
                    font-bebas text-[22px] tracking-[3px] cursor-pointer transition-all duration-200
                    hover:enabled:bg-green-500 hover:enabled:-translate-y-px hover:enabled:shadow-[0_8px_24px_rgba(74,222,128,0.3)]
                    active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="spinner" />
                      ACCESSO IN CORSO
                    </span>
                  ) : 'ACCEDI'}
                </button>
              </form>
            )}

            <div className="h-px bg-white/[0.06] my-7" />

            <div className="text-center space-y-2.5">
              <p className="text-white/30 text-[13px]">
                Non hai un account?{' '}
                <Link href="/registrazione" className="text-green-400 font-semibold no-underline hover:text-green-300 transition-colors">
                  Registrati gratis
                </Link>
              </p>
              <p>
                <a href="/recupera-password" className="text-white/30 text-[13px] hover:text-green-400 transition-colors">
                  Password dimenticata?
                </a>
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

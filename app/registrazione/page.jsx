'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function StrengthBar({ password }) {
  const calc = (p) => {
    let s = 0
    if (p.length >= 6) s++
    if (p.length >= 10) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const score = calc(password)
  const labels = ['', 'Molto debole', 'Debole', 'Discreta', 'Buona', 'Ottima']
  const colors = ['', '#c0392b', '#e07b39', '#c8a000', '#6a8f3a', '#3d6e22']

  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-0.5 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? colors[score] : 'rgba(139,58,30,0.12)' }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: colors[score] }}>{labels[score]}</p>
    </div>
  )
}

function EmailVerificationPopup({ email, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(61,26,10,0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        className="rounded-2xl p-8 max-w-sm w-full text-center"
        style={{
          backgroundColor: '#f2e8d9',
          animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
          boxShadow: '0 20px 60px rgba(61,26,10,0.2)'
        }}
      >
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#3d1a0a', fontFamily: "'Georgia', serif" }}>
          Controlla la tua email!
        </h2>
        <p className="text-sm mb-1" style={{ color: 'rgba(61,26,10,0.5)' }}>Abbiamo inviato un link di verifica a:</p>
        <p className="font-semibold break-all mb-4" style={{ color: '#8b3a1e' }}>{email}</p>
        <p className="text-sm mb-6" style={{ color: 'rgba(61,26,10,0.5)' }}>
          Clicca il link nella mail per attivare il tuo account. Controlla anche la cartella{' '}
          <span className="font-medium" style={{ color: '#3d1a0a' }}>spam</span>.
        </p>
        <button
          onClick={onClose}
          className="w-full font-semibold py-3 rounded-lg transition-all hover:-translate-y-px"
          style={{
            backgroundColor: '#8b3a1e',
            color: '#f2e8d9',
            fontFamily: "'Georgia', serif"
          }}
        >
          Ho capito
        </button>
      </div>
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default function RegistrazionePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [mounted, setMounted] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confermaPassword: '',
    nomeCompleto: '',
    telefono: ''
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const validate = (data) => {
    const e = {}
    if (!data.nomeCompleto.trim()) e.nomeCompleto = 'Il nome è obbligatorio'
    else if (data.nomeCompleto.trim().length < 3) e.nomeCompleto = 'Inserisci nome e cognome'
    if (!data.email) e.email = "L'email è obbligatoria"
    else if (!emailRegex.test(data.email)) e.email = 'Formato email non valido'
    if (data.telefono && !/^\+?[\d\s\-()]{7,15}$/.test(data.telefono)) e.telefono = 'Numero non valido'
    if (!data.password) e.password = 'La password è obbligatoria'
    else if (data.password.length < 6) e.password = 'Minimo 6 caratteri'
    if (!data.confermaPassword) e.confermaPassword = 'Conferma la password'
    else if (data.password !== data.confermaPassword) e.confermaPassword = 'Le password non coincidono'
    return e
  }

  useEffect(() => {
    setMounted(true)
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) window.location.href = `/nuova-password?code=${code}`
  }, [])

  useEffect(() => {
    if (Object.keys(touched).length > 0) setErrors(validate(formData))
  }, [formData])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'telefono') {
      setFormData((prev) => ({ ...prev, telefono: value.replace(/[^\d\s+\-()]/g, '') }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }))
    setErrors(validate(formData))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const allTouched = Object.keys(formData).reduce((acc, k) => ({ ...acc, [k]: true }), {})
    setTouched(allTouched)
    const validationErrors = validate(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { nome_completo: formData.nomeCompleto },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (signUpError) {
        const msg = signUpError.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already')) {
          setErrors((prev) => ({ ...prev, email: 'Esiste già un account con questa email' }))
          setTouched((prev) => ({ ...prev, email: true }))
          return
        }
        throw signUpError
      }
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setErrors((prev) => ({ ...prev, email: 'Esiste già un account con questa email' }))
        setTouched((prev) => ({ ...prev, email: true }))
        return
      }
      if (data?.user) {
        await supabase.from('profili').upsert({
          id: data.user.id,
          nome_completo: formData.nomeCompleto,
          telefono: formData.telefono,
          ruolo: 'utente'
        })
      }
      setShowPopup(true)
    } catch (err) {
      console.error('Errore registrazione:', err)
      setErrors((prev) => ({ ...prev, _global: err.message }))
    } finally {
      setLoading(false)
    }
  }

  const handlePopupClose = () => {
    setShowPopup(false)
    router.push('/login')
  }

  const field = (name) => ({
    error: touched[name] && errors[name],
    valid: touched[name] && !errors[name] && formData[name],
  })

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .animate-in { animation: fadeUp 0.5s ease both; }
        .spinner { width:14px; height:14px; border:2px solid rgba(242,232,217,0.3); border-top-color:#f2e8d9; border-radius:50%; animation:spin 0.7s linear infinite; }
        .field-lines-svg { opacity: 0.12; }
      `}</style>

      {showPopup && <EmailVerificationPopup email={formData.email} onClose={handlePopupClose} />}

      <div className="flex min-h-screen" style={{ fontFamily: "'Georgia', serif" }}>

        {/* ── LEFT PANEL — Terracotta ── */}
        <div className="hidden lg:flex w-1/2 bg-[#8b3a1e] flex-col justify-between px-14 py-14 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="field-lines-svg w-3/4 h-3/4" viewBox="0 0 400 280" fill="none">
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
        <div className="w-full lg:w-1/2 bg-[#f2e8d9] flex flex-col justify-between px-14 py-14 overflow-y-auto">

          <div className="flex justify-end">
            <span className="text-[#8b3a1e]/30 text-xs uppercase tracking-[0.2em]">Nuova registrazione</span>
          </div>

          <div className={`my-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            <p className="text-[#8b3a1e]/40 text-xs uppercase tracking-[0.2em] mb-3">Benvenuto</p>
            <h2 className="text-[#3d1a0a] text-3xl font-bold leading-tight mb-3">
              Crea il tuo<br />account
            </h2>
            <p className="text-[#3d1a0a]/50 text-sm leading-relaxed mb-8 max-w-xs">
              Registrati per iniziare a prenotare i campi del Centro Sportivo Panoramica.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5 max-w-xs" noValidate>

              <Field label="Nome Completo" error={field('nomeCompleto').error} valid={field('nomeCompleto').valid}>
                <input
                  type="text" name="nomeCompleto" value={formData.nomeCompleto}
                  onChange={handleChange} onBlur={handleBlur}
                  autoComplete="name" placeholder="Mario Rossi"
                  className="w-full px-4 py-3 rounded-lg outline-none text-sm transition-all duration-200"
                  style={inputStyle(field('nomeCompleto'))}
                />
              </Field>

              <Field label="Email" error={field('email').error} valid={field('email').valid}>
                <input
                  type="email" name="email" value={formData.email}
                  onChange={handleChange} onBlur={handleBlur}
                  autoComplete="email" placeholder="mario@example.com"
                  className="w-full px-4 py-3 rounded-lg outline-none text-sm transition-all duration-200"
                  style={inputStyle(field('email'))}
                />
              </Field>

              <Field label="Telefono (opzionale)" error={field('telefono').error} valid={field('telefono').valid}>
                <input
                  type="tel" name="telefono" value={formData.telefono}
                  onChange={handleChange} onBlur={handleBlur}
                  autoComplete="tel" placeholder="+39 333 123 4567" inputMode="tel"
                  className="w-full px-4 py-3 rounded-lg outline-none text-sm transition-all duration-200"
                  style={inputStyle(field('telefono'))}
                />
                <p className="text-[11px] mt-1" style={{ color: 'rgba(61,26,10,0.3)' }}>Solo numeri, spazi, +, ( ) e -</p>
              </Field>

              <Field label="Password" error={field('password').error} valid={field('password').valid}>
                <input
                  type="password" name="password" value={formData.password}
                  onChange={handleChange} onBlur={handleBlur}
                  autoComplete="new-password" placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg outline-none text-sm transition-all duration-200"
                  style={inputStyle(field('password'))}
                />
                <StrengthBar password={formData.password} />
              </Field>

              <Field label="Conferma Password" error={field('confermaPassword').error} valid={field('confermaPassword').valid}>
                <input
                  type="password" name="confermaPassword" value={formData.confermaPassword}
                  onChange={handleChange} onBlur={handleBlur}
                  autoComplete="new-password" placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg outline-none text-sm transition-all duration-200"
                  style={inputStyle(field('confermaPassword'))}
                />
              </Field>

              {errors._global && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'rgba(139,58,30,0.08)', border: '1px solid rgba(139,58,30,0.2)', color: '#8b3a1e' }}>
                  <span>⚠️</span> {errors._global}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full font-semibold text-sm py-3.5 rounded-lg transition-all duration-200
                  hover:enabled:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#8b3a1e',
                  color: '#f2e8d9',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(139,58,30,0.25)'
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner" />
                    Registrazione in corso…
                  </span>
                ) : 'Registrati'}
              </button>
            </form>
          </div>

          <div className="space-y-1">
            <p className="text-[#3d1a0a]/40 text-xs">
              Hai già un account?{' '}
              <Link href="/login" className="text-[#8b3a1e] font-semibold hover:text-[#a04522] transition-colors">
                Accedi
              </Link>
            </p>
            <p className="text-[#3d1a0a]/20 text-xs pt-1">© 2025 Campo Sportivo Panoramica</p>
          </div>

        </div>
      </div>
    </>
  )
}

function inputStyle({ error, valid }) {
  const border = error
    ? '1.5px solid rgba(139,58,30,0.6)'
    : valid
    ? '1.5px solid rgba(139,58,30,0.35)'
    : '1.5px solid rgba(139,58,30,0.15)'
  return {
    border,
    backgroundColor: 'rgba(255,255,255,0.6)',
    color: '#3d1a0a',
    fontFamily: "'Georgia', serif",
  }
}

function Field({ label, error, valid, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-[1.5px] uppercase mb-1.5"
        style={{ color: 'rgba(61,26,10,0.4)' }}>
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: '#8b3a1e' }}>
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}
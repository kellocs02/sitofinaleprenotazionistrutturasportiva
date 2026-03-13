'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// --- Helpers ---
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
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']

  if (!password) return null
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? colors[score] : '#e5e7eb' }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: colors[score] }}>
        {labels[score]}
      </p>
    </div>
  )
}

// --- Email verification popup ---
function EmailVerificationPopup({ email, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
        style={{ animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <div className="text-6xl mb-4">📬</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Controlla la tua email!</h2>
        <p className="text-gray-500 text-sm mb-1">Abbiamo inviato un link di verifica a:</p>
        <p className="font-semibold text-blue-600 break-all mb-4">{email}</p>
        <p className="text-gray-500 text-sm mb-6">
          Clicca il link nella mail per attivare il tuo account. Controlla anche la cartella <span className="font-medium">spam</span>.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
        >
          Ho capito
        </button>
      </div>
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// --- Main component ---
export default function RegistrazionePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confermaPassword: '',
    nomeCompleto: '',
    telefono: ''
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // --- Validation rules ---
  const validate = (data) => {
    const e = {}

    if (!data.nomeCompleto.trim()) {
      e.nomeCompleto = 'Il nome è obbligatorio'
    } else if (data.nomeCompleto.trim().length < 3) {
      e.nomeCompleto = 'Inserisci nome e cognome'
    }

    if (!data.email) {
      e.email = "L'email è obbligatoria"
    } else if (!emailRegex.test(data.email)) {
      e.email = 'Formato email non valido'
    }

    if (data.telefono && !/^\+?[\d\s\-()]{7,15}$/.test(data.telefono)) {
      e.telefono = 'Numero di telefono non valido'
    }

    if (!data.password) {
      e.password = 'La password è obbligatoria'
    } else if (data.password.length < 6) {
      e.password = 'Minimo 6 caratteri'
    }

    if (!data.confermaPassword) {
      e.confermaPassword = 'Conferma la password'
    } else if (data.password !== data.confermaPassword) {
      e.confermaPassword = 'Le password non coincidono'
    }

    return e
  }

    useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      window.location.href = `/nuova-password?code=${code}`
    }
  }, [])

  // Revalidate on every change
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      setErrors(validate(formData))
    }
  }, [formData])

  const handleChange = (e) => {
    const { name, value } = e.target

    // Phone: allow only digits, spaces, +, -, ()
    if (name === 'telefono') {
      const cleaned = value.replace(/[^\d\s+\-()]/g, '')
      setFormData((prev) => ({ ...prev, telefono: cleaned }))
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

    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, k) => ({ ...acc, [k]: true }), {})
    setTouched(allTouched)

    const validationErrors = validate(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)

    try {
      // Check if email already exists by attempting sign-in with wrong password
      // Supabase doesn't expose a direct "email exists" endpoint safely,
      // so we use signInWithPassword and check for "Invalid login credentials" vs other errors.
      // A cleaner approach: call signUp and check for "User already registered" error.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { nome_completo: formData.nomeCompleto },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (signUpError) {
        // "User already registered" comes from Supabase
        if (
          signUpError.message.toLowerCase().includes('already registered') ||
          signUpError.message.toLowerCase().includes('already exists') ||
          signUpError.message.toLowerCase().includes('email address is already')
        ) {
          setErrors((prev) => ({
            ...prev,
            email: 'Esiste già un account con questa email'
          }))
          setTouched((prev) => ({ ...prev, email: true }))
          return
        }
        throw signUpError
      }

      // Supabase sometimes returns a user but with identities: [] when email is already used
      // (when email confirmation is enabled), handle that case:
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setErrors((prev) => ({
          ...prev,
          email: 'Esiste già un account con questa email'
        }))
        setTouched((prev) => ({ ...prev, email: true }))
        return
      }

      // Save profile
      if (data?.user) {
        await supabase.from('profili').upsert({
          id: data.user.id,
          nome_completo: formData.nomeCompleto,
          telefono: formData.telefono,
          ruolo: 'utente'
        })
      }

      // Show email verification popup
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
    borderColor: touched[name] ? (errors[name] ? '#ef4444' : '#22c55e') : '#d1d5db'
  })

  return (
    <>
      {showPopup && (
        <EmailVerificationPopup email={formData.email} onClose={handlePopupClose} />
      )}

      <div className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #f0fdf4 100%)',
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif"
        }}
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
          style={{ boxShadow: '0 20px 60px rgba(59,130,246,0.12)' }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⚽</div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Crea account</h1>
            <p className="text-gray-500 mt-1 text-sm">Registrati per iniziare</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Nome */}
            <Field
              label="Nome Completo"
              error={field('nomeCompleto').error}
              borderColor={field('nomeCompleto').borderColor}
            >
              <input
                type="text"
                name="nomeCompleto"
                value={formData.nomeCompleto}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="name"
                placeholder="Mario Rossi"
                className="w-full px-4 py-3 rounded-xl outline-none text-gray-900 text-sm transition"
                style={{ border: `1.5px solid ${field('nomeCompleto').borderColor}`, background: '#fafafa' }}
              />
            </Field>

            {/* Email */}
            <Field
              label="Email"
              error={field('email').error}
              borderColor={field('email').borderColor}
            >
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                placeholder="mario@example.com"
                className="w-full px-4 py-3 rounded-xl outline-none text-gray-900 text-sm transition"
                style={{ border: `1.5px solid ${field('email').borderColor}`, background: '#fafafa' }}
              />
            </Field>

            {/* Telefono */}
            <Field
              label="Telefono (opzionale)"
              error={field('telefono').error}
              borderColor={field('telefono').borderColor}
            >
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="tel"
                placeholder="+39 333 123 4567"
                inputMode="tel"
                className="w-full px-4 py-3 rounded-xl outline-none text-gray-900 text-sm transition"
                style={{ border: `1.5px solid ${field('telefono').borderColor}`, background: '#fafafa' }}
              />
              <p className="text-xs text-gray-400 mt-1">Solo numeri, spazi, +, ( ) e -</p>
            </Field>

            {/* Password */}
            <Field
              label="Password"
              error={field('password').error}
              borderColor={field('password').borderColor}
            >
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl outline-none text-gray-900 text-sm transition"
                style={{ border: `1.5px solid ${field('password').borderColor}`, background: '#fafafa' }}
              />
              <StrengthBar password={formData.password} />
            </Field>

            {/* Conferma password */}
            <Field
              label="Conferma Password"
              error={field('confermaPassword').error}
              borderColor={field('confermaPassword').borderColor}
            >
              <input
                type="password"
                name="confermaPassword"
                value={formData.confermaPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl outline-none text-gray-900 text-sm transition"
                style={{ border: `1.5px solid ${field('confermaPassword').borderColor}`, background: '#fafafa' }}
              />
            </Field>

            {/* Global error */}
            {errors._global && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                ⚠️ {errors._global}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-xl transition-all text-sm mt-2"
              style={{
                background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(37,99,235,0.35)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Registrazione in corso...
                </span>
              ) : 'Registrati'}
            </button>
          </form>

          {/* Link login */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Hai già un account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Accedi
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

// --- Reusable field wrapper ---
function Field({ label, error, borderColor, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  )
}

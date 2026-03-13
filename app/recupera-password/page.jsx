'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RecuperaPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nuova-password`,
      })
      if (error) throw error
      setSent(true)
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
            "Nessun problema è<br />senza soluzione."
          </p>
        </div>
        <p className="text-[#f5d9c8]/25 text-xs uppercase tracking-[0.2em]">Est. 2010</p>
      </div>

      {/* RIGHT */}
      <div className="flex-1 bg-[#f2e8d9] flex items-center justify-center px-10 py-14">
        <div className="w-full max-w-sm">

          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📬</div>
              <h2 className="text-2xl font-bold text-[#3d1a0a]">Controlla la tua email</h2>
              <p className="text-[#3d1a0a]/55 text-sm leading-relaxed">
                Abbiamo inviato un link a <span className="font-semibold text-[#8b3a1e]">{email}</span>.<br />
                Clicca il link per impostare una nuova password.
              </p>
              <p className="text-[#3d1a0a]/35 text-xs">Controlla anche la cartella spam.</p>
              <Link href="/login" className="inline-block mt-4 text-sm font-semibold text-[#8b3a1e] hover:underline">
                ← Torna al login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-[#8b3a1e]/50 text-xs uppercase tracking-[0.2em] mb-2">Recupero accesso</p>
                <h2 className="text-3xl font-bold text-[#3d1a0a] leading-tight mb-2">Password dimenticata?</h2>
                <p className="text-[#3d1a0a]/50 text-sm leading-relaxed">
                  Inserisci la tua email e ti mandiamo un link per reimpostarla.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#3d1a0a]/50 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="mario@example.com"
                    className="w-full bg-white border border-[#8b3a1e]/15 rounded-lg px-4 py-3 text-[#3d1a0a] text-sm placeholder:text-[#3d1a0a]/25 outline-none focus:border-[#8b3a1e] transition"
                  />
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
                  {loading ? 'Invio in corso...' : 'Invia link di recupero'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-[#8b3a1e]/60 hover:text-[#8b3a1e] transition">
                  ← Torna al login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
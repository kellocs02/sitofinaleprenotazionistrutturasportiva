'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export default function Profilo() {
  const router = useRouter()
  const [profilo, setProfilo] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    caricaProfilo()
  }, [])

  const caricaProfilo = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? (await supabase.auth.getUser()).data.user
    if (!user) { router.push('/login'); return }
    setAuthUser(user)

    const { data, error } = await supabase
      .from('profili').select('*').eq('id', user.id).single()

    if (error || !data) { router.push('/login'); return }
    setProfilo(data)
  }

  const gestisciImmagine = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setUploading(true)
    const nomeFile = uuidv4() + '_' + file.name
    const { error } = await supabase.storage
      .from('avatars').upload(`public/${nomeFile}`, file, { upsert: true })
    if (error) { console.error(error); setUploading(false); return }
    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(`public/${nomeFile}`)
    await supabase.from('profili').update({ avatar_url: publicUrl.publicUrl }).eq('id', profilo.id)
    setProfilo(p => ({ ...p, avatar_url: publicUrl.publicUrl }))
    setUploading(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isVerified = authUser?.email_confirmed_at != null
  const dataIscrizione = authUser?.created_at
    ? new Date(authUser.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100% { opacity:.4; } 50% { opacity:.8; } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .delay-1 { animation-delay: 0.08s; }
        .delay-2 { animation-delay: 0.16s; }
        .delay-3 { animation-delay: 0.24s; }
        .delay-4 { animation-delay: 0.32s; }
        .spinner { width:16px; height:16px; border:2px solid rgba(26,58,42,0.2); border-top-color:#1a3a2a; border-radius:50%; animation:spin 0.7s linear infinite; }
        .avatar-ring { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .avatar-ring:hover { transform: scale(1.04); box-shadow: 0 0 0 4px rgba(26,58,42,0.15); }
        .info-row { transition: background 0.2s; }
        .info-row:hover { background: rgba(26,58,42,0.04); }
        .btn-logout:hover { background: rgba(192,57,43,0.08); color: #a93226; }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f5f0e8', fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── HEADER ── */}
        <header style={{ backgroundColor: '#1a3a2a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          className="px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 transition-colors"
            style={{ color: 'rgba(245,240,232,0.6)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f5f0e8'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,240,232,0.6)'}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Indietro</span>
          </button>

          <div className="flex items-center gap-3">
            <svg viewBox="0 0 400 280" fill="none" className="w-8 h-6" style={{ opacity: 0.7 }}>
              <rect x="2" y="2" width="396" height="276" stroke="#f5f0e8" strokeWidth="3"/>
              <line x1="200" y1="2" x2="200" y2="278" stroke="#f5f0e8" strokeWidth="2"/>
              <circle cx="200" cy="140" r="40" stroke="#f5f0e8" strokeWidth="2"/>
            </svg>
            <span className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'Playfair Display', serif" }}>
              Campo Sportivo Panoramica
            </span>
          </div>

          <button onClick={logout}
            className="btn-logout flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm"
            style={{ color: 'rgba(245,240,232,0.5)' }}>
            <span>Logout</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
          </button>
        </header>

        {/* ── BODY ── */}
        <div className="flex-1 flex items-start justify-center px-4 py-12">
          {!profilo ? (
            <div className="flex flex-col items-center gap-4 mt-24">
              <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(13,31,21,0.3)' }}>Caricamento profilo…</p>
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-4">

              {/* ── CARD AVATAR ── */}
              <div className="fade-up rounded-2xl overflow-hidden" style={{ backgroundColor: '#1a3a2a', boxShadow: '0 12px 40px rgba(13,31,21,0.18)' }}>
                <div className="flex flex-col items-center px-8 pt-10 pb-8 gap-4">

                  {/* Avatar */}
                  <label className="cursor-pointer avatar-ring rounded-full block">
                    <div className="relative">
                      <img
                        src={profilo.avatar_url || '/default-avatar.png'}
                        alt="Foto profilo"
                        className="w-24 h-24 rounded-full object-cover"
                        style={{ border: '3px solid rgba(245,240,232,0.2)' }}
                      />
                      {uploading && (
                        <div className="absolute inset-0 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(13,31,21,0.6)' }}>
                          <div className="spinner" style={{ borderColor: 'rgba(245,240,232,0.3)', borderTopColor: '#f5f0e8' }} />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#f5f0e8' }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="#1a3a2a" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.172a2 2 0 001.414-.586l.828-.828A2 2 0 018.828 5h6.344a2 2 0 011.414.586l.828.828A2 2 0 0018.828 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={gestisciImmagine} />
                  </label>

                  {/* Nome */}
                  <div className="text-center">
                    <h1 className="text-2xl font-bold" style={{ color: '#f5f0e8', fontFamily: "'Playfair Display', serif" }}>
                      {profilo.nome_completo}
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: 'rgba(245,240,232,0.45)' }}>
                      {authUser?.email}
                    </p>
                  </div>

                  {/* Badge verificato */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: isVerified ? 'rgba(245,240,232,0.12)' : 'rgba(192,57,43,0.2)',
                      color: isVerified ? 'rgba(245,240,232,0.7)' : '#e07b39',
                      border: `1px solid ${isVerified ? 'rgba(245,240,232,0.15)' : 'rgba(192,57,43,0.3)'}`,
                    }}>
                    <span>{isVerified ? '✓' : '!'}</span>
                    <span>{isVerified ? 'Account verificato' : 'Email non verificata'}</span>
                  </div>

                  {/* Statistiche */}
                  <div className="w-full grid grid-cols-3 gap-2 pt-2">
                    {[
                      { label: 'Prenotazioni', val: '0' },
                      { label: 'Campi', val: '0' },
                      { label: 'Ore giocate', val: '0' },
                    ].map(({ label, val }) => (
                      <div key={label} className="rounded-xl p-3 text-center"
                        style={{ backgroundColor: 'rgba(245,240,232,0.06)', border: '1px solid rgba(245,240,232,0.08)' }}>
                        <p className="text-xl font-bold" style={{ color: '#f5f0e8', fontFamily: "'Playfair Display', serif" }}>{val}</p>
                        <p className="text-[10px] mt-0.5 uppercase tracking-wide" style={{ color: 'rgba(245,240,232,0.35)' }}>{label}</p>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* ── CARD DETTAGLI ── */}
              <div className="fade-up delay-1 rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(26,58,42,0.1)', boxShadow: '0 4px 20px rgba(13,31,21,0.06)' }}>
                <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(26,58,42,0.08)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: 'rgba(13,31,21,0.35)' }}>Informazioni</p>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(26,58,42,0.06)' }}>
                  {[
                    { icon: '📱', label: 'Telefono', value: profilo.telefono || '—' },
                    { icon: '📅', label: 'Iscritto il', value: dataIscrizione },
                    { icon: '🏅', label: 'Ruolo', value: profilo.ruolo === 'proprietario' ? 'Proprietario' : 'Giocatore' },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="info-row flex items-center gap-4 px-5 py-3.5">
                      <span className="text-base w-6 text-center">{icon}</span>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'rgba(13,31,21,0.4)' }}>{label}</span>
                        <span className="text-sm font-medium" style={{ color: '#0d1f15' }}>{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── CARD AZIONI ── */}
              <div className="fade-up delay-2 rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(26,58,42,0.1)', boxShadow: '0 4px 20px rgba(13,31,21,0.06)' }}>
                <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(26,58,42,0.08)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[2px]" style={{ color: 'rgba(13,31,21,0.35)' }}>Account</p>
                </div>
                <div className="divide-y" style={{ borderColor: 'rgba(26,58,42,0.06)' }}>
                  <button
                    onClick={() => router.push('/recupera-password')}
                    className="info-row w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors">
                    <span className="text-base w-6 text-center">🔑</span>
                    <span className="flex-1 text-sm" style={{ color: '#0d1f15' }}>Cambia password</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'rgba(13,31,21,0.25)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors"
                    style={{ color: '#c0392b' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(192,57,43,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <span className="text-base w-6 text-center">🚪</span>
                    <span className="flex-1 text-sm font-medium">Esci dall'account</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <p className="fade-up delay-3 text-center text-[11px] pb-4" style={{ color: 'rgba(13,31,21,0.2)' }}>
                © 2025 Campo Sportivo Panoramica · Messina
              </p>

            </div>
          )}
        </div>
      </div>
    </>
  )
}


'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function getTimeLeft(expiresAt) {
  const diff = new Date(expiresAt) - new Date()
  if (diff <= 0) return null
  const h = Math.floor(diff / 1000 / 3600)
  const m = Math.floor((diff / 1000 % 3600) / 60)
  const s = Math.floor(diff / 1000 % 60)
  return { h, m, s, diff }
}

// Fix 1: onExpired rimuove il post dalla lista senza ricaricare
function Countdown({ expiresAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(expiresAt))

  useEffect(() => {
    const interval = setInterval(() => {
      const t = getTimeLeft(expiresAt)
      setTimeLeft(t)
      if (!t) {
        clearInterval(interval)
        onExpired?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (!timeLeft) return (
    <span className="flex items-center gap-1 text-xs font-bold text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      Scaduto
    </span>
  )

  const urgente = timeLeft.diff < 60 * 60 * 1000
  const color = urgente ? 'text-red-500' : timeLeft.diff < 2 * 60 * 60 * 1000 ? 'text-amber-500' : 'text-gray-400'

  return (
    <span className={`flex items-center gap-1.5 text-xs font-bold ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${urgente ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
      {String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}:{String(timeLeft.s).padStart(2,'0')}
    </span>
  )
}

export default function RicercaGiocatori() {
  const router = useRouter()

  const [profilo, setProfilo]                     = useState(null)
  const [userId, setUserId]                       = useState(null)
  const [posts, setPosts]                         = useState([])
  const [loading, setLoading]                     = useState(true)   // Fix 4: loading state
  const [mostraModale, setMostraModale]           = useState(false)
  const [conferma, setConferma]                   = useState(false)
  const [erroreForm, setErroreForm]               = useState('')     // Fix 2: errore form senza alert()
  const [numGiocatori, setNumGiocatori]           = useState(null)
  const [sport, setSport]                         = useState(null)
  const [orario, setOrario]                       = useState('')
  const [dataPartita, setDataPartita]             = useState('')
  const [confermaElimina, setConfermaElimina]     = useState(null)

  useEffect(() => {
    // Fix 3: controlla autenticazione, reindirizza se non loggato
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/login'); return }
      setUserId(session.user.id)
      const { data } = await supabase.from('profili').select('*').eq('id', session.user.id).single()
      setProfilo(data)
      await caricaPosts()
      setLoading(false)
    }
    init()
  }, [])

  const caricaPosts = async () => {
    const now = new Date().toISOString()
    await supabase.from('posts').delete().lt('expires_at', now)
    const { data, error } = await supabase
      .from('posts')
      .select(`*, profili ( nome_completo, avatar_url ), partecipanti ( id, utente_id, profili ( nome_completo, avatar_url ) )`)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
    if (error) { console.log(error); return }
    setPosts(data ?? [])
  }

  const pubblicaPost = async () => {
    // Fix 2: validazione con errore inline, no alert()
    if (!numGiocatori || !sport || !orario || !dataPartita) {
      setErroreForm('Compila tutti i campi prima di pubblicare.')
      return
    }
    setErroreForm('')
    const { data: { session } } = await supabase.auth.getSession()
    const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from('posts').insert({
      utente_id: session?.user?.id, numero_giocatori: numGiocatori, sport, orario,
      data_partita: dataPartita, expires_at: expiresAt,
    })
    if (error) { console.log(error); return }
    setNumGiocatori(null); setSport(null); setOrario(''); setDataPartita('')
    setMostraModale(false); setConferma(true)
    setTimeout(() => setConferma(false), 3000)
    await caricaPosts()
  }

  const eliminaPost = async (id) => {
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) { console.log(error); return }
    setConfermaElimina(null)
    // Fix 5: aggiorna lo state localmente invece di ricaricare tutto
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  // Fix 5: aggiorna i partecipanti localmente, senza ricaricare tutto dal DB
  const toggleCiSono = async (post) => {
    const giaPartecipo = post.partecipanti?.some(p => p.utente_id === userId)

    if (giaPartecipo) {
      const mioRecord = post.partecipanti.find(p => p.utente_id === userId)
      const { error } = await supabase.from('partecipanti').delete().eq('id', mioRecord.id)
      if (error) { console.log(error); return }
      setPosts(prev => prev.map(p =>
        p.id !== post.id ? p : { ...p, partecipanti: p.partecipanti.filter(pt => pt.utente_id !== userId) }
      ))
    } else {
      const { data, error } = await supabase
        .from('partecipanti')
        .insert({ post_id: post.id, utente_id: userId })
        .select('id, utente_id, profili ( nome_completo, avatar_url )')
        .single()
      if (error) { console.log(error); return }
      setPosts(prev => prev.map(p =>
        p.id !== post.id ? p : { ...p, partecipanti: [...p.partecipanti, data] }
      ))
    }
  }

  const formatData = (dateStr) => new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

  const Avatar = ({ profilo, size = 'md' }) => {
    const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-11 h-11 text-base'
    const initiale = profilo?.nome_completo?.charAt(0).toUpperCase() ?? '?'
    if (profilo?.avatar_url) {
      return <img src={profilo.avatar_url} alt="" className={`${sizeClass} rounded-full object-cover ring-2 ring-white flex-shrink-0`} />
    }
    return (
      <div className={`${sizeClass} rounded-full bg-green-500 flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-white`}>
        {initiale}
      </div>
    )
  }

  const sportEmoji = { 'Calcio': '⚽', 'Padel': '🎾', 'Basket': '🏀', 'Volley': '🏐' }
  const orariDisponibili = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']

  // Fix 4: schermata di caricamento
  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap'); .bebas { font-family: 'Bebas Neue', sans-serif; }`}</style>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="bebas text-xl tracking-widest text-gray-400">CARICAMENTO...</p>
      </div>
    </>
  )

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap'); .bebas { font-family: 'Bebas Neue', sans-serif; }`}</style>

      <div className="min-h-screen bg-gray-50">

        {/* ── HEADER ── */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
          <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center text-lg shadow-sm">⚽</div>
              <span className="bebas text-xl tracking-widest text-gray-800">CAMPO+</span>
              <span className="bg-green-50 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full border border-green-100">Community</span>
            </div>
            <div className="flex items-center gap-2">
              {profilo && <span className="text-sm text-gray-400 hidden sm:block">Ciao, <strong className="text-gray-600">{profilo.nome_completo?.split(' ')[0]}</strong></span>}
              <button onClick={() => router.push('/dashboard')} className="text-sm font-semibold text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">← Dashboard</button>
              <button onClick={() => { setMostraModale(true); setErroreForm('') }} className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-5 py-2 rounded-xl transition-all shadow-sm">
                + Cerca Giocatori
              </button>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="bg-gradient-to-br from-green-500 to-green-600 text-white py-12 px-5 text-center">
          <p className="text-green-200 text-xs font-bold tracking-widest uppercase mb-2">⚡ Community sportiva</p>
          <h1 className="bebas text-5xl tracking-widest mb-2">Trova Giocatori</h1>
          <p className="text-green-100 text-sm max-w-sm mx-auto">Pubblica la tua partita e trova chi manca nella tua zona.</p>
          <div className="inline-flex items-center gap-2 mt-5 bg-white/10 backdrop-blur px-5 py-2 rounded-full text-sm text-green-100">
            <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            <strong className="text-white">{posts.length}</strong> partite attive
          </div>
        </section>

        {/* ── FEED ── */}
        <main className="max-w-3xl mx-auto px-5 py-8 space-y-4">

          {posts.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-4">📭</div>
              <p className="font-semibold text-gray-400 text-lg">Nessuna partita ancora</p>
              <p className="text-gray-400 text-sm mt-1">Sii il primo a cercare giocatori!</p>
            </div>
          ) : (
            posts.map(p => {
              const partecipanti    = p.partecipanti ?? []
              const giaPartecipo    = partecipanti.some(pt => pt.utente_id === userId)
              const numPartecipanti = partecipanti.length
              const completo        = numPartecipanti >= p.numero_giocatori
              const eMioPost        = userId === p.utente_id
              const progresso       = Math.min((numPartecipanti / p.numero_giocatori) * 100, 100)
              const emoji           = sportEmoji[p.sport] ?? '🏃'

              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">

                  <div className={`h-1 w-full ${completo ? 'bg-red-400' : 'bg-green-500'}`} />

                  {/* Header utente */}
                  <div className="flex items-center justify-between px-5 pt-4 pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar profilo={p.profili} size="md" />
                      <div>
                        <p className="font-bold text-gray-800 text-sm leading-tight">{p.profili?.nome_completo ?? 'Utente'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatData(p.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {completo && <span className="bg-red-50 text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-100">Completo</span>}
                      {eMioPost && (
                        <button onClick={() => setConfermaElimina(p.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-all text-sm border border-red-100">
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Corpo partita */}
                  <div className="mx-5 bg-green-50 border border-green-100 rounded-xl px-4 py-3.5">
                    <p className="font-black text-gray-800 text-lg leading-snug">
                      Cerco <span className="text-green-600">{p.numero_giocatori} giocatori</span> per {emoji} <span className="text-green-600">{p.sport}</span>
                    </p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <span className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-xs shadow-sm border border-green-100">📅</span>
                        {p.data_partita}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <span className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-xs shadow-sm border border-green-100">🕐</span>
                        {p.orario?.slice(0, 5)}
                      </span>
                    </div>
                    {/* Fix 1: onExpired rimuove il post dalla lista istantaneamente */}
                    {p.expires_at && (
                      <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-green-100">
                        <span className="text-xs text-gray-400 font-medium">Eliminazione in:</span>
                        <Countdown
                          expiresAt={p.expires_at}
                          onExpired={() => setPosts(prev => prev.filter(x => x.id !== p.id))}
                        />
                      </div>
                    )}
                  </div>

                  {/* Barra progresso */}
                  <div className="px-5 pt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-medium">
                      <span>{numPartecipanti} iscritti</span>
                      <span>{completo ? 'Al completo' : `${p.numero_giocatori - numPartecipanti} posti liberi`}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${completo ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${progresso}%` }} />
                    </div>
                  </div>

                  {/* Partecipanti */}
                  <div className="px-5 pt-3 pb-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                      Partecipanti ({numPartecipanti}/{p.numero_giocatori})
                    </p>
                    {partecipanti.length === 0 ? (
                      <p className="text-sm text-gray-300 italic">Nessuno ancora — sii il primo!</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {partecipanti.map(pt => (
                          <div key={pt.id} className="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <Avatar profilo={pt.profili} size="sm" />
                            {pt.profili?.nome_completo?.split(' ')[0]}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Azione */}
                  {!eMioPost && (
                    <div className="px-5 py-4">
                      <button
                        onClick={() => toggleCiSono(p)}
                        disabled={completo && !giaPartecipo}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                          giaPartecipo
                            ? 'bg-red-50 border border-red-200 text-red-500 hover:bg-red-100'
                            : completo
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
                        }`}
                      >
                        {giaPartecipo ? '✕ Ritirati' : completo ? 'Partita al completo' : '✋ Ci sono!'}
                      </button>
                    </div>
                  )}

                </div>
              )
            })
          )}
        </main>

        {/* ── MODALE NUOVA PARTITA ── */}
        {mostraModale && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setMostraModale(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

              <div className="bg-green-500 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="bebas text-white text-3xl tracking-widest">Nuova Partita</h2>
                  <p className="text-green-100 text-xs mt-0.5">Compila i dettagli della tua partita</p>
                </div>
                <button onClick={() => setMostraModale(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold flex items-center justify-center transition-all">✕</button>
              </div>

              <div className="p-6 space-y-5">

                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Quanti giocatori cerchi?</p>
                  <div className="flex flex-wrap gap-2">
                    {[2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setNumGiocatori(n)}
                        className={`w-11 h-11 rounded-xl font-black text-sm transition-all ${numGiocatori === n ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Che sport?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: '⚽ Calcio', value: 'Calcio' }, { label: '🎾 Padel', value: 'Padel' }, { label: '🏀 Basket', value: 'Basket' }, { label: '🏐 Volley', value: 'Volley' }].map(s => (
                      <button key={s.value} onClick={() => setSport(s.value)}
                        className={`py-3 rounded-xl font-bold text-sm transition-all border ${sport === s.value ? 'bg-green-500 text-white border-green-500 shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-600'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Che giorno?</p>
                  <input type="date" value={dataPartita} onChange={e => setDataPartita(e.target.value)} min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all" />
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">A che orario?</p>
                  <select value={orario} onChange={e => setOrario(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all">
                    <option value="">Seleziona orario...</option>
                    {orariDisponibili.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                {/* Fix 2: errore inline al posto dell'alert() */}
                {erroreForm && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-500 text-sm font-semibold px-4 py-3 rounded-xl">
                    ⚠️ {erroreForm}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setMostraModale(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold text-sm hover:bg-gray-200 transition-all">
                    Annulla
                  </button>
                  <button onClick={pubblicaPost} disabled={!numGiocatori || !sport || !orario || !dataPartita}
                    className="flex-[2] py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    ✓ Pubblica Partita
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ── POPUP CONFERMA ELIMINA ── */}
        {confermaElimina && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setConfermaElimina(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-red-500 px-6 py-5 text-center">
                <div className="text-4xl mb-1">🗑️</div>
                <h2 className="bebas text-white text-2xl tracking-widest">Elimina Post</h2>
              </div>
              <div className="px-6 py-5 text-center">
                <p className="text-gray-600 text-sm leading-relaxed">
                  Sei sicuro di voler eliminare questo post?<br />
                  <span className="text-gray-400">L'operazione non può essere annullata.</span>
                </p>
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button onClick={() => setConfermaElimina(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold text-sm hover:bg-gray-200 transition-all">
                  Annulla
                </button>
                <button onClick={() => eliminaPost(confermaElimina)} className="flex-[2] py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-sm">
                  Sì, elimina
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOAST ── */}
        {conferma && (
          <div className="fixed bottom-6 right-6 bg-green-500 text-white font-bold px-6 py-4 rounded-2xl shadow-lg z-50 flex items-center gap-2">
            ✅ Partita pubblicata con successo!
          </div>
        )}

      </div>
    </>
  )
}



'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-1">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-3xl font-black ${color}`}>{value}</span>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProprietarioPage() {
  const router = useRouter()

  const [user, setUser]                 = useState(null)
  const [profilo, setProfilo]           = useState(null)
  const [prenotazioni, setPrenotazioni] = useState([])
  const [utenti, setUtenti]             = useState([])
  const [bloccatiSet, setBloccatiSet]   = useState(new Set())
  const [loading, setLoading]           = useState(true)
  const [sezione, setSezione]           = useState('prenotazioni')
  const [filtroData, setFiltroData]     = useState('')
  const [filtroNome, setFiltroNome]     = useState('')
  const [paginaUtenti, setPaginaUtenti] = useState(1)
  const [hasNextPage, setHasNextPage]   = useState(true)
  // Fix 2: stati per popup custom al posto di confirm/alert
  const [popupBlocco, setPopupBlocco]               = useState(null)  // utente da bloccare/sbloccare
  const [popupEliminaPrenotazione, setPopupEliminaPrenotazione] = useState(null) // id prenotazione da eliminare
  const [erroreEliminazione, setErroreEliminazione] = useState('')

  const elementiPerPagina = 20

  // ─── Auth & Init ─────────────────────────────────────────────────────────────

  // Un solo useEffect all'avvio — la paginazione viene gestita
  // direttamente dai pulsanti chiamando caricaUtenti con i valori giusti
  useEffect(() => {
    checkProprietario()
  }, [])

  const checkProprietario = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const authUser = session?.user ?? (await supabase.auth.getUser()).data.user
    if (!authUser) { router.push('/login'); return }

    setUser(authUser)

    const { data: profiloData, error } = await supabase
      .from('profili')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error || !profiloData) { router.push('/login'); return }
    if (profiloData.ruolo !== 'proprietario') { router.push('/dashboard'); return }

    setProfilo(profiloData)

    // Fix 1: passa authUser.id direttamente, non aspetta che user state sia aggiornato
    await Promise.all([caricaPrenotazioni(), caricaUtenti(authUser.id, 1)])
    setLoading(false)
  }

  // ─── Data Fetching ────────────────────────────────────────────────────────────

  const caricaPrenotazioni = async () => {
    const { data, error } = await supabase
      .from('prenotazioni')
      .select(`
        *,
        profili ( id, nome_completo, telefono ),
        campi   ( nome, sport, struttura )
      `)
      .order('data', { ascending: false })

    if (!error) setPrenotazioni(data ?? [])
  }

  // Fix 1: ownerId e paginaCorrente sempre passati esplicitamente, mai da state
  const caricaUtenti = async (ownerId, paginaCorrente) => {
    if (!ownerId) return
    const start = (paginaCorrente - 1) * elementiPerPagina
    const end   = paginaCorrente * elementiPerPagina - 1

    const [{ data: utentiData }, { data: bloccatiData, error: bloccatiError }] = await Promise.all([
      supabase
        .from('profili')
        .select('*')
        .eq('ruolo', 'cliente')
        .order('nome_completo')
        .range(start, end),
      supabase
        .from('utenti_bloccati')
        .select('utente_id')
        .eq('proprietario_id', ownerId),
    ])
    
    console.log('bloccatiData:', bloccatiData)
    console.log('bloccatiError:', bloccatiError)
    if (utentiData)   setUtenti(utentiData)
    if (bloccatiData) setBloccatiSet(new Set(bloccatiData.map(b => b.utente_id)))
    setHasNextPage(utentiData?.length === elementiPerPagina)
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  // Fix 2: niente confirm(), apre popup custom
  const handleBloccoUtente = async (utente) => {
    setPopupBlocco(utente)
  }

  const confermaBlocco = async () => {
    const utente = popupBlocco
    setPopupBlocco(null)
    const bloccato = bloccatiSet.has(utente.id)

    if (bloccato) {
      const { error } = await supabase
        .from('utenti_bloccati')
        .delete()
        .eq('proprietario_id', user.id)
        .eq('utente_id', utente.id)

      if (!error) {
        setBloccatiSet(prev => {
          const next = new Set(prev)
          next.delete(utente.id)
          return next
        })
      }
    } else {
      const { error } = await supabase
        .from('utenti_bloccati')
        .insert({ proprietario_id: user.id, utente_id: utente.id })

      if (!error) {
        setBloccatiSet(prev => new Set([...prev, utente.id]))
      }
    }
  }

  // Fix 2: niente confirm()/alert(), apre popup custom
  const handleEliminaPrenotazione = async (id) => {
    setPopupEliminaPrenotazione(id)
    setErroreEliminazione('')
  }

  const confermaEliminaPrenotazione = async () => {
    const id = popupEliminaPrenotazione
    const { error } = await supabase.from('prenotazioni').delete().eq('id', id)

    if (error) {
      setErroreEliminazione("Errore durante l'eliminazione. Riprova.")
      return
    }

    setPopupEliminaPrenotazione(null)
    setErroreEliminazione('')
    await caricaPrenotazioni()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ─── Derived Data ─────────────────────────────────────────────────────────────

  const oggi = new Date().toISOString().split('T')[0]

  const prenotazioniFiltrate = prenotazioni.filter(p => {
    const matchData = filtroData ? p.data === filtroData : true
    const matchNome = filtroNome
      ? p.profili?.nome_completo?.toLowerCase().includes(filtroNome.toLowerCase())
      : true
    return matchData && matchNome
  })

  const stats = [
    { label: '📅 Prenotazioni totali', value: prenotazioni.length,                             color: 'text-green-600' },
    { label: '⚡ Oggi',                value: prenotazioni.filter(p => p.data === oggi).length, color: 'text-blue-600'  },
    { label: '👥 Utenti',              value: utenti.length,                                   color: 'text-amber-600' },
    { label: '🚫 Bloccati',            value: bloccatiSet.size,                                color: 'text-red-500'   },
  ]

  // ─── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <span className="text-5xl">🏟️</span>
        <p className="text-slate-500 font-semibold tracking-wide">Caricamento Pannello...</p>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap'); .bebas { font-family: 'Bebas Neue', sans-serif; }`}</style>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏟️</span>
          <span className="bebas text-xl tracking-widest text-slate-800">CAMPO+</span>
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">⭐ Proprietario</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:block">
            Ciao, <strong>{profilo?.nome_completo?.split(' ')[0]}</strong>
          </span>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-green-50 border border-green-200 text-green-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-100 transition-all"
          >
            ← Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="bg-slate-100 text-slate-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-slate-200 transition-all"
          >
            Esci
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 text-white px-6 py-12 text-center">
        <div className="text-5xl mb-3">🏟️</div>
        <h1 className="bebas text-4xl tracking-widest mb-1">Pannello di Gestione</h1>
        <p className="text-amber-400 bebas text-2xl tracking-widest mb-2">
          CIAO, {profilo?.nome_completo?.split(' ')[0]?.toUpperCase()}!
        </p>
        <p className="text-slate-300 text-sm max-w-md mx-auto">
          Gestisci prenotazioni, utenti e strutture dalla tua area riservata.
        </p>
      </section>

      {/* ── Stats ── */}
      <section className="max-w-5xl mx-auto px-6 -mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <StatCard key={i} label={s.label} value={s.value} color={s.color} />
        ))}
      </section>

      {/* ── Main Content ── */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Tabs */}
        <div className="flex gap-2">
          {['prenotazioni', 'utenti'].map(tab => (
            <button
              key={tab}
              onClick={() => setSezione(tab)}
              className={`bebas text-lg tracking-widest px-7 py-2.5 rounded-xl transition-all border-none cursor-pointer ${
                sezione === tab
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md'
                  : 'bg-transparent text-slate-400 hover:text-amber-600 hover:bg-amber-50'
              }`}
            >
              {tab === 'prenotazioni' ? '📅 Prenotazioni' : '👥 Utenti'}
            </button>
          ))}
        </div>

        {/* ── Sezione Prenotazioni ── */}
        {sezione === 'prenotazioni' && (
          <div className="space-y-4">

            {/* Filtri */}
            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="text"
                placeholder="🔍 Cerca per nome..."
                value={filtroNome}
                onChange={e => setFiltroNome(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 min-w-52 transition-all"
              />
              <input
                type="date"
                value={filtroData}
                onChange={e => setFiltroData(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              />
              {(filtroNome || filtroData) && (
                <button
                  onClick={() => { setFiltroNome(''); setFiltroData('') }}
                  className="bg-red-50 border border-red-200 text-red-500 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-red-100 transition-all"
                >
                  ✕ Reset
                </button>
              )}
              <span className="text-sm text-slate-400 ml-auto">{prenotazioniFiltrate.length} risultati</span>
            </div>

            {/* Tabella */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1fr_auto] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>Utente</span>
                <span>Campo</span>
                <span>Data</span>
                <span>Orario</span>
                <span>Prezzo</span>
                <span>Azioni</span>
              </div>

              {prenotazioniFiltrate.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <span className="text-5xl mb-2">📅</span>
                  <p className="font-semibold">Nessuna prenotazione trovata.</p>
                </div>
              ) : (
                prenotazioniFiltrate.map(p => (
                  <div key={p.id} className="border-b border-slate-50 last:border-0">

                    {/* Riga desktop */}
                    <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{p.profili?.nome_completo || '—'}</p>
                        <p className="text-xs text-slate-400">{p.profili?.telefono}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-700">{p.campi?.nome}</p>
                        <p className="text-xs text-slate-400">{p.campi?.struttura}</p>
                      </div>
                      <span className="text-sm text-slate-600">{p.data}</span>
                      <span className="text-sm text-slate-600">{p.ora_inizio} → {p.ora_fine}</span>
                      <span className="text-sm font-bold text-green-600">€{p.prezzo_totale}</span>
                      <button
                        onClick={() => handleEliminaPrenotazione(p.id)}
                        className="bg-red-50 border border-red-200 text-red-500 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-100 hover:border-red-400 transition-all cursor-pointer whitespace-nowrap"
                      >
                        🗑️ Elimina
                      </button>
                    </div>

                    {/* Card mobile */}
                    <div className="md:hidden p-4 space-y-3">
                      <p className="font-bold text-slate-800">{p.profili?.nome_completo}</p>
                      <div className="space-y-1">
                        {[
                          ['Campo',     p.campi?.nome],
                          ['Struttura', p.campi?.struttura],
                          ['Data',      p.data],
                          ['Orario',    `${p.ora_inizio} → ${p.ora_fine}`],
                          ['Prezzo',    `€${p.prezzo_totale}`],
                        ].map(([label, val]) => (
                          <InfoRow key={label} label={label} value={val} />
                        ))}
                      </div>
                      <button
                        onClick={() => handleEliminaPrenotazione(p.id)}
                        className="w-full bg-red-50 border border-red-200 text-red-500 text-sm font-bold py-2 rounded-xl hover:bg-red-100 transition-all cursor-pointer"
                      >
                        🗑️ Elimina
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Sezione Utenti ── */}
        {sezione === 'utenti' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

            <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Nome</span>
              <span>Telefono</span>
              <span>Stato</span>
              <span>Azioni</span>
            </div>

            {utenti.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                <span className="text-5xl mb-2">👥</span>
                <p className="font-semibold">Nessun utente trovato.</p>
              </div>
            ) : (
              utenti.map(u => {
                const bloccato = bloccatiSet.has(u.id)
                return (
                  <div key={u.id} className="border-b border-slate-50 last:border-0">

                    {/* Riga desktop */}
                    <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{u.nome_completo}</p>
                        <p className="text-xs text-slate-400">
                          {prenotazioni.filter(p => p.utente_id === u.id).length} prenotazioni
                        </p>
                      </div>
                      <span className="text-sm text-slate-600">{u.telefono || '—'}</span>
                      <span className={`text-sm font-semibold ${bloccato ? 'text-red-500' : 'text-green-600'}`}>
                        {bloccato ? '🚫 Bloccato' : '✅ Attivo'}
                      </span>
                      <button
                        onClick={() => handleBloccoUtente(u)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                          bloccato
                            ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100 hover:border-green-400'
                            : 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-400'
                        }`}
                      >
                        {bloccato ? '✅ Sblocca' : '🚫 Blocca'}
                      </button>
                    </div>

                    {/* Card mobile */}
                    <div className="md:hidden p-4 space-y-3">
                      <p className="font-bold text-slate-800">{u.nome_completo}</p>
                      <div className="space-y-1">
                        {[
                          ['Email',        u.email],
                          ['Telefono',     u.telefono || '—'],
                          ['Prenotazioni', prenotazioni.filter(p => p.utente_id === u.id).length],
                        ].map(([label, val]) => (
                          <InfoRow key={label} label={label} value={val} />
                        ))}
                        <InfoRow
                          label="Stato"
                          value={
                            <span className={bloccato ? 'text-red-500 font-semibold' : 'text-green-600 font-semibold'}>
                              {bloccato ? '🚫 Bloccato' : '✅ Attivo'}
                            </span>
                          }
                        />
                      </div>
                      <button
                        onClick={() => handleBloccoUtente(u)}
                        className={`w-full text-sm font-bold py-2 rounded-xl border transition-all cursor-pointer ${
                          bloccato
                            ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                            : 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                        }`}
                      >
                        {bloccato ? '✅ Sblocca' : '🚫 Blocca'}
                      </button>
                    </div>

                  </div>
                )
              })
            )}

            {/* Paginazione */}
            <div className="flex justify-between p-4 border-t border-slate-100">
              <button
                onClick={() => {
                  const nuovaPagina = paginaUtenti - 1
                  setPaginaUtenti(nuovaPagina)
                  caricaUtenti(user.id, nuovaPagina)
                }}
                disabled={paginaUtenti === 1}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${paginaUtenti === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
              >
                ← Precedente
              </button>
              <span className="text-sm text-slate-400 self-center">Pagina {paginaUtenti}</span>
              <button
                onClick={() => {
                  const nuovaPagina = paginaUtenti + 1
                  setPaginaUtenti(nuovaPagina)
                  caricaUtenti(user.id, nuovaPagina)
                }}
                disabled={!hasNextPage}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!hasNextPage ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
              >
                Successivo →
              </button>
            </div>

          </div>
        )}
      </main>

      {/* ── POPUP BLOCCO/SBLOCCO UTENTE ── */}
      {popupBlocco && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setPopupBlocco(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`px-6 py-5 text-center ${bloccatiSet.has(popupBlocco.id) ? 'bg-green-500' : 'bg-red-500'}`}>
              <div className="text-4xl mb-1">{bloccatiSet.has(popupBlocco.id) ? '✅' : '🚫'}</div>
              <h2 className="text-white font-black text-xl">
                {bloccatiSet.has(popupBlocco.id) ? 'Sblocca utente' : 'Blocca utente'}
              </h2>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-slate-700 font-semibold">{popupBlocco.nome_completo}</p>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                {bloccatiSet.has(popupBlocco.id)
                  ? "L'utente potrà di nuovo prenotare i tuoi campi."
                  : "L'utente non potrà più prenotare i tuoi campi."}
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setPopupBlocco(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold text-sm hover:bg-gray-200 transition-all">
                Annulla
              </button>
              <button
                onClick={confermaBlocco}
                className={`flex-[2] py-3 rounded-xl text-white font-bold text-sm transition-all shadow-sm ${bloccatiSet.has(popupBlocco.id) ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
              >
                {bloccatiSet.has(popupBlocco.id) ? '✅ Sì, sblocca' : '🚫 Sì, blocca'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── POPUP ELIMINA PRENOTAZIONE ── */}
      {popupEliminaPrenotazione && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => { setPopupEliminaPrenotazione(null); setErroreEliminazione('') }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-red-500 px-6 py-5 text-center">
              <div className="text-4xl mb-1">🗑️</div>
              <h2 className="text-white font-black text-xl">Elimina Prenotazione</h2>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-slate-600 text-sm leading-relaxed">
                Sei sicuro di voler eliminare questa prenotazione?<br />
                <span className="text-slate-400">L'operazione non può essere annullata.</span>
              </p>
              {erroreEliminazione && (
                <p className="mt-3 text-red-500 text-sm font-semibold bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                  ⚠️ {erroreEliminazione}
                </p>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setPopupEliminaPrenotazione(null); setErroreEliminazione('') }} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold text-sm hover:bg-gray-200 transition-all">
                Annulla
              </button>
              <button onClick={confermaEliminaPrenotazione} className="flex-[2] py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all shadow-sm">
                Sì, elimina
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

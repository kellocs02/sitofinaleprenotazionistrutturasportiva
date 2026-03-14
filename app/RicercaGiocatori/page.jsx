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

function Countdown({ expiresAt, onExpired }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(expiresAt))
  useEffect(() => {
    const interval = setInterval(() => {
      const t = getTimeLeft(expiresAt)
      setTimeLeft(t)
      if (!t) { clearInterval(interval); onExpired?.() }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (!timeLeft) return (
    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#ef4444' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'#ef4444', animation:'pulse 1s infinite' }} />
      Scaduto
    </span>
  )
  const urgente = timeLeft.diff < 60 * 60 * 1000
  const color = urgente ? '#ef4444' : timeLeft.diff < 2 * 60 * 60 * 1000 ? '#f59e0b' : '#6b7c74'
  return (
    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background: urgente ? '#ef4444' : '#f59e0b', animation: urgente ? 'pulse 1s infinite' : 'none' }} />
      {String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}:{String(timeLeft.s).padStart(2,'0')}
    </span>
  )
}

export default function RicercaGiocatori() {
  const router = useRouter()
  const [profilo, setProfilo] = useState(null)
  const [userId, setUserId] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostraModale, setMostraModale] = useState(false)
  const [conferma, setConferma] = useState(false)
  const [erroreForm, setErroreForm] = useState('')
  const [numGiocatori, setNumGiocatori] = useState(null)
  const [sport, setSport] = useState(null)
  const [orario, setOrario] = useState('')
  const [dataPartita, setDataPartita] = useState('')
  const [confermaElimina, setConfermaElimina] = useState(null)

  useEffect(() => {
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
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  const toggleCiSono = async (post) => {
    const giaPartecipo = post.partecipanti?.some(p => p.utente_id === userId)
    if (giaPartecipo) {
      const mioRecord = post.partecipanti.find(p => p.utente_id === userId)
      const { error } = await supabase.from('partecipanti').delete().eq('id', mioRecord.id)
      if (error) { console.log(error); return }
      setPosts(prev => prev.map(p => p.id !== post.id ? p : { ...p, partecipanti: p.partecipanti.filter(pt => pt.utente_id !== userId) }))
    } else {
      const { data, error } = await supabase.from('partecipanti').insert({ post_id: post.id, utente_id: userId }).select('id, utente_id, profili ( nome_completo, avatar_url )').single()
      if (error) { console.log(error); return }
      setPosts(prev => prev.map(p => p.id !== post.id ? p : { ...p, partecipanti: [...p.partecipanti, data] }))
    }
  }

  const formatData = (dateStr) => new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  const AvatarComp = ({ profilo, size = 'md' }) => {
    const sz = size === 'sm' ? 28 : 42
    if (profilo?.avatar_url) return <img src={profilo.avatar_url} alt="" style={{ width:sz, height:sz, borderRadius:'50%', objectFit:'cover', border:'2px solid #fff', flexShrink:0 }} />
    return (
      <div style={{ width:sz, height:sz, borderRadius:'50%', background:'#0a1f13', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:"'Bebas Neue', sans-serif", fontSize: size === 'sm' ? 11 : 15, color:'#fff', letterSpacing:1 }}>
        {getInitials(profilo?.nome_completo)}
      </div>
    )
  }

  const sportEmoji = { 'Calcio': '⚽', 'Padel': '🎾', 'Basket': '🏀', 'Volley': '🏐' }
  const orariDisponibili = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ minHeight:'100vh', background:'#f7f8f6', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
        <div style={{ width:36, height:36, border:'3px solid #0a1f13', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <p style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, letterSpacing:4, color:'#6b7c74' }}>CARICAMENTO...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn { from { transform:scale(0.92); opacity:0; } to { transform:scale(1); opacity:1; } }
      `}</style>

      <div style={{ minHeight:'100vh', background:'#f7f8f6' }}>

        {/* ── HEADER ── */}
        <header style={{ background:'#fff', borderBottom:'1px solid #e0e8e3', position:'sticky', top:0, zIndex:50 }}>
          <div style={{ maxWidth:720, margin:'0 auto', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, background:'#0a1f13', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7.5" stroke="#fff" strokeWidth="1.5"/>
                  <path d="M9 3.5 L10.8 7.5 L9 14.5 L7.2 7.5 Z" fill="#fff" opacity="0.9"/>
                  <circle cx="9" cy="9" r="1.8" fill="#fff"/>
                </svg>
              </div>
              <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, letterSpacing:3, color:'#0a1f13' }}>CAMPO+</span>
              <span style={{ background:'#eef3f0', color:'#2d6e45', fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, letterSpacing:1, border:'1px solid #c8e0d0' }}>COMMUNITY</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {profilo && <span style={{ fontSize:13, color:'#6b7c74' }}>Ciao, <strong style={{ color:'#0a1f13' }}>{profilo.nome_completo?.split(' ')[0]}</strong></span>}
              <button onClick={() => router.push('/dashboard')}
                style={{ fontSize:12, fontWeight:600, color:'#6b7c74', padding:'7px 14px', borderRadius:9, background:'#f7f8f6', border:'1px solid #e0e8e3', cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color='#0a1f13'}
                onMouseLeave={e => e.currentTarget.style.color='#6b7c74'}>
                ← Dashboard
              </button>
              <button onClick={() => { setMostraModale(true); setErroreForm('') }}
                style={{ fontSize:12, fontWeight:700, color:'#fff', padding:'7px 16px', borderRadius:9, background:'#0a1f13', border:'none', cursor:'pointer', transition:'all 0.15s', letterSpacing:0.5 }}
                onMouseEnter={e => e.currentTarget.style.background='#2d6e45'}
                onMouseLeave={e => e.currentTarget.style.background='#0a1f13'}>
                + Cerca Giocatori
              </button>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section style={{ background:'#0a1f13', padding:'44px 24px 40px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(90deg,transparent,transparent 80px,rgba(255,255,255,0.02) 80px,rgba(255,255,255,0.02) 81px),repeating-linear-gradient(0deg,transparent,transparent 80px,rgba(255,255,255,0.02) 80px,rgba(255,255,255,0.02) 81px)' }} />
          <div style={{ position:'relative', zIndex:1, maxWidth:480, margin:'0 auto' }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:3, textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:8 }}>⚡ Community sportiva</p>
            <h1 style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'clamp(40px,8vw,64px)', letterSpacing:4, color:'#fff', lineHeight:1, marginBottom:10 }}>Trova Giocatori</h1>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', fontWeight:400, lineHeight:1.6 }}>Pubblica la tua partita e trova chi manca nella tua zona.</p>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:20, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', padding:'8px 18px', borderRadius:30, fontSize:13, color:'rgba(255,255,255,0.6)' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#4caf72', animation:'pulse 1.5s infinite' }} />
              <strong style={{ color:'#fff' }}>{posts.length}</strong> partite attive
            </div>
          </div>
        </section>

        {/* ── FEED ── */}
        <main style={{ maxWidth:720, margin:'0 auto', padding:'32px 24px 60px' }}>

          {posts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'80px 0' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>📭</div>
              <p style={{ fontWeight:700, color:'#0a1f13', fontSize:16 }}>Nessuna partita ancora</p>
              <p style={{ color:'#6b7c74', fontSize:13, marginTop:4 }}>Sii il primo a cercare giocatori!</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {posts.map(p => {
                const partecipanti = p.partecipanti ?? []
                const giaPartecipo = partecipanti.some(pt => pt.utente_id === userId)
                const numPartecipanti = partecipanti.length
                const completo = numPartecipanti >= p.numero_giocatori
                const eMioPost = userId === p.utente_id
                const progresso = Math.min((numPartecipanti / p.numero_giocatori) * 100, 100)
                const emoji = sportEmoji[p.sport] ?? '🏃'

                return (
                  <div key={p.id} style={{ background:'#fff', borderRadius:18, border:'1px solid #e0e8e3', overflow:'hidden', transition:'all 0.2s', animation:'slideUp 0.3s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#0a1f13'; e.currentTarget.style.boxShadow='0 6px 24px rgba(10,31,19,0.07)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#e0e8e3'; e.currentTarget.style.boxShadow='none'; }}>

                    {/* Accent bar */}
                    <div style={{ height:3, background: completo ? '#ef4444' : '#0a1f13' }} />

                    {/* User row */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <AvatarComp profilo={p.profili} size="md" />
                        <div>
                          <p style={{ fontWeight:700, color:'#0a1f13', fontSize:14, lineHeight:1.3 }}>{p.profili?.nome_completo ?? 'Utente'}</p>
                          <p style={{ fontSize:11, color:'#6b7c74', marginTop:2 }}>{formatData(p.created_at)}</p>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {completo && <span style={{ background:'#fef2f2', color:'#ef4444', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, border:'1px solid #fecaca', letterSpacing:0.5 }}>COMPLETO</span>}
                        {eMioPost && (
                          <button onClick={() => setConfermaElimina(p.id)}
                            style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', cursor:'pointer', fontSize:13, transition:'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background='#fee2e2'}
                            onMouseLeave={e => e.currentTarget.style.background='#fef2f2'}>
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Corpo partita */}
                    <div style={{ margin:'0 20px', background:'#f7f8f6', border:'1px solid #e0e8e3', borderRadius:12, padding:'14px 16px' }}>
                      <p style={{ fontWeight:800, color:'#0a1f13', fontSize:16, lineHeight:1.4 }}>
                        Cerco <span style={{ color:'#2d6e45' }}>{p.numero_giocatori} giocatori</span> per {emoji} <span style={{ color:'#2d6e45' }}>{p.sport}</span>
                      </p>
                      <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:10, flexWrap:'wrap' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#6b7c74' }}>
                          <span style={{ width:24, height:24, background:'#fff', border:'1px solid #e0e8e3', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>📅</span>
                          {p.data_partita}
                        </span>
                        <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#6b7c74' }}>
                          <span style={{ width:24, height:24, background:'#fff', border:'1px solid #e0e8e3', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>🕐</span>
                          {p.orario?.slice(0, 5)}
                        </span>
                      </div>
                      {p.expires_at && (
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, paddingTop:10, borderTop:'1px solid #e0e8e3' }}>
                          <span style={{ fontSize:11, color:'#6b7c74', fontWeight:500 }}>Eliminazione in:</span>
                          <Countdown expiresAt={p.expires_at} onExpired={() => setPosts(prev => prev.filter(x => x.id !== p.id))} />
                        </div>
                      )}
                    </div>

                    {/* Progresso */}
                    <div style={{ padding:'14px 20px 0' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#6b7c74', fontWeight:600, marginBottom:7 }}>
                        <span>{numPartecipanti} iscritti</span>
                        <span>{completo ? 'Al completo' : `${p.numero_giocatori - numPartecipanti} posti liberi`}</span>
                      </div>
                      <div style={{ height:5, background:'#e0e8e3', borderRadius:10, overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:10, background: completo ? '#ef4444' : '#0a1f13', width:`${progresso}%`, transition:'width 0.5s ease' }} />
                      </div>
                    </div>

                    {/* Partecipanti */}
                    <div style={{ padding:'12px 20px 4px' }}>
                      <p style={{ fontSize:10, fontWeight:700, color:'#6b7c74', letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>
                        Partecipanti ({numPartecipanti}/{p.numero_giocatori})
                      </p>
                      {partecipanti.length === 0 ? (
                        <p style={{ fontSize:13, color:'#c8d4ce', fontStyle:'italic' }}>Nessuno ancora — sii il primo!</p>
                      ) : (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                          {partecipanti.map(pt => (
                            <div key={pt.id} style={{ display:'flex', alignItems:'center', gap:6, background:'#eef3f0', border:'1px solid #c8e0d0', color:'#2d6e45', fontSize:12, fontWeight:600, padding:'4px 10px', borderRadius:20 }}>
                              <AvatarComp profilo={pt.profili} size="sm" />
                              {pt.profili?.nome_completo?.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Azione */}
                    {!eMioPost && (
                      <div style={{ padding:'12px 20px 18px' }}>
                        <button
                          onClick={() => toggleCiSono(p)}
                          disabled={completo && !giaPartecipo}
                          style={{
                            width:'100%', padding:'12px', borderRadius:11,
                            fontWeight:700, fontSize:13, border:'none', cursor: (completo && !giaPartecipo) ? 'not-allowed' : 'pointer',
                            transition:'all 0.18s', letterSpacing:0.3,
                            background: giaPartecipo ? '#fef2f2' : completo ? '#f7f8f6' : '#0a1f13',
                            color: giaPartecipo ? '#ef4444' : completo ? '#c8d4ce' : '#fff',
                            border: giaPartecipo ? '1px solid #fecaca' : completo ? '1px solid #e0e8e3' : 'none',
                          }}
                          onMouseEnter={e => { if (!completo || giaPartecipo) e.currentTarget.style.background = giaPartecipo ? '#fee2e2' : completo ? '#f7f8f6' : '#2d6e45' }}
                          onMouseLeave={e => { e.currentTarget.style.background = giaPartecipo ? '#fef2f2' : completo ? '#f7f8f6' : '#0a1f13' }}>
                          {giaPartecipo ? '✕ Ritirati' : completo ? 'Partita al completo' : '✋ Ci sono!'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>

        {/* ── MODALE NUOVA PARTITA ── */}
        {mostraModale && (
          <div style={{ position:'fixed', inset:0, background:'rgba(10,31,19,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16, animation:'fadeIn 0.2s ease' }}
            onClick={() => setMostraModale(false)}>
            <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:440, overflow:'hidden', animation:'popIn 0.25s ease', boxShadow:'0 20px 60px rgba(10,31,19,0.2)' }}
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div style={{ background:'#0a1f13', padding:'22px 24px', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div>
                  <h2 style={{ fontFamily:"'Bebas Neue', sans-serif", color:'#fff', fontSize:30, letterSpacing:3, lineHeight:1 }}>Nuova Partita</h2>
                  <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, marginTop:4 }}>Compila i dettagli della tua partita</p>
                </div>
                <button onClick={() => setMostraModale(false)}
                  style={{ width:32, height:32, background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, color:'rgba(255,255,255,0.7)', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>✕</button>
              </div>

              <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:20 }}>

                {/* Num giocatori */}
                <div>
                  <p style={{ fontSize:10, fontWeight:700, color:'#6b7c74', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Quanti giocatori cerchi?</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                    {[2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setNumGiocatori(n)}
                        style={{ width:42, height:42, borderRadius:10, fontWeight:700, fontSize:14, border:'1.5px solid', cursor:'pointer', transition:'all 0.15s', background: numGiocatori===n ? '#0a1f13' : '#f7f8f6', color: numGiocatori===n ? '#fff' : '#4a5e52', borderColor: numGiocatori===n ? '#0a1f13' : '#e0e8e3' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sport */}
                <div>
                  <p style={{ fontSize:10, fontWeight:700, color:'#6b7c74', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Che sport?</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {[{ label:'⚽ Calcio', value:'Calcio' },{ label:'🎾 Padel', value:'Padel' },{ label:'🏀 Basket', value:'Basket' },{ label:'🏐 Volley', value:'Volley' }].map(s => (
                      <button key={s.value} onClick={() => setSport(s.value)}
                        style={{ padding:'12px', borderRadius:11, fontWeight:700, fontSize:13, border:'1.5px solid', cursor:'pointer', transition:'all 0.15s', background: sport===s.value ? '#0a1f13' : '#f7f8f6', color: sport===s.value ? '#fff' : '#4a5e52', borderColor: sport===s.value ? '#0a1f13' : '#e0e8e3' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data */}
                <div>
                  <p style={{ fontSize:10, fontWeight:700, color:'#6b7c74', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Che giorno?</p>
                  <input type="date" value={dataPartita} onChange={e => setDataPartita(e.target.value)} min={new Date().toISOString().split('T')[0]}
                    style={{ width:'100%', background:'#f7f8f6', border:'1.5px solid #e0e8e3', borderRadius:11, padding:'12px 14px', fontSize:14, color:'#0a1f13', outline:'none', fontFamily:"'DM Sans', sans-serif", transition:'border-color 0.18s' }}
                    onFocus={e => e.target.style.borderColor='#0a1f13'}
                    onBlur={e => e.target.style.borderColor='#e0e8e3'} />
                </div>

                {/* Orario */}
                <div>
                  <p style={{ fontSize:10, fontWeight:700, color:'#6b7c74', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>A che orario?</p>
                  <select value={orario} onChange={e => setOrario(e.target.value)}
                    style={{ width:'100%', background:'#f7f8f6', border:'1.5px solid #e0e8e3', borderRadius:11, padding:'12px 14px', fontSize:14, color:'#0a1f13', outline:'none', fontFamily:"'DM Sans', sans-serif", transition:'border-color 0.18s' }}
                    onFocus={e => e.target.style.borderColor='#0a1f13'}
                    onBlur={e => e.target.style.borderColor='#e0e8e3'}>
                    <option value="">Seleziona orario...</option>
                    {orariDisponibili.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                {erroreForm && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', fontSize:13, fontWeight:600, padding:'12px 14px', borderRadius:10 }}>
                    ⚠️ {erroreForm}
                  </div>
                )}

                <div style={{ display:'flex', gap:9 }}>
                  <button onClick={() => setMostraModale(false)}
                    style={{ flex:1, padding:'13px', borderRadius:11, background:'#f7f8f6', border:'1px solid #e0e8e3', color:'#6b7c74', fontWeight:600, fontSize:13, cursor:'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#eef3f0'}
                    onMouseLeave={e => e.currentTarget.style.background='#f7f8f6'}>
                    Annulla
                  </button>
                  <button onClick={pubblicaPost} disabled={!numGiocatori || !sport || !orario || !dataPartita}
                    style={{ flex:2, padding:'13px', borderRadius:11, background:'#0a1f13', border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.15s', opacity:(!numGiocatori || !sport || !orario || !dataPartita) ? 0.35 : 1, letterSpacing:0.3 }}
                    onMouseEnter={e => { if (numGiocatori && sport && orario && dataPartita) e.currentTarget.style.background='#2d6e45' }}
                    onMouseLeave={e => e.currentTarget.style.background='#0a1f13'}>
                    ✓ Pubblica Partita
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── POPUP CONFERMA ELIMINA ── */}
        {confermaElimina && (
          <div style={{ position:'fixed', inset:0, background:'rgba(10,31,19,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16, animation:'fadeIn 0.2s ease' }}
            onClick={() => setConfermaElimina(null)}>
            <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:360, overflow:'hidden', animation:'popIn 0.25s ease', boxShadow:'0 20px 60px rgba(10,31,19,0.15)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ background:'#ef4444', padding:'24px', textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🗑️</div>
                <h2 style={{ fontFamily:"'Bebas Neue', sans-serif", color:'#fff', fontSize:26, letterSpacing:3 }}>Elimina Post</h2>
              </div>
              <div style={{ padding:'20px 24px', textAlign:'center' }}>
                <p style={{ color:'#6b7c74', fontSize:13, lineHeight:1.7 }}>
                  Sei sicuro di voler eliminare questo post?<br />
                  <span style={{ color:'#c8d4ce' }}>L'operazione non può essere annullata.</span>
                </p>
              </div>
              <div style={{ display:'flex', gap:9, padding:'0 24px 24px' }}>
                <button onClick={() => setConfermaElimina(null)}
                  style={{ flex:1, padding:'12px', borderRadius:10, background:'#f7f8f6', border:'1px solid #e0e8e3', color:'#6b7c74', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                  Annulla
                </button>
                <button onClick={() => eliminaPost(confermaElimina)}
                  style={{ flex:2, padding:'12px', borderRadius:10, background:'#ef4444', border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#dc2626'}
                  onMouseLeave={e => e.currentTarget.style.background='#ef4444'}>
                  Sì, elimina
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOAST ── */}
        {conferma && (
          <div style={{ position:'fixed', bottom:24, right:24, background:'#0a1f13', color:'#fff', fontWeight:700, fontSize:13, padding:'14px 20px', borderRadius:14, boxShadow:'0 8px 32px rgba(10,31,19,0.25)', zIndex:50, display:'flex', alignItems:'center', gap:8, animation:'toastIn 0.3s ease', letterSpacing:0.3 }}>
            ✅ Partita pubblicata con successo!
          </div>
        )}

      </div>
    </>
  )
}

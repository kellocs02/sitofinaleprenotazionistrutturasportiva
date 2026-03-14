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
    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:'#ef4444' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:'#ef4444', animation:'pulse 1s infinite' }} />
      Scaduto
    </span>
  )
  const urgente = timeLeft.diff < 60 * 60 * 1000
  const color = urgente ? '#ef4444' : timeLeft.diff < 2 * 60 * 60 * 1000 ? '#f59e0b' : '#6b7c74'
  return (
    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background: urgente ? '#ef4444' : '#f59e0b', animation: urgente ? 'pulse 1s infinite' : 'none' }} />
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
      .eq('sport', 'Calcio')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
    if (error) { console.log(error); return }
    setPosts(data ?? [])
  }

  const pubblicaPost = async () => {
    if (!numGiocatori || !orario || !dataPartita) { setErroreForm('Compila tutti i campi prima di pubblicare.'); return }
    setErroreForm('')
    const { data: { session } } = await supabase.auth.getSession()
    const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from('posts').insert({
      utente_id: session?.user?.id,
      numero_giocatori: numGiocatori,
      sport: 'Calcio',
      orario,
      data_partita: dataPartita,
      expires_at: expiresAt,
    })
    if (error) { console.log(error); return }
    setNumGiocatori(null); setOrario(''); setDataPartita('')
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

  const formatData = (dateStr) => new Date(dateStr).toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' })
  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) ?? '?'

  const AvatarComp = ({ profilo, size = 'md' }) => {
    const sz = size === 'sm' ? 26 : size === 'lg' ? 48 : 38
    const fs = size === 'sm' ? 10 : size === 'lg' ? 17 : 13
    if (profilo?.avatar_url) return <img src={profilo.avatar_url} alt="" style={{ width:sz, height:sz, borderRadius:'50%', objectFit:'cover', border:'2px solid #fff', flexShrink:0 }} />
    return (
      <div style={{ width:sz, height:sz, borderRadius:'50%', background:'#0a1f13', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:fs, color:'#fff', letterSpacing:1 }}>
        {getInitials(profilo?.nome_completo)}
      </div>
    )
  }

  const orariDisponibili = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ minHeight:'100vh', background:'#f7f8f6', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
        <div style={{ width:36, height:36, border:'3px solid #0a1f13', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <p style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:4, color:'#6b7c74' }}>CARICAMENTO...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn { from{transform:scale(0.94);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        body { font-family:'DM Sans',sans-serif; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#e0e8e3; border-radius:10px; }
      `}</style>

      <div style={{ display:'flex', minHeight:'100vh', background:'#f7f8f6', fontFamily:"'DM Sans',sans-serif" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width:272, minWidth:272, background:'#0a1f13', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', overflowY:'auto' }}>

          <div style={{ padding:'28px 24px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
              <div style={{ width:34, height:34, background:'#2d6e45', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7.5" stroke="#fff" strokeWidth="1.5"/>
                  <path d="M9 3.5 L10.8 7.5 L9 14.5 L7.2 7.5 Z" fill="#fff" opacity="0.9"/>
                  <circle cx="9" cy="9" r="1.8" fill="#fff"/>
                </svg>
              </div>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:21, letterSpacing:3, color:'#fff' }}>CAMPO<span style={{ color:'#4caf72' }}>+</span></span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:8 }}>
              <div style={{ width:60, height:60, borderRadius:'50%', background:'#152e1e', border:'2px solid #2d6e45', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="11" r="5.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
                  <path d="M4 28C4 22 28 22 28 28" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
                  <text x="16" y="14" textAnchor="middle" dominantBaseline="middle" fontFamily="'Bebas Neue',sans-serif" fontSize="9" fill="white" letterSpacing="1.5">
                    {getInitials(profilo?.nome_completo)}
                  </text>
                </svg>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{profilo?.nome_completo || 'Utente'}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{profilo?.email}</div>
              </div>
              <div style={{ background:'#2d6e45', color:'#a8dbb8', fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', padding:'3px 10px', borderRadius:20 }}>
                {profilo?.ruolo || 'giocatore'}
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ padding:'18px 14px', flex:1, display:'flex', flexDirection:'column', gap:3 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.2)', padding:'0 10px', marginBottom:6 }}>Navigazione</div>
            <button onClick={() => router.push('/dashboard')}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.45)', cursor:'pointer', background:'transparent', border:'none', width:'100%', textAlign:'left', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(255,255,255,0.85)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.45)'; }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.6"/>
                <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.6"/>
                <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.6"/>
                <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.6"/>
              </svg>
              Dashboard
            </button>
            <button style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, fontSize:13, fontWeight:600, color:'#fff', cursor:'default', background:'#2d6e45', border:'none', width:'100%', textAlign:'left' }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M10 10 L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Cerca Giocatori
            </button>

            {/* Info calcio */}
            <div style={{ marginTop:24, padding:'16px', background:'rgba(255,255,255,0.04)', borderRadius:12, border:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:28, textAlign:'center', marginBottom:8 }}>⚽</div>
              <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.7)', textAlign:'center', letterSpacing:1, textTransform:'uppercase' }}>Solo Calcio</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'center', marginTop:4, lineHeight:1.5 }}>Trova giocatori per la tua partita di calcio</p>
              <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                  <span style={{ color:'rgba(255,255,255,0.35)' }}>Partite attive</span>
                  <span style={{ color:'#fff', fontWeight:700 }}>{posts.length}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                  <span style={{ color:'rgba(255,255,255,0.35)' }}>Giocatori cercati</span>
                  <span style={{ color:'#fff', fontWeight:700 }}>{posts.reduce((a,p) => a + p.numero_giocatori, 0)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
                  <span style={{ color:'rgba(255,255,255,0.35)' }}>Iscritti totali</span>
                  <span style={{ color:'#fff', fontWeight:700 }}>{posts.reduce((a,p) => a + (p.partecipanti?.length ?? 0), 0)}</span>
                </div>
              </div>
            </div>
          </nav>

          <div style={{ padding:14, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => { setMostraModale(true); setErroreForm('') }}
              style={{ width:'100%', background:'#2d6e45', border:'none', color:'#fff', padding:'11px 14px', borderRadius:10, fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:2, cursor:'pointer', transition:'all 0.18s' }}
              onMouseEnter={e => e.currentTarget.style.background='#3a8a58'}
              onMouseLeave={e => e.currentTarget.style.background='#2d6e45'}>
              + CERCA GIOCATORI
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

          {/* Topbar */}
          <header style={{ background:'#fff', borderBottom:'1px solid #e0e8e3', padding:'0 32px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:40 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>⚽</span>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:3, color:'#0a1f13' }}>PARTITE DI CALCIO</span>
              <span style={{ background:'#eef3f0', color:'#2d6e45', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, border:'1px solid #c8e0d0', letterSpacing:1 }}>
                {posts.length} ATTIVE
              </span>
            </div>
            <div style={{ fontSize:12, color:'#6b7c74' }}>
              {new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' })}
            </div>
          </header>

          {/* Hero strip */}
          <div style={{ background:'#0a1f13', padding:'28px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, backgroundImage:'repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,0.015) 60px,rgba(255,255,255,0.015) 61px),repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(255,255,255,0.015) 60px,rgba(255,255,255,0.015) 61px)' }} />
            {/* Campo SVG decorativo */}
            <div style={{ position:'absolute', right:200, top:'50%', transform:'translateY(-50%)', opacity:0.04 }}>
              <svg width="180" height="120" viewBox="0 0 400 280" fill="none">
                <rect x="2" y="2" width="396" height="276" stroke="#fff" strokeWidth="3"/>
                <line x1="200" y1="2" x2="200" y2="278" stroke="#fff" strokeWidth="2"/>
                <circle cx="200" cy="140" r="40" stroke="#fff" strokeWidth="2"/>
                <circle cx="200" cy="140" r="3" fill="#fff"/>
                <rect x="2" y="75" width="70" height="130" stroke="#fff" strokeWidth="2"/>
                <rect x="328" y="75" width="70" height="130" stroke="#fff" strokeWidth="2"/>
              </svg>
            </div>
            <div style={{ position:'relative', zIndex:1 }}>
              <p style={{ fontSize:10, fontWeight:700, letterSpacing:3, textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:6 }}>⚽ Community calcio</p>
              <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,4vw,44px)', letterSpacing:3, color:'#fff', lineHeight:1 }}>Trova Giocatori</h1>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:5 }}>Pubblica la tua partita e completa la squadra.</p>
            </div>
            <div style={{ position:'relative', zIndex:1, display:'flex', gap:24, flexShrink:0 }}>
              {[
                { label:'Partite attive', value: posts.length },
                { label:'Giocatori cercati', value: posts.reduce((a,p) => a + p.numero_giocatori, 0) },
                { label:'Già iscritti', value: posts.reduce((a,p) => a + (p.partecipanti?.length ?? 0), 0) },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:'#fff', letterSpacing:1, lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:1, textTransform:'uppercase', marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Feed */}
          <main style={{ padding:'28px 32px 60px', flex:1, overflowY:'auto' }}>
            {posts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'80px 0' }}>
                <div style={{ fontSize:52, marginBottom:14 }}>⚽</div>
                <p style={{ fontWeight:700, color:'#0a1f13', fontSize:16 }}>Nessuna partita di calcio</p>
                <p style={{ color:'#6b7c74', fontSize:13, marginTop:4 }}>Sii il primo a cercare giocatori!</p>
                <button onClick={() => { setMostraModale(true); setErroreForm('') }}
                  style={{ marginTop:18, background:'#0a1f13', color:'#fff', border:'none', padding:'11px 22px', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', letterSpacing:0.3 }}>
                  + Pubblica ora
                </button>
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

                  return (
                    <div key={p.id} style={{ background:'#fff', borderRadius:18, border:'1px solid #e0e8e3', overflow:'hidden', transition:'all 0.2s', animation:'slideUp 0.3s ease' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#0a1f13'; e.currentTarget.style.boxShadow='0 6px 24px rgba(10,31,19,0.07)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#e0e8e3'; e.currentTarget.style.boxShadow='none'; }}>

                      {/* Banner top */}
                      <div style={{ background: completo ? '#fef2f2' : '#eef3f0', borderBottom:'1px solid', borderColor: completo ? '#fecaca' : '#c8e0d0', padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:16 }}>⚽</span>
                          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, letterSpacing:2, color: completo ? '#ef4444' : '#0a1f13' }}>CALCIO</span>
                          {completo && <span style={{ fontSize:10, fontWeight:700, color:'#ef4444', background:'#fee2e2', padding:'2px 8px', borderRadius:10, border:'1px solid #fecaca' }}>COMPLETO</span>}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {p.expires_at && <Countdown expiresAt={p.expires_at} onExpired={() => setPosts(prev => prev.filter(x => x.id !== p.id))} />}
                          {eMioPost && (
                            <button onClick={() => setConfermaElimina(p.id)}
                              style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, background:'#fff', border:'1px solid #fecaca', color:'#ef4444', cursor:'pointer', fontSize:12, transition:'all 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
                              onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ padding:'16px 18px' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:14 }}>
                          <div style={{ flex:1 }}>
                            <p style={{ fontWeight:800, color:'#0a1f13', fontSize:17, lineHeight:1.3 }}>
                              Cerco <span style={{ color:'#2d6e45' }}>{p.numero_giocatori} giocatori</span>
                            </p>
                            <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap' }}>
                              <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#6b7c74', background:'#f7f8f6', padding:'4px 10px', borderRadius:8, border:'1px solid #e0e8e3' }}>
                                📅 {p.data_partita}
                              </span>
                              <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#6b7c74', background:'#f7f8f6', padding:'4px 10px', borderRadius:8, border:'1px solid #e0e8e3' }}>
                                🕐 {p.orario?.slice(0,5)}
                              </span>
                            </div>
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
                            <AvatarComp profilo={p.profili} size="lg" />
                            <span style={{ fontSize:10, color:'#6b7c74', fontWeight:600, maxWidth:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {p.profili?.nome_completo?.split(' ')[0]}
                            </span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div style={{ marginBottom:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#6b7c74', fontWeight:600, marginBottom:6 }}>
                            <span>{numPartecipanti}/{p.numero_giocatori} iscritti</span>
                            <span>{completo ? 'Al completo 🔴' : `${p.numero_giocatori - numPartecipanti} posti liberi`}</span>
                          </div>
                          <div style={{ height:6, background:'#e0e8e3', borderRadius:10, overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:10, background: completo ? '#ef4444' : '#0a1f13', width:`${progresso}%`, transition:'width 0.5s ease' }} />
                          </div>
                        </div>

                        {/* Avatars partecipanti */}
                        {partecipanti.length > 0 && (
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:14, flexWrap:'wrap' }}>
                            <div style={{ display:'flex' }}>
                              {partecipanti.slice(0,5).map((pt, i) => (
                                <div key={pt.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 10-i }}>
                                  <AvatarComp profilo={pt.profili} size="sm" />
                                </div>
                              ))}
                              {partecipanti.length > 5 && (
                                <div style={{ width:26, height:26, borderRadius:'50%', background:'#eef3f0', border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#2d6e45', marginLeft:-8 }}>
                                  +{partecipanti.length - 5}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize:11, color:'#6b7c74' }}>
                              {partecipanti.slice(0,2).map(pt => pt.profili?.nome_completo?.split(' ')[0]).join(', ')}
                              {partecipanti.length > 2 ? ` e altri ${partecipanti.length - 2}` : ''}
                            </span>
                          </div>
                        )}

                        {!eMioPost && (
                          <button onClick={() => toggleCiSono(p)} disabled={completo && !giaPartecipo}
                            style={{ width:'100%', padding:'11px', borderRadius:10, fontWeight:700, fontSize:13, border:'none', cursor:(completo && !giaPartecipo) ? 'not-allowed' : 'pointer', transition:'all 0.18s', letterSpacing:0.3,
                              background: giaPartecipo ? '#fef2f2' : completo ? '#f7f8f6' : '#0a1f13',
                              color: giaPartecipo ? '#ef4444' : completo ? '#c8d4ce' : '#fff',
                              outline: giaPartecipo ? '1px solid #fecaca' : completo ? '1px solid #e0e8e3' : 'none' }}
                            onMouseEnter={e => { if (!completo || giaPartecipo) e.currentTarget.style.background = giaPartecipo ? '#fee2e2' : completo ? '#f7f8f6' : '#2d6e45' }}
                            onMouseLeave={e => { e.currentTarget.style.background = giaPartecipo ? '#fef2f2' : completo ? '#f7f8f6' : '#0a1f13' }}>
                            {giaPartecipo ? '✕ Ritirati' : completo ? 'Partita al completo' : '✋ Ci sono!'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── MODALE ── */}
      {mostraModale && (
        <div style={{ position:'fixed', inset:0, background:'rgba(10,31,19,0.65)', backdropFilter:'blur(7px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16, animation:'fadeIn 0.2s ease' }}
          onClick={() => setMostraModale(false)}>
          <div style={{ background:'#fff', borderRadius:22, width:'100%', maxWidth:440, overflow:'hidden', animation:'popIn 0.25s ease', boxShadow:'0 24px 70px rgba(10,31,19,0.22)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ background:'#0a1f13', padding:'24px 26px 20px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', right:-20, top:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.03)' }} />
              <div style={{ position:'absolute', right:20, bottom:-30, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.03)' }} />
              <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                    <span style={{ fontSize:20 }}>⚽</span>
                    <p style={{ fontSize:10, fontWeight:700, letterSpacing:3, textTransform:'uppercase', color:'rgba(255,255,255,0.4)' }}>Partita di calcio</p>
                  </div>
                  <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", color:'#fff', fontSize:32, letterSpacing:3, lineHeight:1 }}>Cerca Giocatori</h2>
                  <p style={{ color:'rgba(255,255,255,0.35)', fontSize:12, marginTop:5 }}>Il post scade automaticamente in 5 ore</p>
                </div>
                <button onClick={() => setMostraModale(false)}
                  style={{ width:32, height:32, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, color:'rgba(255,255,255,0.6)', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}>✕</button>
              </div>
            </div>

            <div style={{ padding:'22px 26px', display:'flex', flexDirection:'column', gap:18 }}>

              <div>
                <p style={{ fontSize:10, fontWeight:700, color:'#6b7c74', letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Quanti giocatori cerchi?</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                  {[2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setNumGiocatori(n)}
                      style={{ width:42, height:42, borderRadius:10, fontWeight:700, fontSize:14, border:'1.5px solid', cursor:'pointer', transition:'all 0.13s', background: numGiocatori===n ? '#0a1f13' : '#f7f8f6', color: numGiocatori===n ? '#fff' : '#4a5e52', borderColor: numGiocatori===n ? '#0a1f13' : '#e0e8e3' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <p style={{ fontSize:10, fontWeight:700, color:'#6b7c74', letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>Giorno</p>
                  <input type="date" value={dataPartita} onChange={e => setDataPartita(e.target.value)} min={new Date().toISOString().split('T')[0]}
                    style={{ width:'100%', background:'#f7f8f6', border:'1.5px solid #e0e8e3', borderRadius:11, padding:'11px 12px', fontSize:13, color:'#0a1f13', outline:'none', fontFamily:"'DM Sans',sans-serif", transition:'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor='#0a1f13'}
                    onBlur={e => e.target.style.borderColor='#e0e8e3'} />
                </div>
                <div>
                  <p style={{ fontSize:10, fontWeight:700, color:'#6b7c74', letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>Orario</p>
                  <select value={orario} onChange={e => setOrario(e.target.value)}
                    style={{ width:'100%', background:'#f7f8f6', border:'1.5px solid #e0e8e3', borderRadius:11, padding:'11px 12px', fontSize:13, color:'#0a1f13', outline:'none', fontFamily:"'DM Sans',sans-serif", transition:'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor='#0a1f13'}
                    onBlur={e => e.target.style.borderColor='#e0e8e3'}>
                    <option value="">Seleziona...</option>
                    {orariDisponibili.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {erroreForm && (
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', fontSize:13, fontWeight:600, padding:'11px 14px', borderRadius:10 }}>
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
                <button onClick={pubblicaPost} disabled={!numGiocatori || !orario || !dataPartita}
                  style={{ flex:2, padding:'13px', borderRadius:11, background:'#0a1f13', border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:(!numGiocatori || !orario || !dataPartita) ? 'not-allowed' : 'pointer', transition:'all 0.15s', opacity:(!numGiocatori || !orario || !dataPartita) ? 0.35 : 1, letterSpacing:0.3 }}
                  onMouseEnter={e => { if (numGiocatori && orario && dataPartita) e.currentTarget.style.background='#2d6e45' }}
                  onMouseLeave={e => e.currentTarget.style.background='#0a1f13'}>
                  ⚽ Pubblica Partita
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── POPUP ELIMINA ── */}
      {confermaElimina && (
        <div style={{ position:'fixed', inset:0, background:'rgba(10,31,19,0.65)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:16, animation:'fadeIn 0.2s ease' }}
          onClick={() => setConfermaElimina(null)}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:340, overflow:'hidden', animation:'popIn 0.25s ease', boxShadow:'0 20px 60px rgba(10,31,19,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background:'#ef4444', padding:'22px', textAlign:'center' }}>
              <div style={{ fontSize:34, marginBottom:6 }}>🗑️</div>
              <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", color:'#fff', fontSize:24, letterSpacing:3 }}>Elimina Post</h2>
            </div>
            <div style={{ padding:'18px 22px', textAlign:'center' }}>
              <p style={{ color:'#6b7c74', fontSize:13, lineHeight:1.7 }}>
                Sei sicuro di voler eliminare questa partita?<br />
                <span style={{ color:'#c8d4ce' }}>L'operazione non può essere annullata.</span>
              </p>
            </div>
            <div style={{ display:'flex', gap:9, padding:'0 22px 22px' }}>
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
        <div style={{ position:'fixed', bottom:24, right:24, background:'#0a1f13', color:'#fff', fontWeight:700, fontSize:13, padding:'13px 18px', borderRadius:13, boxShadow:'0 8px 32px rgba(10,31,19,0.25)', zIndex:50, display:'flex', alignItems:'center', gap:8, animation:'toastIn 0.3s ease' }}>
          ⚽ Partita pubblicata con successo!
        </div>
      )}
    </>
  )
}
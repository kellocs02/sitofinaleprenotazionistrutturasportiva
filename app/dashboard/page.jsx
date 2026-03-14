'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [profilo, setProfilo] = useState(null)
  const [campi, setCampi] = useState([])
  const [loading, setLoading] = useState(true)
  const [campoSelezionato, setCampoSelezionato] = useState(null)
  const [formPrenotazione, setFormPrenotazione] = useState({ data: '', ora_inizio: '', ora_fine: '' })
  const [loadingPrenotazione, setLoadingPrenotazione] = useState(false)
  const [successoPrenotazione, setSuccessoPrenotazione] = useState(false)
  const [orariOccupati, setOrariOccupati] = useState([])
  const [utenteBloccato, setUtenteBloccato] = useState(false)

  const orariDisponibili = Array.from({ length: 8 }, (_, i) => 16 + i)

  useEffect(() => { checkUser(); getCampi() }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    const { data: profiloData } = await supabase.from('profili').select('*').eq('id', user.id).single()
    setProfilo(profiloData)
    setLoading(false)
  }

  const getCampi = async () => {
    const { data } = await supabase.from('campi').select('*').eq('attivo', true).order('struttura')
    setCampi(data || [])
  }

  const raggruppaPerStruttura = () => {
    return campi.reduce((gruppi, campo) => {
      const s = campo.struttura
      if (!gruppi[s]) gruppi[s] = []
      gruppi[s].push(campo)
      return gruppi
    }, {})
  }

  const caricaOrariOccupati = async (campoId, data) => {
    if (!campoId || !data) return
    const { data: prenotazioni } = await supabase.from('prenotazioni').select('ora_inizio').eq('campo_id', campoId).eq('data', data)
    setOrariOccupati(prenotazioni?.map(p => parseInt(p.ora_inizio.split(':')[0])) || [])
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const handleApriPopup = (campo) => {
    setCampoSelezionato(campo)
    setOrariOccupati([])
    setFormPrenotazione({ data: '', ora_inizio: '', ora_fine: '' })
  }

  const handleChiudiPopup = () => {
    setCampoSelezionato(null)
    setOrariOccupati([])
    setFormPrenotazione({ data: '', ora_inizio: '', ora_fine: '' })
    setSuccessoPrenotazione(false)
  }

  const handleCambioData = (e) => {
    const nuovaData = e.target.value
    setFormPrenotazione({ data: nuovaData, ora_inizio: '', ora_fine: '' })
    caricaOrariOccupati(campoSelezionato.id, nuovaData)
  }

  const selezionaOrario = (ora) => {
    setFormPrenotazione({ ...formPrenotazione, ora_inizio: `${ora}:00`, ora_fine: `${ora + 1}:00` })
  }

  const handlePrenota = async () => {
    setLoadingPrenotazione(true)
    const { data: bloccato } = await supabase.from('utenti_bloccati').select('*').eq('utente_id', user.id).eq('proprietario_id', campoSelezionato.proprietario_id)
    if (bloccato && bloccato.length > 0) {
      setCampoSelezionato(null); setUtenteBloccato(true); setLoadingPrenotazione(false); return
    }
    const { data: prenotazioniEsistenti } = await supabase.from('prenotazioni').select('*').eq('campo_id', campoSelezionato.id).eq('data', formPrenotazione.data).eq('ora_inizio', formPrenotazione.ora_inizio)
    if (prenotazioniEsistenti && prenotazioniEsistenti.length > 0) {
      alert('Questo orario è già occupato. Scegline un altro.'); setLoadingPrenotazione(false); return
    }
    const { error } = await supabase.from('prenotazioni').insert({
      utente_id: user.id, campo_id: campoSelezionato.id,
      data: formPrenotazione.data, ora_inizio: formPrenotazione.ora_inizio,
      ora_fine: formPrenotazione.ora_fine, prezzo_totale: campoSelezionato.prezzo_ora
    })
    if (error) { console.log('Errore:', error); setLoadingPrenotazione(false); return }
    setSuccessoPrenotazione(true)
    setLoadingPrenotazione(false)
    setTimeout(() => handleChiudiPopup(), 2500)
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
        <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: '#0a1f13', letterSpacing: 4 }}>CARICAMENTO...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── PALETTE
           Sidebar:  #0a1f13  (quasi nero-verde)
           Accento:  #2d6e45  (verde medio, per hover/badge)
           Testo sidebar: #ffffff
           Sfondo main: #f7f8f6  (bianco leggermente caldo)
           Card: #ffffff
           Testo primario: #0a1f13
           Testo secondario: #6b7c74
           Border: #e0e8e3
        ── */

        .layout { display: flex; min-height: 100vh; background: #f7f8f6; font-family: 'DM Sans', sans-serif; color: #0a1f13; }

        /* SIDEBAR */
        .sidebar { width: 272px; min-width: 272px; background: #0a1f13; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; }

        .sidebar-top { padding: 28px 24px 24px; }

        .sidebar-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 36px; }
        .sidebar-brand-icon { width: 34px; height: 34px; background: #2d6e45; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
        .sidebar-brand-name { font-family: 'Bebas Neue', sans-serif; font-size: 21px; color: #ffffff; letter-spacing: 3px; }
        .sidebar-brand-name span { color: #4caf72; }

        /* Avatar */
        .profile-wrap { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 20px 0 24px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .profile-avatar { width: 64px; height: 64px; border-radius: 50%; background: #152e1e; border: 2px solid #2d6e45; display: flex; align-items: center; justify-content: center; }
        .profile-name { font-size: 14px; font-weight: 600; color: #ffffff; }
        .profile-email { font-size: 11px; color: rgba(255,255,255,0.35); word-break: break-all; margin-top: 1px; }
        .profile-role { display: inline-block; margin-top: 6px; background: #2d6e45; color: #a8dbb8; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; }
        .btn-edit-profile { margin-top: 4px; background: transparent; border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.5); padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.18s; font-family: 'DM Sans', sans-serif; }
        .btn-edit-profile:hover { border-color: rgba(255,255,255,0.28); color: rgba(255,255,255,0.85); }

        /* Nav */
        .sidebar-nav { padding: 20px 14px; flex: 1; display: flex; flex-direction: column; }
        .nav-section-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.2); padding: 0 10px; margin: 18px 0 6px; }
        .nav-section-label:first-child { margin-top: 0; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.45); cursor: pointer; transition: all 0.15s; border: none; background: transparent; width: 100%; text-align: left; }
        .nav-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); }
        .nav-item.active { background: #2d6e45; color: #ffffff; font-weight: 600; }
        .nav-icon { width: 16px; height: 16px; flex-shrink: 0; }

        /* Sidebar bottom */
        .sidebar-bottom { padding: 14px; border-top: 1px solid rgba(255,255,255,0.07); }
        .btn-logout { width: 100%; background: transparent; border: 1px solid rgba(239,68,68,0.25); color: rgba(239,68,68,0.6); padding: 9px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 7px; font-family: 'DM Sans', sans-serif; }
        .btn-logout:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.5); color: #f87171; }

        /* MAIN */
        .main-area { flex: 1; display: flex; flex-direction: column; min-width: 0; }

        /* Topbar */
        .topbar { background: #ffffff; border-bottom: 1px solid #e0e8e3; padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 40; }
        .topbar-left { display: flex; align-items: center; gap: 10px; }
        .topbar-title { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 3px; color: #0a1f13; }
        .topbar-count { background: #e6f2eb; color: #2d6e45; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 3px 10px; border-radius: 20px; }

        /* Content */
        .content { padding: 32px; flex: 1; }

        /* Stats */
        .stats-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 36px; }
        .stat-card { background: #ffffff; border: 1px solid #e0e8e3; border-radius: 14px; padding: 18px 20px; display: flex; align-items: center; gap: 14px; }
        .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7c74; margin-bottom: 3px; }
        .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: #0a1f13; letter-spacing: 1px; line-height: 1; }

        /* Struttura */
        .struttura-block { margin-bottom: 40px; }
        .struttura-label { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .struttura-pill { background: #0a1f13; color: #ffffff; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; }
        .struttura-line { flex: 1; height: 1px; background: #e0e8e3; }
        .struttura-count { font-size: 11px; color: #6b7c74; white-space: nowrap; }

        /* Campo cards */
        .campi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 14px; }
        .campo-card { background: #ffffff; border: 1px solid #e0e8e3; border-radius: 16px; padding: 22px; transition: all 0.2s; position: relative; overflow: hidden; }
        .campo-card:hover { border-color: #0a1f13; box-shadow: 0 8px 32px rgba(10,31,19,0.08); transform: translateY(-2px); }
        .campo-card-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: #0a1f13; transform: scaleX(0); transform-origin: left; transition: transform 0.25s ease; border-radius: 16px 16px 0 0; }
        .campo-card:hover .campo-card-bar { transform: scaleX(1); }
        .campo-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
        .campo-sport-pill { background: #f0f5f2; color: #2d6e45; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; border: 1px solid #c8e0d0; }
        .campo-prezzo-num { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: #0a1f13; letter-spacing: 1px; line-height: 1; text-align: right; }
        .campo-prezzo-sub { font-size: 10px; color: #6b7c74; text-align: right; text-transform: uppercase; letter-spacing: 1px; margin-top: 1px; }
        .campo-nome { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 1.5px; color: #0a1f13; margin-bottom: 5px; }
        .campo-desc { font-size: 12px; color: #6b7c74; line-height: 1.6; min-height: 36px; margin-bottom: 18px; }
        .btn-prenota { width: 100%; background: #0a1f13; color: #ffffff; border: none; border-radius: 10px; padding: 12px; font-family: 'Bebas Neue', sans-serif; font-size: 15px; letter-spacing: 3px; cursor: pointer; transition: all 0.18s; }
        .btn-prenota:hover { background: #2d6e45; box-shadow: 0 4px 16px rgba(45,110,69,0.3); transform: translateY(-1px); }

        /* Popup */
        .popup-overlay { position: fixed; inset: 0; background: rgba(10,31,19,0.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; animation: fadeIn 0.2s ease; }
        .popup-box { background: #ffffff; border: 1px solid #e0e8e3; border-radius: 20px; padding: 30px; width: 100%; max-width: 450px; animation: slideUp 0.28s ease; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(10,31,19,0.15); }
        .popup-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid #e0e8e3; }
        .popup-title { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 2px; color: #0a1f13; line-height: 1; }
        .popup-subtitle { font-size: 12px; color: #2d6e45; margin-top: 4px; font-weight: 600; }
        .popup-close { background: #f7f8f6; border: 1px solid #e0e8e3; color: #6b7c74; width: 34px; height: 34px; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.18s; flex-shrink: 0; }
        .popup-close:hover { background: #fee2e2; border-color: #fecaca; color: #ef4444; }
        .popup-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #6b7c74; margin-bottom: 7px; }
        .popup-input { width: 100%; background: #f7f8f6; border: 1px solid #e0e8e3; border-radius: 10px; padding: 12px 14px; color: #0a1f13; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.18s, box-shadow 0.18s; margin-bottom: 18px; }
        .popup-input:focus { border-color: #0a1f13; box-shadow: 0 0 0 3px rgba(10,31,19,0.06); background: #fff; }
        .orari-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 8px; }
        .orario-btn { padding: 9px 4px; border-radius: 9px; font-size: 12px; font-weight: 600; border: 1px solid; cursor: pointer; transition: all 0.13s; text-align: center; font-family: 'DM Sans', sans-serif; }
        .orario-default { background: #f7f8f6; border-color: #e0e8e3; color: #4a5e52; }
        .orario-default:hover { border-color: #0a1f13; color: #0a1f13; background: #eef3f0; }
        .orario-selezionato { background: #0a1f13; border-color: #0a1f13; color: #ffffff; box-shadow: 0 3px 10px rgba(10,31,19,0.25); }
        .orario-occupato { background: #fef2f2; border-color: #fecaca; color: #fca5a5; cursor: not-allowed; }
        .orario-passato { background: #f7f8f6; border-color: #e0e8e3; color: #c8d4ce; cursor: not-allowed; }
        .orario-sub { display: block; font-size: 9px; font-weight: 500; letter-spacing: 0.5px; margin-top: 1px; text-transform: uppercase; }
        .legenda { display: flex; gap: 12px; margin-top: 10px; margin-bottom: 18px; flex-wrap: wrap; }
        .legenda-item { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #6b7c74; }
        .legenda-dot { width: 9px; height: 9px; border-radius: 3px; border: 1px solid; }
        .riepilogo-box { background: #f0f5f2; border: 1px solid #c8e0d0; border-radius: 12px; padding: 16px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
        .riepilogo-orario { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #0a1f13; letter-spacing: 1px; }
        .riepilogo-label { font-size: 10px; color: #2d6e45; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; font-weight: 700; }
        .riepilogo-prezzo { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: #0a1f13; letter-spacing: 1px; text-align: right; }
        .popup-actions { display: flex; gap: 9px; }
        .btn-annulla { flex: 1; background: #f7f8f6; border: 1px solid #e0e8e3; color: #6b7c74; padding: 13px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.18s; }
        .btn-annulla:hover { background: #eef3f0; color: #0a1f13; }
        .btn-conferma { flex: 2; background: #0a1f13; border: none; color: #ffffff; padding: 13px; border-radius: 10px; font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 3px; cursor: pointer; transition: all 0.18s; }
        .btn-conferma:hover:not(:disabled) { background: #2d6e45; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(45,110,69,0.3); }
        .btn-conferma:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
        .successo-box { text-align: center; padding: 20px 0; }
        .successo-icon { width: 72px; height: 72px; background: #0a1f13; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 18px; animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .successo-title { font-family: 'Bebas Neue', sans-serif; font-size: 34px; letter-spacing: 3px; color: #0a1f13; margin-bottom: 8px; }
        .successo-detail { font-size: 13px; color: #6b7c74; line-height: 1.8; }

        /* Bloccato */
        .bloccato-overlay { position: fixed; inset: 0; background: rgba(10,31,19,0.65); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px; animation: fadeIn 0.2s ease; }
        .bloccato-box { background: #fff; border: 1.5px solid #fecaca; border-radius: 24px; padding: 40px 32px 32px; width: 100%; max-width: 380px; text-align: center; animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 24px 60px rgba(239,68,68,0.12); position: relative; overflow: hidden; }
        .bloccato-box::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: #ef4444; }
        .bloccato-icon { width: 80px; height: 80px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 20px; animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .bloccato-title { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 3px; color: #dc2626; margin-bottom: 12px; }
        .bloccato-msg { font-size: 13px; color: #6b7c74; line-height: 1.8; margin-bottom: 28px; }
        .bloccato-msg strong { color: #0a1f13; }
        .btn-bloccato-chiudi { width: 100%; background: #ef4444; border: none; color: #fff; padding: 14px; border-radius: 12px; font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 3px; cursor: pointer; transition: all 0.18s; }
        .btn-bloccato-chiudi:hover { background: #dc2626; transform: translateY(-1px); }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      <div className="layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-top">

            <div className="sidebar-brand">
              <div className="sidebar-brand-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="8" stroke="#fff" strokeWidth="1.5"/>
                  <path d="M9 3 L11 7.5 L9 15 L7 7.5 Z" fill="#fff" opacity="0.9"/>
                  <circle cx="9" cy="9" r="2" fill="#fff"/>
                </svg>
              </div>
              <div className="sidebar-brand-name">CAMPO<span>+</span></div>
            </div>

            <div className="profile-wrap">
              <div className="profile-avatar">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="13" r="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                  <path d="M5 32 C5 24 31 24 31 32" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <text x="18" y="16" textAnchor="middle" dominantBaseline="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="10" fill="white" letterSpacing="1.5">
                    {getInitials(profilo?.nome_completo)}
                  </text>
                </svg>
              </div>
              <div className="profile-name">{profilo?.nome_completo || 'Utente'}</div>
              <div className="profile-email">{user?.email}</div>
              <div className="profile-role">{profilo?.ruolo || 'giocatore'}</div>
              <button className="btn-edit-profile" onClick={() => router.push('/profilo')}>Modifica profilo →</button>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Principale</div>
            <button className="nav-item active">
              <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
                <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
              </svg>
              Dashboard
            </button>
            <button className="nav-item" onClick={() => router.push('/RicercaGiocatori')}>
              <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11 L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Cerca Giocatori
            </button>
            {profilo?.ruolo === 'proprietario' && (
              <>
                <div className="nav-section-label">Gestione</div>
                <button className="nav-item" onClick={() => router.push('/proprietario')}>
                  <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1 L10 6 L15 6 L11 9.5 L13 15 L8 11.5 L3 15 L5 9.5 L1 6 L6 6 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  Pannello Proprietario
                </button>
              </>
            )}
          </nav>

          <div className="sidebar-bottom">
            <button className="btn-logout" onClick={handleLogout}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M4.5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2.5M8.5 9.5l3-3-3-3M11.5 6.5H4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Esci dall'account
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="main-area">

          <header className="topbar">
            <div className="topbar-left">
              <div className="topbar-title">CAMPI DISPONIBILI</div>
              <div className="topbar-count">{campi.length} attivi</div>
            </div>
            <div style={{ fontSize: 12, color: '#6b7c74' }}>
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </header>

          <div className="content">

            {/* Stats */}
            <div className="stats-bar">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#eef3f0' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8.5" stroke="#0a1f13" strokeWidth="1.5"/>
                    <path d="M10 3.5 L12 8 L10 16.5 L8 8 Z" fill="#0a1f13" opacity="0.7"/>
                    <circle cx="10" cy="10" r="2" fill="#0a1f13"/>
                  </svg>
                </div>
                <div>
                  <div className="stat-label">Campi totali</div>
                  <div className="stat-value">{campi.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fef9ec' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="4" width="16" height="13" rx="2" stroke="#b45309" strokeWidth="1.5"/>
                    <path d="M6 2v4M14 2v4M2 8h16" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <div className="stat-label">Strutture</div>
                  <div className="stat-value">{Object.keys(raggruppaPerStruttura()).length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#eef3f0' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="7" r="3.5" stroke="#2d6e45" strokeWidth="1.5"/>
                    <path d="M3 18c0-3.5 14-3.5 14 0" stroke="#2d6e45" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <div className="stat-label">Benvenuto</div>
                  <div className="stat-value" style={{ fontSize: 17 }}>{profilo?.nome_completo?.split(' ')[0] || '—'}</div>
                </div>
              </div>
            </div>

            {/* Campi */}
            {campi.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7c74', fontSize: 14 }}>
                Nessun campo disponibile al momento.
              </div>
            ) : (
              Object.entries(raggruppaPerStruttura()).map(([struttura, campiGruppo]) => (
                <div key={struttura} className="struttura-block">
                  <div className="struttura-label">
                    <div className="struttura-pill">{struttura}</div>
                    <div className="struttura-line" />
                    <div className="struttura-count">{campiGruppo.length} campi</div>
                  </div>
                  <div className="campi-grid">
                    {campiGruppo.map(campo => (
                      <div key={campo.id} className="campo-card">
                        <div className="campo-card-bar" />
                        <div className="campo-top">
                          <div className="campo-sport-pill">{campo.sport}</div>
                          <div>
                            <div className="campo-prezzo-num">€{campo.prezzo_ora}</div>
                            <div className="campo-prezzo-sub">per ora</div>
                          </div>
                        </div>
                        <div className="campo-nome">{campo.nome}</div>
                        <div className="campo-desc">{campo.descrizione}</div>
                        <button className="btn-prenota" onClick={() => handleApriPopup(campo)}>
                          PRENOTA ORA
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* POPUP BLOCCATO */}
      {utenteBloccato && (
        <div className="bloccato-overlay" onClick={() => setUtenteBloccato(false)}>
          <div className="bloccato-box" onClick={e => e.stopPropagation()}>
            <div className="bloccato-icon">🚫</div>
            <div className="bloccato-title">ACCESSO NEGATO</div>
            <div className="bloccato-msg">
              Sei stato <strong>bloccato dal proprietario</strong> di questo campo.<br />
              Non puoi effettuare prenotazioni per questa struttura.
            </div>
            <button className="btn-bloccato-chiudi" onClick={() => setUtenteBloccato(false)}>HO CAPITO</button>
          </div>
        </div>
      )}

      {/* POPUP PRENOTAZIONE */}
      {campoSelezionato && (
        <div className="popup-overlay">
          <div className="popup-box">
            {successoPrenotazione ? (
              <div className="successo-box">
                <div className="successo-icon">✓</div>
                <div className="successo-title">PRENOTATO!</div>
                <div className="successo-detail">
                  <strong>{campoSelezionato.nome}</strong><br />
                  {formPrenotazione.data}<br />
                  {formPrenotazione.ora_inizio} → {formPrenotazione.ora_fine}
                </div>
              </div>
            ) : (
              <>
                <div className="popup-header">
                  <div>
                    <div className="popup-title">PRENOTA</div>
                    <div className="popup-subtitle">⚽ {campoSelezionato.nome} · €{campoSelezionato.prezzo_ora}/ora</div>
                  </div>
                  <button className="popup-close" onClick={handleChiudiPopup}>✕</button>
                </div>

                <label className="popup-label">Data</label>
                <input type="date" value={formPrenotazione.data} onChange={handleCambioData}
                  min={new Date().toISOString().split('T')[0]} className="popup-input" />

                {formPrenotazione.data && (
                  <>
                    <label className="popup-label">Seleziona orario</label>
                    <div className="orari-grid">
                      {orariDisponibili.map(ora => {
                        const oggi = new Date().toISOString().split('T')[0]
                        const oraAttuale = new Date().getHours()
                        const isPassato = formPrenotazione.data === oggi && ora <= oraAttuale
                        const isOccupato = orariOccupati.includes(ora)
                        const isSelezionato = formPrenotazione.ora_inizio === `${ora}:00`
                        let cls = 'orario-btn '
                        if (isSelezionato) cls += 'orario-selezionato'
                        else if (isOccupato) cls += 'orario-occupato'
                        else if (isPassato) cls += 'orario-passato'
                        else cls += 'orario-default'
                        return (
                          <button key={ora} className={cls}
                            onClick={() => !isPassato && !isOccupato && selezionaOrario(ora)}
                            disabled={isPassato || isOccupato}>
                            {ora}:00
                            {isOccupato && <span className="orario-sub">occupato</span>}
                            {isPassato && !isOccupato && <span className="orario-sub">passato</span>}
                          </button>
                        )
                      })}
                    </div>
                    <div className="legenda">
                      <div className="legenda-item">
                        <div className="legenda-dot" style={{ background: '#0a1f13', borderColor: '#0a1f13' }} />Selezionato
                      </div>
                      <div className="legenda-item">
                        <div className="legenda-dot" style={{ background: '#fef2f2', borderColor: '#fecaca' }} />Occupato
                      </div>
                      <div className="legenda-item">
                        <div className="legenda-dot" style={{ background: '#f7f8f6', borderColor: '#e0e8e3' }} />Passato
                      </div>
                    </div>
                  </>
                )}

                {formPrenotazione.ora_inizio && (
                  <div className="riepilogo-box">
                    <div>
                      <div className="riepilogo-label">Orario</div>
                      <div className="riepilogo-orario">{formPrenotazione.ora_inizio} → {formPrenotazione.ora_fine}</div>
                    </div>
                    <div>
                      <div className="riepilogo-label" style={{ textAlign: 'right' }}>Totale</div>
                      <div className="riepilogo-prezzo">€{campoSelezionato.prezzo_ora}</div>
                    </div>
                  </div>
                )}

                <div className="popup-actions">
                  <button className="btn-annulla" onClick={handleChiudiPopup}>Annulla</button>
                  <button className="btn-conferma" onClick={handlePrenota}
                    disabled={!formPrenotazione.data || !formPrenotazione.ora_inizio || loadingPrenotazione}>
                    {loadingPrenotazione ? 'SALVO...' : 'CONFERMA'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

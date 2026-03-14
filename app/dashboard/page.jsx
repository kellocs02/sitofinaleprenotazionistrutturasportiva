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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        <div style={{ minHeight: '100vh', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: '#1a3a2a', letterSpacing: 4 }}>CARICAMENTO...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }

        .layout { display: flex; min-height: 100vh; background: #f5f0e8; font-family: 'DM Sans', sans-serif; color: #0f172a; }

        /* ── SIDEBAR ── */
        .sidebar { width: 280px; min-width: 280px; background: #1a3a2a; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; z-index: 50; }
        .sidebar-top { padding: 32px 28px 24px; border-bottom: 1px solid rgba(245,240,232,0.08); }
        .sidebar-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
        .sidebar-brand-icon { width: 36px; height: 36px; background: rgba(245,240,232,0.12); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .sidebar-brand-name { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #f5f0e8; letter-spacing: 3px; }
        .sidebar-brand-name span { color: rgba(245,240,232,0.45); }

        /* Profile block */
        .sidebar-profile { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; }
        .profile-avatar-wrap { position: relative; }
        .profile-avatar { width: 72px; height: 72px; border-radius: 50%; background: rgba(245,240,232,0.1); border: 2px solid rgba(245,240,232,0.15); display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .profile-initials { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: #f5f0e8; letter-spacing: 2px; line-height: 1; }
        .profile-name { font-size: 15px; font-weight: 600; color: #f5f0e8; line-height: 1.3; }
        .profile-email { font-size: 11px; color: rgba(245,240,232,0.4); word-break: break-all; }
        .profile-badge { display: inline-block; background: rgba(245,240,232,0.1); border: 1px solid rgba(245,240,232,0.15); color: rgba(245,240,232,0.6); font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; margin-top: 2px; }
        .sidebar-profile-btn { width: 100%; background: rgba(245,240,232,0.07); border: 1px solid rgba(245,240,232,0.12); color: rgba(245,240,232,0.7); padding: 9px 14px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; cursor: pointer; transition: all 0.2s; margin-top: 4px; }
        .sidebar-profile-btn:hover { background: rgba(245,240,232,0.13); color: #f5f0e8; }

        /* Sidebar nav */
        .sidebar-nav { padding: 20px 16px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .nav-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: rgba(245,240,232,0.25); padding: 0 12px; margin: 16px 0 8px; }
        .nav-label:first-child { margin-top: 0; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; color: rgba(245,240,232,0.55); cursor: pointer; transition: all 0.18s; border: none; background: transparent; width: 100%; text-align: left; }
        .nav-item:hover { background: rgba(245,240,232,0.08); color: #f5f0e8; }
        .nav-item.active { background: rgba(245,240,232,0.12); color: #f5f0e8; font-weight: 600; }
        .nav-item-icon { width: 18px; height: 18px; flex-shrink: 0; opacity: 0.7; }
        .nav-item.active .nav-item-icon { opacity: 1; }

        /* Sidebar bottom */
        .sidebar-bottom { padding: 16px; border-top: 1px solid rgba(245,240,232,0.08); }
        .btn-logout-side { width: 100%; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #fca5a5; padding: 10px 14px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-logout-side:hover { background: rgba(239,68,68,0.18); color: #fecaca; }

        /* ── MAIN ── */
        .main-area { flex: 1; display: flex; flex-direction: column; min-width: 0; }

        /* Topbar */
        .topbar { background: #fff; border-bottom: 1px solid #e8e2d8; padding: 0 36px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 40; }
        .topbar-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 3px; color: #0d1f15; }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .topbar-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: 0.3px; border: 1.5px solid; }

        /* Content */
        .content { padding: 36px; flex: 1; }

        /* Stats bar */
        .stats-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 36px; }
        .stat-card { background: #fff; border: 1.5px solid #e8e2d8; border-radius: 16px; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
        .stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 4px; }
        .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: #0d1f15; letter-spacing: 1px; line-height: 1; }

        /* Section */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px; color: #0d1f15; }
        .section-title span { color: #1a3a2a; }
        .section-badge { background: #d1e8dc; color: #1a3a2a; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; }

        /* Struttura */
        .struttura-block { margin-bottom: 40px; }
        .struttura-label { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .struttura-dot { width: 8px; height: 8px; background: #1a3a2a; border-radius: 50%; }
        .struttura-name { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #1a3a2a; }
        .struttura-line { flex: 1; height: 1px; background: #e8e2d8; }

        /* Campo grid */
        .campi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .campo-card { background: #fff; border: 1.5px solid #e8e2d8; border-radius: 20px; padding: 24px; transition: all 0.25s; position: relative; overflow: hidden; cursor: default; }
        .campo-card:hover { border-color: #254d38; box-shadow: 0 12px 40px rgba(26,58,42,0.1); transform: translateY(-3px); }
        .campo-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
        .campo-sport-pill { background: #e8f2ec; color: #1a3a2a; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; }
        .campo-prezzo-pill { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #0d1f15; letter-spacing: 1px; }
        .campo-prezzo-sub { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; text-align: right; margin-top: 1px; }
        .campo-nome { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 1.5px; color: #0d1f15; margin-bottom: 6px; }
        .campo-desc { font-size: 12px; color: #94a3b8; line-height: 1.6; min-height: 38px; margin-bottom: 20px; }
        .btn-prenota { width: 100%; background: #1a3a2a; color: #f5f0e8; border: none; border-radius: 12px; padding: 13px; font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 3px; cursor: pointer; transition: all 0.2s; }
        .btn-prenota:hover { background: #254d38; box-shadow: 0 6px 20px rgba(26,58,42,0.3); transform: translateY(-1px); }

        /* Popup */
        .popup-overlay { position: fixed; inset: 0; background: rgba(13,31,21,0.5); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; animation: fadeIn 0.2s ease; }
        .popup-box { background: #fff; border: 1.5px solid #ddd8ce; border-radius: 24px; padding: 32px; width: 100%; max-width: 460px; animation: slideUp 0.3s ease; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.12); }
        .popup-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1.5px solid #e8e2d8; }
        .popup-title { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 2px; color: #0f172a; line-height: 1; }
        .popup-subtitle { font-size: 13px; color: #1a3a2a; margin-top: 5px; font-weight: 600; }
        .popup-close { background: #f8fafc; border: 1.5px solid #e2e8f0; color: #94a3b8; width: 36px; height: 36px; border-radius: 10px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .popup-close:hover { background: #fee2e2; border-color: #fecaca; color: #ef4444; }
        .popup-label { display: block; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
        .popup-input { width: 100%; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 13px 16px; color: #0f172a; font-size: 15px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; margin-bottom: 20px; }
        .popup-input:focus { border-color: #254d38; box-shadow: 0 0 0 3px rgba(26,58,42,0.1); background: #fff; }
        .orari-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
        .orario-btn { padding: 10px 4px; border-radius: 10px; font-size: 13px; font-weight: 600; border: 1.5px solid; cursor: pointer; transition: all 0.15s; text-align: center; font-family: 'DM Sans', sans-serif; }
        .orario-default { background: #f8fafc; border-color: #e2e8f0; color: #475569; }
        .orario-default:hover { border-color: #254d38; color: #1a3a2a; background: #e8f2ec; }
        .orario-selezionato { background: #1a3a2a; border-color: #1a3a2a; color: #f5f0e8; box-shadow: 0 4px 12px rgba(26,58,42,0.3); }
        .orario-occupato { background: #fef2f2; border-color: #fecaca; color: #fca5a5; cursor: not-allowed; }
        .orario-passato { background: #f8fafc; border-color: #f1f5f9; color: #cbd5e1; cursor: not-allowed; }
        .orario-sub { display: block; font-size: 9px; font-weight: 500; letter-spacing: 0.5px; margin-top: 2px; text-transform: uppercase; }
        .legenda { display: flex; gap: 14px; margin-top: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .legenda-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8; }
        .legenda-dot { width: 10px; height: 10px; border-radius: 3px; border: 1.5px solid; }
        .riepilogo-box { background: linear-gradient(120deg, #e8f2ec, #d1e8dc); border: 1.5px solid #b8d4c4; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .riepilogo-orario { font-family: 'Bebas Neue', sans-serif; font-size: 24px; color: #0d1f15; letter-spacing: 1px; }
        .riepilogo-label { font-size: 11px; color: #254d38; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; font-weight: 700; }
        .riepilogo-prezzo { font-family: 'Bebas Neue', sans-serif; font-size: 32px; color: #0d1f15; letter-spacing: 1px; text-align: right; }
        .popup-actions { display: flex; gap: 10px; margin-top: 4px; }
        .btn-annulla { flex: 1; background: #f8fafc; border: 1.5px solid #e2e8f0; color: #64748b; padding: 14px; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-annulla:hover { background: #f1f5f9; }
        .btn-conferma { flex: 2; background: #1a3a2a; border: none; color: #f5f0e8; padding: 14px; border-radius: 12px; font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 3px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(26,58,42,0.3); }
        .btn-conferma:hover:not(:disabled) { background: #254d38; transform: translateY(-1px); }
        .btn-conferma:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .successo-box { text-align: center; padding: 24px 0; }
        .successo-icon { width: 80px; height: 80px; background: #1a3a2a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 20px; box-shadow: 0 8px 32px rgba(26,58,42,0.35); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .successo-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 3px; color: #0d1f15; margin-bottom: 10px; }
        .successo-detail { font-size: 14px; color: #64748b; line-height: 1.8; }
        .bloccato-overlay { position: fixed; inset: 0; background: rgba(13,31,21,0.65); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px; animation: fadeIn 0.2s ease; }
        .bloccato-box { background: #fff; border: 2px solid #fecaca; border-radius: 28px; padding: 44px 36px 36px; width: 100%; max-width: 400px; text-align: center; animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 32px 80px rgba(239,68,68,0.18); position: relative; overflow: hidden; }
        .bloccato-box::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #ef4444, #dc2626, #ef4444); }
        .bloccato-icon { width: 88px; height: 88px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 24px; box-shadow: 0 8px 32px rgba(239,68,68,0.35); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .bloccato-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 3px; color: #dc2626; margin-bottom: 14px; }
        .bloccato-msg { font-size: 14px; color: #64748b; line-height: 1.8; margin-bottom: 32px; padding: 0 8px; }
        .bloccato-msg strong { color: #334155; }
        .btn-bloccato-chiudi { width: 100%; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; color: #fff; padding: 16px; border-radius: 14px; font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 3px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(239,68,68,0.3); }
        .btn-bloccato-chiudi:hover { background: linear-gradient(135deg, #dc2626, #b91c1c); transform: translateY(-1px); }

        @media (max-width: 900px) {
          .sidebar { position: fixed; left: 0; top: 0; height: 100vh; transform: translateX(-100%); transition: transform 0.3s ease; }
          .sidebar.open { transform: translateX(0); box-shadow: 4px 0 40px rgba(0,0,0,0.2); }
          .stats-bar { grid-template-columns: 1fr; }
          .content { padding: 20px; }
          .topbar { padding: 0 20px; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      <div className="layout">

        {/* ── SIDEBAR ── */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-top">

            {/* Brand */}
            <div className="sidebar-brand">
              <div className="sidebar-brand-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="#f5f0e8" strokeWidth="1.5"/>
                  <path d="M10 4 L13 8 L10 16 L7 8 Z" fill="#f5f0e8" opacity="0.9"/>
                  <circle cx="10" cy="10" r="2" fill="#f5f0e8"/>
                </svg>
              </div>
              <div className="sidebar-brand-name">CAMPO<span>+</span></div>
            </div>

            {/* Profile */}
            <div className="sidebar-profile">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="15" r="7" fill="rgba(245,240,232,0.25)" stroke="rgba(245,240,232,0.5)" strokeWidth="1.5"/>
                    <path d="M6 36 C6 28 34 28 34 36" stroke="rgba(245,240,232,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="rgba(245,240,232,0.1)"/>
                    <text x="20" y="18" textAnchor="middle" dominantBaseline="middle" fontFamily="'Bebas Neue', sans-serif" fontSize="11" fill="#f5f0e8" letterSpacing="1">
                      {getInitials(profilo?.nome_completo)}
                    </text>
                  </svg>
                </div>
              </div>
              <div>
                <div className="profile-name">{profilo?.nome_completo || 'Utente'}</div>
                <div className="profile-email">{user?.email}</div>
                <div className="profile-badge">{profilo?.ruolo || 'giocatore'}</div>
              </div>
              <button className="sidebar-profile-btn" onClick={() => router.push('/profilo')}>
                Modifica profilo →
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="sidebar-nav">
            <div className="nav-label">Principale</div>
            <button className="nav-item active">
              <svg className="nav-item-icon" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="7" height="7" rx="2" fill="currentColor"/>
                <rect x="10" y="1" width="7" height="7" rx="2" fill="currentColor" opacity="0.5"/>
                <rect x="1" y="10" width="7" height="7" rx="2" fill="currentColor" opacity="0.5"/>
                <rect x="10" y="10" width="7" height="7" rx="2" fill="currentColor" opacity="0.5"/>
              </svg>
              Dashboard
            </button>
            <button className="nav-item" onClick={() => router.push('/RicercaGiocatori')}>
              <svg className="nav-item-icon" viewBox="0 0 18 18" fill="none">
                <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M13 13 L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Cerca Giocatori
            </button>
            {profilo?.ruolo === 'proprietario' && (
              <>
                <div className="nav-label">Gestione</div>
                <button className="nav-item" onClick={() => router.push('/proprietario')}>
                  <svg className="nav-item-icon" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2 L11 7 L17 7 L12.5 10.5 L14.5 16 L9 12.5 L3.5 16 L5.5 10.5 L1 7 L7 7 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  Pannello Proprietario
                </button>
              </>
            )}
          </nav>

          <div className="sidebar-bottom">
            <button className="btn-logout-side" onClick={handleLogout}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M9 10l3-3-3-3M13 7H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Esci dall'account
            </button>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="main-area">

          {/* Topbar */}
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setSidebarOpen(o => !o)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} className="mobile-menu-btn">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="#0d1f15" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <div className="topbar-title">CAMPI DISPONIBILI</div>
            </div>
            <div className="topbar-right">
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                <span style={{ color: '#1a3a2a', fontWeight: 600 }}>{campi.length}</span> campi attivi
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="content">

            {/* Stats */}
            <div className="stats-bar">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#e8f2ec' }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="9" stroke="#1a3a2a" strokeWidth="1.5"/>
                    <path d="M11 4 L13.5 8.5 L11 18 L8.5 8.5 Z" fill="#1a3a2a" opacity="0.8"/>
                    <circle cx="11" cy="11" r="2.5" fill="#1a3a2a"/>
                  </svg>
                </div>
                <div>
                  <div className="stat-label">Campi totali</div>
                  <div className="stat-value">{campi.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fef3c7' }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="3" y="5" width="16" height="14" rx="2" stroke="#d97706" strokeWidth="1.5"/>
                    <path d="M7 3v4M15 3v4M3 9h16" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <div className="stat-label">Strutture</div>
                  <div className="stat-value">{Object.keys(raggruppaPerStruttura()).length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#eff6ff' }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="8" r="4" stroke="#3b82f6" strokeWidth="1.5"/>
                    <path d="M4 19c0-4 14-4 14 0" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <div className="stat-label">Benvenuto</div>
                  <div className="stat-value" style={{ fontSize: 18, letterSpacing: 0.5 }}>{profilo?.nome_completo?.split(' ')[0] || '—'}</div>
                </div>
              </div>
            </div>

            {/* Campi */}
            {campi.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 15 }}>
                Nessun campo disponibile al momento.
              </div>
            ) : (
              Object.entries(raggruppaPerStruttura()).map(([struttura, campiGruppo]) => (
                <div key={struttura} className="struttura-block">
                  <div className="struttura-label">
                    <div className="struttura-dot" />
                    <div className="struttura-name">{struttura}</div>
                    <div className="struttura-line" />
                    <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{campiGruppo.length} campi</span>
                  </div>
                  <div className="campi-grid">
                    {campiGruppo.map(campo => (
                      <div key={campo.id} className="campo-card">
                        <div className="campo-top">
                          <div className="campo-sport-pill">{campo.sport}</div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="campo-prezzo-pill">€{campo.prezzo_ora}</div>
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
                        <div className="legenda-dot" style={{ background: '#1a3a2a', borderColor: '#0d1f15' }} />Selezionato
                      </div>
                      <div className="legenda-item">
                        <div className="legenda-dot" style={{ background: '#fef2f2', borderColor: '#fecaca' }} />Occupato
                      </div>
                      <div className="legenda-item">
                        <div className="legenda-dot" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }} />Passato
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

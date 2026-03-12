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
  const [utenteBloccato, setUtenteBloccato] = useState(false) // ← NUOVO

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


  const { data: bloccato, error: errBlocco } = await supabase
    .from('utenti_bloccati')
    .select('*')
    .eq('utente_id', user.id)
    .eq('proprietario_id', campoSelezionato.proprietario_id)


    if (bloccato && bloccato.length > 0) {
      // Chiude il popup prenotazione e mostra il popup di blocco
      setCampoSelezionato(null)
      setUtenteBloccato(true)
      setLoadingPrenotazione(false)
      return // ← la prenotazione NON viene inserita
    }

    // Controlla se l'orario è già occupato
    const { data: prenotazioniEsistenti } = await supabase
      .from('prenotazioni')
      .select('*')
      .eq('campo_id', campoSelezionato.id)
      .eq('data', formPrenotazione.data)
      .eq('ora_inizio', formPrenotazione.ora_inizio)

    if (prenotazioniEsistenti && prenotazioniEsistenti.length > 0) {
      alert('Questo orario è già occupato. Scegline un altro.')
      setLoadingPrenotazione(false)
      return
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

  if (loading) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
        <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 28, color: '#16a34a', letterSpacing: 4 }}>CARICAMENTO...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .db-root { min-height: 100vh; background: #f8fafc; font-family: 'DM Sans', sans-serif; color: #0f172a; }
        .db-header { background: #fff; border-bottom: 2px solid #f1f5f9; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 12px rgba(0,0,0,0.06); }
        .db-header-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; }
        .db-brand { display: flex; align-items: center; gap: 10px; }
        .db-brand-logo { width: 40px; height: 40px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(34,197,94,0.3); }
        .db-brand-name { font-family: 'Bebas Neue', sans-serif; font-size: 24px; color: #0f172a; letter-spacing: 3px; }
        .db-brand-name span { color: #16a34a; }
        .db-header-right { display: flex; align-items: center; gap: 14px; }
        .db-welcome { font-size: 14px; color: #94a3b8; font-weight: 400; }
        .db-welcome strong { color: #334155; font-weight: 600; }
        .btn-logout { background: #fff; border: 1.5px solid #fecaca; color: #ef4444; padding: 8px 18px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-logout:hover { background: #fef2f2; border-color: #ef4444; }
        .db-hero { background: linear-gradient(120deg, #16a34a 0%, #22c55e 50%, #4ade80 100%); padding: 40px 0 44px; position: relative; overflow: hidden; }
        .db-hero::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(255,255,255,0.04) 80px, rgba(255,255,255,0.04) 81px), repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(255,255,255,0.04) 80px, rgba(255,255,255,0.04) 81px); }
        .db-hero::after { content: '⚽'; position: absolute; right: -20px; top: -30px; font-size: 200px; opacity: 0.06; transform: rotate(15deg); }
        .db-hero-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
        .db-hero-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
        .db-hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(36px, 5vw, 58px); color: #fff; letter-spacing: 3px; line-height: 1; margin-bottom: 10px; }
        .db-hero-sub { font-size: 15px; color: rgba(255,255,255,0.75); font-weight: 300; }
        .db-main { max-width: 1200px; margin: 0 auto; padding: 36px 24px 60px; }
        .profilo-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 28px 32px; margin-bottom: 40px; box-shadow: 0 2px 16px rgba(0,0,0,0.04); position: relative; overflow: hidden; }
        .profilo-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #22c55e, #16a34a); border-radius: 4px 0 0 4px; }
        .profilo-card-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
        .profilo-avatar { width: 50px; height: 50px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 4px 12px rgba(34,197,94,0.25); flex-shrink: 0; }
        .profilo-card-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 2px; color: #0f172a; }
        .profilo-card-sub { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
        .profilo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        @media (min-width: 640px) { .profilo-grid { grid-template-columns: repeat(4, 1fr); } }
        .profilo-item-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 5px; }
        .profilo-item-value { font-size: 15px; font-weight: 600; color: #1e293b; }
        .campi-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
        .campi-section-title { font-family: 'Bebas Neue', sans-serif; font-size: 34px; letter-spacing: 3px; color: #0f172a; }
        .campi-section-title span { color: #16a34a; }
        .campi-count { background: #dcfce7; color: #16a34a; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; }
        .struttura-block { margin-bottom: 44px; }
        .struttura-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #f1f5f9; }
        .struttura-icon { width: 32px; height: 32px; background: #dcfce7; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .struttura-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; color: #16a34a; letter-spacing: 2px; }
        .campi-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px) { .campi-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .campi-grid { grid-template-columns: repeat(3, 1fr); } }
        .campo-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 24px; transition: all 0.25s; position: relative; overflow: hidden; }
        .campo-card:hover { border-color: #22c55e; transform: translateY(-4px); box-shadow: 0 16px 48px rgba(34,197,94,0.12); }
        .campo-card-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #22c55e, #4ade80); transform: scaleX(0); transition: transform 0.3s ease; transform-origin: left; border-radius: 18px 18px 0 0; }
        .campo-card:hover .campo-card-accent { transform: scaleX(1); }
        .campo-sport-badge { display: inline-flex; align-items: center; gap: 5px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 14px; }
        .campo-nome { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 1.5px; color: #0f172a; margin-bottom: 8px; }
        .campo-desc { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; font-weight: 400; min-height: 42px; }
        .campo-footer { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 16px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
        .campo-prezzo { font-family: 'Bebas Neue', sans-serif; font-size: 36px; color: #0f172a; letter-spacing: 1px; line-height: 1; }
        .campo-prezzo-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; }
        .campo-prezzo-badge { background: #f0fdf4; color: #16a34a; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 8px; letter-spacing: 0.5px; }
        .btn-prenota { width: 100%; background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; border: none; border-radius: 12px; padding: 14px; font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 3px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(34,197,94,0.25); }
        .btn-prenota:hover { background: linear-gradient(135deg, #16a34a, #15803d); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(34,197,94,0.35); }
        .btn-prenota:active { transform: translateY(0); }
        .popup-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; animation: fadeIn 0.2s ease; }
        .popup-box { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 24px; padding: 32px; width: 100%; max-width: 460px; animation: slideUp 0.3s ease; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.12); }
        .popup-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1.5px solid #f1f5f9; }
        .popup-title { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 2px; color: #0f172a; line-height: 1; }
        .popup-subtitle { font-size: 13px; color: #16a34a; margin-top: 5px; font-weight: 600; }
        .popup-close { background: #f8fafc; border: 1.5px solid #e2e8f0; color: #94a3b8; width: 36px; height: 36px; border-radius: 10px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .popup-close:hover { background: #fee2e2; border-color: #fecaca; color: #ef4444; }
        .popup-label { display: block; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
        .popup-input { width: 100%; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 13px 16px; color: #0f172a; font-size: 15px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; margin-bottom: 20px; }
        .popup-input:focus { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.1); background: #fff; }
        .orari-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
        .orario-btn { padding: 10px 4px; border-radius: 10px; font-size: 13px; font-weight: 600; border: 1.5px solid; cursor: pointer; transition: all 0.15s; text-align: center; font-family: 'DM Sans', sans-serif; }
        .orario-default { background: #f8fafc; border-color: #e2e8f0; color: #475569; }
        .orario-default:hover { border-color: #22c55e; color: #16a34a; background: #f0fdf4; }
        .orario-selezionato { background: linear-gradient(135deg, #22c55e, #16a34a); border-color: #16a34a; color: #fff; box-shadow: 0 4px 12px rgba(34,197,94,0.3); }
        .orario-occupato { background: #fef2f2; border-color: #fecaca; color: #fca5a5; cursor: not-allowed; }
        .orario-passato { background: #f8fafc; border-color: #f1f5f9; color: #cbd5e1; cursor: not-allowed; }
        .orario-sub { display: block; font-size: 9px; font-weight: 500; letter-spacing: 0.5px; margin-top: 2px; text-transform: uppercase; }
        .legenda { display: flex; gap: 14px; margin-top: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .legenda-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8; }
        .legenda-dot { width: 10px; height: 10px; border-radius: 3px; border: 1.5px solid; }
        .riepilogo-box { background: linear-gradient(120deg, #f0fdf4, #dcfce7); border: 1.5px solid #bbf7d0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .riepilogo-orario { font-family: 'Bebas Neue', sans-serif; font-size: 24px; color: #15803d; letter-spacing: 1px; }
        .riepilogo-label { font-size: 11px; color: #4ade80; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; font-weight: 700; }
        .riepilogo-prezzo { font-family: 'Bebas Neue', sans-serif; font-size: 32px; color: #15803d; letter-spacing: 1px; text-align: right; }
        .popup-actions { display: flex; gap: 10px; margin-top: 4px; }
        .btn-annulla { flex: 1; background: #f8fafc; border: 1.5px solid #e2e8f0; color: #64748b; padding: 14px; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-annulla:hover { background: #f1f5f9; color: #334155; }
        .btn-conferma { flex: 2; background: linear-gradient(135deg, #22c55e, #16a34a); border: none; color: #fff; padding: 14px; border-radius: 12px; font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 3px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(34,197,94,0.3); }
        .btn-conferma:hover:not(:disabled) { background: linear-gradient(135deg, #16a34a, #15803d); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(34,197,94,0.4); }
        .btn-conferma:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .successo-box { text-align: center; padding: 24px 0; }
        .successo-icon { width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 20px; box-shadow: 0 8px 32px rgba(34,197,94,0.35); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .successo-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 3px; color: #15803d; margin-bottom: 10px; }
        .successo-detail { font-size: 14px; color: #64748b; line-height: 1.8; }

        /* ── POPUP BLOCCATO ── */
        .bloccato-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.65); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px; animation: fadeIn 0.2s ease; }
        .bloccato-box { background: #fff; border: 2px solid #fecaca; border-radius: 28px; padding: 44px 36px 36px; width: 100%; max-width: 400px; text-align: center; animation: slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 32px 80px rgba(239,68,68,0.18); position: relative; overflow: hidden; }
        .bloccato-box::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #ef4444, #dc2626, #ef4444); }
        .bloccato-icon { width: 88px; height: 88px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 24px; box-shadow: 0 8px 32px rgba(239,68,68,0.35); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .bloccato-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 3px; color: #dc2626; margin-bottom: 14px; }
        .bloccato-msg { font-size: 14px; color: #64748b; line-height: 1.8; margin-bottom: 32px; padding: 0 8px; }
        .bloccato-msg strong { color: #334155; }
        .btn-bloccato-chiudi { width: 100%; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; color: #fff; padding: 16px; border-radius: 14px; font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 3px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(239,68,68,0.3); }
        .btn-bloccato-chiudi:hover { background: linear-gradient(135deg, #dc2626, #b91c1c); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(239,68,68,0.4); }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      <div className="db-root">

        {/* HEADER */}
        <header className="db-header">
          <div className="db-header-inner">
            <div className="db-brand">
              <div className="db-brand-logo">⚽</div>
              <div className="db-brand-name">CAMPO<span>+</span></div>
            </div>
            <div className="db-header-right">
              <div className="db-welcome">
                Ciao, <strong>{profilo?.nome_completo?.split(' ')[0] || 'Campione'}</strong>
              </div>
              {profilo?.ruolo === 'proprietario' && (
                <button
                  onClick={() => router.push('/proprietario')}
                  style={{ background: '#fef3c7', border: '1.5px solid #fde68a', color: '#d97706', padding: '8px 16px', borderRadius: '10px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.5px', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fde68a'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fef3c7'}
                >
                  ⭐ Gestione
                </button>
              )}
              <button
                onClick={() => router.push('/RicercaGiocatori')}
                style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#3b82f6', padding: '8px 16px', borderRadius: '10px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.5px', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#bfdbfe'}
                onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
              >
                ⚽ Cerca Giocatori
              </button>
              <button className="btn-logout" onClick={handleLogout}>Esci</button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <div className="db-hero">
          <div className="db-hero-inner">
            <div className="db-hero-eyebrow">⚡ Dashboard</div>
            <div className="db-hero-title">BENVENUTO, {profilo?.nome_completo?.split(' ')[0]?.toUpperCase() || 'CAMPIONE'}!</div>
            <div className="db-hero-sub">Scegli il tuo campo e prenota in pochi secondi.</div>
          </div>
        </div>

        <main className="db-main">

          {/* PROFILO */}
          <div className="profilo-card">
            <div className="profilo-card-header">
              <div className="profilo-avatar">👤</div>
              <div>
                <button
                  onClick={() => router.push('/profilo')}
                  className="profilo-card-title group relative flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-green-800/30 cursor-pointer transition-colors duration-200"
                >
                  Il tuo profilo →
                </button>
                <div className="profilo-card-sub">Dati account</div>
              </div>
            </div>
            <div className="profilo-grid">
              <div>
                <div className="profilo-item-label">Nome</div>
                <div className="profilo-item-value">{profilo?.nome_completo || '—'}</div>
              </div>
              <div>
                <div className="profilo-item-label">Email</div>
                <div className="profilo-item-value">{user?.email || '—'}</div>
              </div>
              <div>
                <div className="profilo-item-label">Telefono</div>
                <div className="profilo-item-value">{profilo?.telefono || 'Non specificato'}</div>
              </div>
              <div>
                <div className="profilo-item-label">Ruolo</div>
                <div className="profilo-item-value">{profilo?.ruolo || '—'}</div>
              </div>
            </div>
          </div>

          {/* CAMPI */}
          <div className="campi-section-header">
            <div className="campi-section-title">CAMPI <span>DISPONIBILI</span></div>
            <div className="campi-count">🟢 {campi.length} attivi</div>
          </div>

          {campi.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 15 }}>
              Nessun campo disponibile al momento.
            </div>
          ) : (
            Object.entries(raggruppaPerStruttura()).map(([struttura, campiGruppo]) => (
              <div key={struttura} className="struttura-block">
                <div className="struttura-header">
                  <div className="struttura-icon">🏟️</div>
                  <div className="struttura-name">{struttura}</div>
                </div>
                <div className="campi-grid">
                  {campiGruppo.map(campo => (
                    <div key={campo.id} className="campo-card">
                      <div className="campo-card-accent" />
                      <div className="campo-sport-badge">⚽ {campo.sport}</div>
                      <div className="campo-nome">{campo.nome}</div>
                      <div className="campo-desc">{campo.descrizione}</div>
                      <div className="campo-footer">
                        <div>
                          <div className="campo-prezzo">€{campo.prezzo_ora}</div>
                          <div className="campo-prezzo-label">per ora</div>
                        </div>
                        <div className="campo-prezzo-badge">1 ora</div>
                      </div>
                      <button className="btn-prenota" onClick={() => handleApriPopup(campo)}>
                        PRENOTA ORA
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

        </main>

        {/* ── POPUP BLOCCATO — z-index 300, sopra tutto, blocca la prenotazione ── */}
        {utenteBloccato && (
          <div className="bloccato-overlay" onClick={() => setUtenteBloccato(false)}>
            <div className="bloccato-box" onClick={e => e.stopPropagation()}>
              <div className="bloccato-icon">🚫</div>
              <div className="bloccato-title">ACCESSO NEGATO</div>
              <div className="bloccato-msg">
                Sei stato <strong>bloccato dal proprietario</strong> di questo campo.<br />
                Non puoi effettuare prenotazioni per questa struttura.
              </div>
              <button className="btn-bloccato-chiudi" onClick={() => setUtenteBloccato(false)}>
                HO CAPITO
              </button>
            </div>
          </div>
        )}

        {/* ── POPUP PRENOTAZIONE ── */}
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
                  <input
                    type="date"
                    value={formPrenotazione.data}
                    onChange={handleCambioData}
                    min={new Date().toISOString().split('T')[0]}
                    className="popup-input"
                  />

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
                            <button
                              key={ora}
                              className={cls}
                              onClick={() => !isPassato && !isOccupato && selezionaOrario(ora)}
                              disabled={isPassato || isOccupato}
                            >
                              {ora}:00
                              {isOccupato && <span className="orario-sub">occupato</span>}
                              {isPassato && !isOccupato && <span className="orario-sub">passato</span>}
                            </button>
                          )
                        })}
                      </div>
                      <div className="legenda">
                        <div className="legenda-item">
                          <div className="legenda-dot" style={{ background: '#22c55e', borderColor: '#16a34a' }} />
                          Selezionato
                        </div>
                        <div className="legenda-item">
                          <div className="legenda-dot" style={{ background: '#fef2f2', borderColor: '#fecaca' }} />
                          Occupato
                        </div>
                        <div className="legenda-item">
                          <div className="legenda-dot" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }} />
                          Passato
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
                    <button
                      className="btn-conferma"
                      onClick={handlePrenota}
                      disabled={!formPrenotazione.data || !formPrenotazione.ora_inizio || loadingPrenotazione}
                    >
                      {loadingPrenotazione ? 'SALVO...' : 'CONFERMA'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}

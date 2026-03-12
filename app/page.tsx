import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#7ecf4a', fontFamily: "'Nunito', sans-serif" }}>

      {/* Sfondo campo */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 60px, transparent 60px, transparent 120px)'
      }} />

      <div className="relative max-w-4xl mx-auto px-7 py-7">

        {/* Nav */}
        <nav className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2 text-[#1a5c0a] font-black text-xl" style={{ fontFamily: "'Fredoka One', cursive" }}>
            <span className="w-8 h-8 bg-white rounded-full border-[3px] border-[#1a5c0a] flex items-center justify-center text-base">⚽</span>
            CS Panoramica
          </div>
          <div className="flex gap-2">
            <Link href="/login" className="bg-white border-[3px] border-[#1a5c0a] text-[#1a5c0a] px-5 py-2 rounded-full font-extrabold text-sm hover:bg-[#e8ffd4] transition">Accedi</Link>
            <Link href="/registrazione" className="bg-[#ff7c2a] border-[3px] border-[#c95700] text-white px-5 py-2 rounded-full font-extrabold text-sm shadow-[0_4px_0_#c95700] hover:-translate-y-0.5 transition">Registrati!</Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center mb-9">
          <div className="inline-block bg-white border-[3px] border-[#1a5c0a] rounded-full px-5 py-1.5 text-[#1a5c0a] font-extrabold text-sm mb-5">✨ Prenota online ✨</div>
          <h1 className="text-[clamp(38px,7vw,70px)] leading-tight text-white mb-2" style={{
            fontFamily: "'Fredoka One', cursive",
            textShadow: '3px 4px 0 #1a5c0a, 6px 8px 0 rgba(0,0,0,0.12)'
          }}>
            CENTRO SPORTIVO<br /><span className="text-yellow-200">PANORAMICA</span>
          </h1>
          <p className="text-[#1a5c0a] font-bold text-lg mb-7">Scegli il campo e gioca subito — facile come un calcio al pallone!</p>
          <div className="flex gap-4 justify-center">
            <Link href="/prenotazioni" className="bg-white border-4 border-[#1a5c0a] text-[#1a5c0a] px-9 py-4 rounded-full font-extrabold text-lg shadow-[0_5px_0_#1a5c0a] hover:-translate-y-1 transition">⚽ Prenota ora</Link>
            <Link href="/campi" className="bg-yellow-200 border-4 border-yellow-400 text-yellow-800 px-9 py-4 rounded-full font-extrabold text-lg shadow-[0_5px_0_#e6c800] hover:-translate-y-1 transition">📅 Scopri i campi</Link>
          </div>
        </div>

        {/* Striscia campo */}
        <div className="h-3 mx-[-28px] mb-8 border-t-4 border-b-4 border-dashed border-white/40" style={{ background: '#5bb832' }} />

        {/* Cards */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { icon: '📅', color: 'bg-blue-100 border-blue-500 text-blue-500', title: 'Prenota Online', desc: 'Scegli data e ora in pochi click, da telefono o computer!' },
            { icon: '💳', color: 'bg-orange-100 border-orange-400 text-orange-400', title: 'Paga Facile', desc: 'Pagamento online sicuro oppure direttamente alla cassa' },
            { icon: '📱', color: 'bg-purple-100 border-purple-500 text-purple-500', title: 'Gestisci Tutto', desc: 'Modifica o cancella la tua prenotazione quando vuoi' },
          ].map((c) => (
            <div key={c.title} className="bg-white border-4 border-[#1a5c0a] rounded-3xl p-7 text-center shadow-[0_6px_0_#1a5c0a] hover:-translate-y-1 transition">
              <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center text-2xl mx-auto mb-4 ${c.color}`}>{c.icon}</div>
              <h3 className="font-black text-xl text-[#1a5c0a] mb-2" style={{ fontFamily: "'Fredoka One', cursive" }}>{c.title}</h3>
              <p className="text-sm font-semibold text-[#5a7a4a] leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex bg-white border-4 border-[#1a5c0a] rounded-2xl overflow-hidden shadow-[0_5px_0_#1a5c0a]">
          {[['12', 'Campi'], ['2400+', 'Prenotazioni'], ['7/7', 'Giorni aperti']].map(([n, l], i) => (
            <div key={l} className={`flex-1 text-center py-5 ${i < 2 ? 'border-r-[3px] border-[#e8f5e0]' : ''}`}>
              <div className="text-[#ff7c2a] text-3xl font-black" style={{ fontFamily: "'Fredoka One', cursive" }}>{n}</div>
              <div className="text-[#5a7a4a] text-xs font-extrabold uppercase tracking-wide">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
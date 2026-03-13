import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen font-sans">

      {/* ── LEFT PANEL ── */}
      <div className="relative w-[52%] bg-[#0d4f1c] overflow-hidden flex flex-col justify-end p-12">

        {/* Grass stripes */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 40px, transparent 40px, transparent 80px)' }}
        />

        {/* Diagonal accent */}
        <div className="absolute top-[-60px] right-[-40px] w-28 h-[110%] bg-green-400/5 -rotate-[8deg] pointer-events-none" />

        {/* Pitch circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border-2 border-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white/20" />

        {/* Floating ball */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[58%] drop-shadow-2xl"
          style={{ animation: 'float 4s ease-in-out infinite' }}>
          <svg width="172" height="172" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="90" cy="90" r="86" fill="white"/>
            <polygon points="90,18 109,32 102,55 78,55 71,32" fill="#111"/>
            <polygon points="148,62 163,82 155,104 133,104 124,83" fill="#111"/>
            <polygon points="131,142 111,156 90,148 82,126 104,112" fill="#111"/>
            <polygon points="49,142 28,128 30,105 52,96 69,112" fill="#111"/>
            <polygon points="17,76 32,58 55,63 62,85 44,101" fill="#111"/>
            <line x1="90" y1="18" x2="71" y2="32" stroke="#bbb" strokeWidth="1" opacity="0.5"/>
            <line x1="90" y1="18" x2="109" y2="32" stroke="#bbb" strokeWidth="1" opacity="0.5"/>
            <line x1="102" y1="55" x2="124" y2="83" stroke="#bbb" strokeWidth="1" opacity="0.5"/>
            <line x1="78" y1="55" x2="62" y2="85" stroke="#bbb" strokeWidth="1" opacity="0.5"/>
            <line x1="133" y1="104" x2="131" y2="142" stroke="#bbb" strokeWidth="1" opacity="0.5"/>
            <line x1="52" y1="96" x2="49" y2="142" stroke="#bbb" strokeWidth="1" opacity="0.5"/>
            <line x1="104" y1="112" x2="82" y2="126" stroke="#bbb" strokeWidth="1" opacity="0.5"/>
            <line x1="44" y1="101" x2="30" y2="105" stroke="#bbb" strokeWidth="1" opacity="0.5"/>
            <line x1="163" y1="82" x2="148" y2="62" stroke="#bbb" strokeWidth="1" opacity="0.5"/>
            <line x1="32" y1="58" x2="17" y2="76" stroke="#bbb" strokeWidth="1" opacity="0.5"/>
            <ellipse cx="68" cy="52" rx="18" ry="10" fill="white" opacity="0.14" transform="rotate(-30 68 52)"/>
          </svg>
        </div>

        {/* Bottom content */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/25 text-green-400 text-[11px] font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Campo disponibile ora
          </div>
          <h2 className="text-5xl font-black text-white uppercase leading-none tracking-tight mb-3"
            style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}>
            Gioca.<br />
            <span className="text-green-400">Vinci.</span><br />
            Ripeti.
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-[260px]">
            Il tuo campo ti aspetta. Prenota in pochi secondi.
          </p>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@900&display=swap');
          @keyframes float {
            0%,100% { transform: translate(-50%, -58%); }
            50%      { transform: translate(-50%, -64%); }
          }
        `}</style>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="relative flex-1 flex flex-col justify-center px-16 bg-white">

        {/* Nav */}
        <div className="absolute top-8 left-12 flex items-center gap-2">
          <span className="text-lg">⚽</span>
          <span className="font-black text-[#0d4f1c] text-base uppercase tracking-widest"
            style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}>
            CS Panoramica
          </span>
        </div>
        <div className="absolute top-8 right-12 flex items-center gap-3">
          <Link href="/login"
            className="text-sm font-semibold text-gray-600 border border-gray-200 px-5 py-2 rounded-lg hover:border-[#0d4f1c] hover:text-[#0d4f1c] transition">
            Accedi
          </Link>
          <Link href="/registrazione"
            className="text-sm font-bold text-white bg-[#0d4f1c] px-5 py-2 rounded-lg hover:bg-[#166534] transition">
            Registrati
          </Link>
        </div>

        {/* Hero */}
        <p className="text-xs font-bold tracking-[0.16em] uppercase text-green-600 mb-4">
          ⚽ Centro Sportivo Panoramica
        </p>
        <h1 className="font-black text-[clamp(42px,4.5vw,64px)] leading-none uppercase tracking-tight text-gray-950 mb-5"
          style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}>
          Prenota il<br />
          tuo <span className="text-[#15803d]">campo</span><br />
          online
        </h1>
        <p className="text-[15px] text-gray-400 leading-relaxed max-w-sm mb-10">
          Scegli l'orario, scegli il campo, paga in sicurezza. Tutto da telefono o computer, in meno di un minuto.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/prenotazioni"
            className="inline-flex items-center gap-2 bg-[#0d4f1c] text-white font-bold text-base uppercase tracking-wide px-8 py-3.5 rounded-xl hover:bg-[#166534] hover:-translate-y-0.5 transition-all"
            style={{ fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}>
            Prenota ora →
          </Link>
          <Link href="/campi"
            className="text-sm font-semibold text-gray-400 hover:text-[#0d4f1c] transition">
            Scopri i campi →
          </Link>
        </div>

      </div>
    </div>
  )
}

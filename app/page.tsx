import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: '#ffffff', fontFamily: "'Nunito', sans-serif" }}>

      <div className="max-w-3xl mx-auto px-8 py-8">

        {/* Nav */}
        <nav className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-2 text-[#1a5c0a] font-black text-lg" style={{ fontFamily: "'Fredoka One', cursive" }}>
            <span className="text-xl">⚽</span>
            CS Panoramica
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="text-[#1a5c0a] font-bold text-sm px-5 py-2 rounded-full border-2 border-[#1a5c0a] hover:bg-[#f0fde8] transition">
              Accedi
            </Link>
            <Link href="/registrazione" className="bg-[#1a5c0a] text-white font-bold text-sm px-5 py-2 rounded-full hover:bg-[#258010] transition">
              Registrati
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="mb-24">
          <div className="inline-flex items-center gap-2 bg-[#f0fde8] border border-[#b6e89a] text-[#1a5c0a] text-xs font-bold px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 bg-[#4caf28] rounded-full" />
            Prenota online
          </div>
          <h1 className="text-[clamp(40px,6vw,64px)] leading-[1.1] font-black text-gray-900 mb-5 tracking-tight" style={{ fontFamily: "'Fredoka One', cursive" }}>
            Centro Sportivo<br />
            <span className="text-[#1a5c0a]">Panoramica</span>
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-md">
            Prenota il tuo campo preferito in pochi secondi. Semplice, veloce, da qualsiasi dispositivo.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-16" />

        {/* Cards */}
        <div className="grid grid-cols-3 gap-6 mb-16">
          {[
            { icon: '📅', title: 'Prenota online', desc: 'Scegli data e ora in pochi click, da telefono o computer.' },
            { icon: '📱', title: 'Gestisci tutto', desc: 'Modifica o cancella la prenotazione quando vuoi.' },
            { icon: '7/7', title: 'Sempre aperti', desc: 'I nostri campi sono disponibili ogni giorno della settimana.', isText: true },
          ].map((c) => (
            <div key={c.title} className="p-6 rounded-2xl border border-gray-100 hover:border-[#b6e89a] hover:bg-[#fafffe] transition group">
              <div className="w-10 h-10 bg-[#f0fde8] rounded-xl flex items-center justify-center text-lg mb-4 group-hover:bg-[#d4f5b0] transition">
                {c.isText
                  ? <span className="text-[#1a5c0a] font-black text-xs">7/7</span>
                  : c.icon}
              </div>
              <h3 className="font-black text-gray-900 text-sm mb-1">{c.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
          {[['12', 'Campi disponibili'], ['2.400+', 'Prenotazioni'], ['7/7', 'Giorni aperti']].map(([n, l]) => (
            <div key={l} className="text-center py-6">
              <div className="text-[#1a5c0a] text-2xl font-black mb-0.5" style={{ fontFamily: "'Fredoka One', cursive" }}>{n}</div>
              <div className="text-gray-400 text-xs font-semibold">{l}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

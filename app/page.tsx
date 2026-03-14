import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen" style={{ fontFamily: "'Georgia', serif" }}>

      {/* LEFT — Verde scuro */}
      <div className="w-1/2 bg-[#1a3a2a] flex flex-col justify-between px-14 py-14">

        <div>
          <p className="text-[#f5f0e8]/40 text-xs uppercase tracking-[0.2em] mb-3">Messina, Sicilia</p>
          <h1 className="text-[#f5f0e8] text-4xl font-bold leading-tight">
            Campo Sportivo<br />Panoramica
          </h1>
        </div>

        <div className="border-l-2 border-[#f5f0e8]/20 pl-6">
          <p className="text-[#f5f0e8]/65 text-xl leading-snug italic">
            "Il campo ti aspetta.<br />Tutto il resto è solo una scusa."
          </p>
        </div>

        <p className="text-[#f5f0e8]/25 text-xs uppercase tracking-[0.2em]">Est. 2010</p>

      </div>

      {/* RIGHT — Bianco panna */}
      <div className="w-1/2 bg-[#f5f0e8] flex flex-col justify-between px-14 py-14">

        <div className="flex justify-end">
          <span className="text-[#1a3a2a]/30 text-xs uppercase tracking-[0.2em]">Accesso piattaforma</span>
        </div>

        <div>
          <p className="text-[#1a3a2a]/40 text-xs uppercase tracking-[0.2em] mb-3">Benvenuto</p>
          <h2 className="text-[#0d1f15] text-3xl font-bold leading-tight mb-3">
            Prenota il tuo<br />campo oggi
          </h2>
          <p className="text-[#0d1f15]/50 text-sm leading-relaxed mb-10 max-w-xs">
            Accedi al tuo account o crea un profilo per iniziare a prenotare i campi del Centro Sportivo Panoramica.
          </p>

          <div className="flex flex-col gap-3 max-w-xs">
            <Link
              href="/login"
              className="text-center bg-[#1a3a2a] text-[#f5f0e8] font-semibold text-sm py-3.5 rounded-lg hover:bg-[#254d38] transition">
              Accedi
            </Link>
            <Link
              href="/registrazione"
              className="text-center border border-[#1a3a2a]/30 text-[#1a3a2a] font-semibold text-sm py-3.5 rounded-lg hover:border-[#1a3a2a] hover:bg-[#1a3a2a]/5 transition">
              Crea un account
            </Link>
          </div>
        </div>

        <p className="text-[#0d1f15]/20 text-xs">© 2025 Campo Sportivo Panoramica</p>

      </div>
    </div>
  )
}
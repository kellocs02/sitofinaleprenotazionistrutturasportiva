import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen" style={{ fontFamily: "'Georgia', serif" }}>

      {/* LEFT — Terracotta caldo */}
      <div className="w-1/2 bg-[#8b3a1e] flex flex-col justify-between px-14 py-14">

        <div>
          <p className="text-[#f5d9c8]/40 text-xs uppercase tracking-[0.2em] mb-3">Messina, Sicilia</p>
          <h1 className="text-[#f5d9c8] text-4xl font-bold leading-tight">
            Campo Sportivo<br />Panoramica
          </h1>
        </div>

        <div className="border-l-2 border-[#f5d9c8]/20 pl-6">
          <p className="text-[#f5d9c8]/65 text-xl leading-snug italic">
            "Il campo ti aspetta.<br />Tutto il resto è solo una scusa."
          </p>
        </div>

        <p className="text-[#f5d9c8]/25 text-xs uppercase tracking-[0.2em]">Est. 2010</p>

      </div>

      {/* RIGHT — Crema sabbia */}
      <div className="w-1/2 bg-[#f2e8d9] flex flex-col justify-between px-14 py-14">

        <div className="flex justify-end">
          <span className="text-[#8b3a1e]/30 text-xs uppercase tracking-[0.2em]">Accesso piattaforma</span>
        </div>

        <div>
          <p className="text-[#8b3a1e]/40 text-xs uppercase tracking-[0.2em] mb-3">Benvenuto</p>
          <h2 className="text-[#3d1a0a] text-3xl font-bold leading-tight mb-3">
            Prenota il tuo<br />campo oggi
          </h2>
          <p className="text-[#3d1a0a]/50 text-sm leading-relaxed mb-10 max-w-xs">
            Accedi al tuo account o crea un profilo per iniziare a prenotare i campi del Centro Sportivo Panoramica.
          </p>

          <div className="flex flex-col gap-3 max-w-xs">
            <Link
              href="/login"
              className="text-center bg-[#8b3a1e] text-[#f2e8d9] font-semibold text-sm py-3.5 rounded-lg hover:bg-[#a04522] transition">
              Accedi
            </Link>
            <Link
              href="/registrazione"
              className="text-center border border-[#8b3a1e]/30 text-[#8b3a1e] font-semibold text-sm py-3.5 rounded-lg hover:border-[#8b3a1e] hover:bg-[#8b3a1e]/5 transition">
              Crea un account
            </Link>
          </div>
        </div>

        <p className="text-[#3d1a0a]/20 text-xs">© 2025 Campo Sportivo Panoramica</p>

      </div>
    </div>
  )
}

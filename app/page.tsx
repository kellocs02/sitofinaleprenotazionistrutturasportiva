import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen" style={{ fontFamily: "'Georgia', serif" }}>

      {/* LEFT — Blu scuro */}
      <div className="w-1/2 bg-[#0f1f3d] flex flex-col justify-between px-14 py-14">

        {/* Logo */}
        <div>
          <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-2">Catania, Sicilia</p>
          <h1 className="text-white text-4xl font-bold leading-tight">
            Campo Sportivo<br />Panoramica
          </h1>
        </div>

        {/* Center quote */}
        <div className="border-l-2 border-white/15 pl-6">
          <p className="text-white/60 text-xl leading-snug italic">
            "Il campo ti aspetta.<br />Tutto il resto è solo scusa."
          </p>
        </div>

        {/* Bottom placeholder */}
        <p className="text-white/20 text-xs uppercase tracking-[0.2em]">Est. 2010</p>

      </div>

      {/* RIGHT — Blu navy medio */}
      <div className="w-1/2 bg-[#162444] flex flex-col justify-between px-14 py-14">

        {/* Top label */}
        <div className="flex justify-end">
          <span className="text-white/25 text-xs uppercase tracking-[0.2em]">Accesso piattaforma</span>
        </div>

        {/* Center content */}
        <div>
          <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-3">Benvenuto</p>
          <h2 className="text-white text-3xl font-bold leading-tight mb-3">
            Prenota il tuo<br />campo oggi
          </h2>
          <p className="text-white/45 text-sm leading-relaxed mb-10 max-w-xs">
            Accedi al tuo account o crea un profilo per iniziare a prenotare i campi del Centro Sportivo Panoramica.
          </p>

          <div className="flex flex-col gap-3 max-w-xs">
            <Link
              href="/login"
              className="text-center bg-white text-[#0f1f3d] font-semibold text-sm py-3.5 rounded-lg hover:bg-white/90 transition">
              Accedi
            </Link>
            <Link
              href="/registrazione"
              className="text-center border border-white/20 text-white font-semibold text-sm py-3.5 rounded-lg hover:border-white/50 hover:bg-white/5 transition">
              Crea un account
            </Link>
          </div>
        </div>

        {/* Bottom */}
        <p className="text-white/20 text-xs">
          © 2025 Campo Sportivo Panoramica
        </p>

      </div>
    </div>
  )
}

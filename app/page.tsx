import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen">

      {/* LEFT — Verde scuro */}
      <div className="w-1/2 bg-[#1a3d2b] flex flex-col items-center justify-center px-16">
        <span className="text-6xl mb-6">⚽</span>
        <h1 className="text-4xl font-black text-[#f5f0e8] uppercase tracking-tight text-center leading-tight">
          Campo Sportivo<br />Panoramica
        </h1>
        <p className="text-[#f5f0e8]/50 text-sm mt-4 text-center">
          Prenota il tuo campo online
        </p>
      </div>

      {/* RIGHT — Beige chiaro */}
      <div className="w-1/2 bg-[#f5f0e8] flex flex-col items-center justify-center px-16 gap-4">
        <Link
          href="/login"
          className="w-full max-w-xs text-center bg-[#1a3d2b] text-[#f5f0e8] font-bold text-sm py-3.5 rounded-xl hover:bg-[#245235] transition">
          Accedi
        </Link>
        <Link
          href="/registrazione"
          className="w-full max-w-xs text-center bg-transparent border-2 border-[#1a3d2b] text-[#1a3d2b] font-bold text-sm py-3.5 rounded-xl hover:bg-[#1a3d2b]/5 transition">
          Registrati
        </Link>
      </div>

    </div>
  )
}

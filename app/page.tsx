import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-indigo-800 via-blue-700 to-blue-500 text-white flex flex-col justify-center">
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        
        <div className="text-8xl mb-6 animate-bounce">⚽</div>
        
        <h1 className="text-6xl md:text-7xl font-extrabold mb-6 drop-shadow-lg">
          Centro Sportivo
        </h1>
        
        <p className="text-xl md:text-2xl mb-12 text-blue-100 drop-shadow">
          Prenota i tuoi campi preferiti online in modo facile e veloce
        </p>
        
        <div className="flex flex-col md:flex-row gap-6 justify-center">
          <Link
            href="/registrazione"
            className="bg-gradient-to-r from-white/90 to-white/70 text-blue-700 px-10 py-4 rounded-xl font-semibold text-lg hover:scale-105 hover:shadow-lg transition-transform duration-300"
          >
            Registrati
          </Link>
          <Link
            href="/login"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:scale-105 hover:shadow-lg transition-transform duration-300 border-2 border-white/50"
          >
            Accedi
          </Link>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-10 text-left">
          {[
            { icon: '📅', title: 'Prenota Online', desc: 'Scegli data e ora in pochi click' },
            { icon: '💳', title: 'Pagamento Facile', desc: 'Paga online o alla cassa' },
            { icon: '📱', title: 'Gestisci Prenotazioni', desc: 'Visualizza e modifica le tue prenotazioni' },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 hover:bg-white/20 hover:scale-105 transition-transform duration-300 shadow-lg"
            >
              <div className="text-5xl mb-4">{card.icon}</div>
              <h3 className="text-2xl font-bold mb-2">{card.title}</h3>
              <p className="text-blue-100">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-auto py-6 text-center text-blue-100/80 text-sm">
        © 2026 Centro Sportivo - Tutti i diritti riservati
      </footer>
    </div>
  )
}
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        
        <div className="text-7xl mb-8">⚽</div>
        
        <h1 className="text-6xl font-bold mb-6">Centro Sportivo</h1>
        
        <p className="text-xl mb-12 text-blue-100">
          Prenota i tuoi campi preferiti online in modo facile e veloce
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link
            href="/registrazione"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition"
          >
            Registrati
          </Link>
          <Link
            href="/login"
            className="bg-blue-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-400 transition border-2 border-white"
          >
            Accedi
          </Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8 text-left">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold mb-2">Prenota Online</h3>
            <p className="text-blue-100">Scegli data e ora in pochi click</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="text-xl font-bold mb-2">Pagamento Facile</h3>
            <p className="text-blue-100">Paga online o alla cassa</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-bold mb-2">Gestisci Prenotazioni</h3>
            <p className="text-blue-100">Visualizza e modifica le tue prenotazioni</p>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegistrazionePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  // State per i dati del form
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confermaPassword: '',
    nomeCompleto: '',
    telefono: ''
  })

  // Funzione che aggiorna lo state quando scrivi nei campi
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // Funzione che gestisce l'invio del form
  const handleSubmit = async (e) => {
    e.preventDefault() // Previene il refresh della pagina
    setError(null)
    setLoading(true)

    // VALIDAZIONE
    if (formData.password !== formData.confermaPassword) {
      setError('Le password non coincidono')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri')
      setLoading(false)
      return
    }

    try {
      // REGISTRA L'UTENTE con Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nome_completo: formData.nomeCompleto
          }
        }
      })

      if (signUpError) throw signUpError

      // AGGIORNA IL PROFILO con telefono
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profili')
          .upsert({ 
            id: data.user.id,
            nome_completo: formData.nomeCompleto,
            telefono: formData.telefono,
            ruolo: 'utente'
          })

        if (profileError) console.error('Errore profilo:', profileError)
      }

      setSuccess(true)
      
      // Redirect alla dashboard dopo 2 secondi
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      console.error('Errore registrazione:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Se la registrazione è avvenuta con successo, mostra messaggio
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Registrazione completata!</h2>
          <p className="text-gray-600">Verrai reindirizzato alla dashboard...</p>
        </div>
      </div>
    )
  }

  // Form di registrazione
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⚽</div>
          <h1 className="text-3xl font-bold text-gray-800">Registrati</h1>
          <p className="text-gray-600 mt-2">Crea il tuo account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Campo Nome Completo */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              name="nomeCompleto"
              value={formData.nomeCompleto}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
              placeholder="Mario Rossi"
            />
          </div>

          {/* Campo Email */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
              placeholder="mario@example.com"
            />
          </div>

          {/* Campo Telefono */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Telefono
            </label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
              placeholder="+39 123 456 7890"
            />
          </div>

          {/* Campo Password */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
              placeholder="••••••••"
            />
          </div>

          {/* Campo Conferma Password */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Conferma Password
            </label>
            <input
              type="password"
              name="confermaPassword"
              value={formData.confermaPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
              placeholder="••••••••"
            />
          </div>

          {/* Messaggio di Errore */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Bottone Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>

        {/* Link al Login */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Hai già un account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Accedi
          </Link>
        </div>
      </div>
    </div>
  )
}
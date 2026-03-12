'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { use } from 'react'
import { v4 as uuidv4 } from 'uuid'

export default function Profilo() {
    const router = useRouter()

    const [user, setUser] = useState(null)
    const [profilo, setProfilo] = useState(null)

    useEffect(() => {
        caricaProfilo()
    }, [])

    const RicaricaPagina = async () => {

    }

    const caricaProfilo = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        const authUser = session?.user ?? (await supabase.auth.getUser()).data.user
        if (!authUser) {
            router.push('/login')
            return
        }

        const { data: profiloData, error } = await supabase
            .from('profili').select('*').eq('id', authUser.id).single()

        if (error || !profiloData) {
            router.push('/login')
            return
        }

        setProfilo(profiloData)
        console.log(profiloData)
    }

    const gestisciImmagine = async (event) => {
        const file = event.target.files[0]
        if (!file) {
            return
        }

        const nomeFile = uuidv4() + "_" + file.name
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(`public/${nomeFile}`, file, { upsert: true })

        if (error) {
            console.log("Errore inserimento file: ", error)
            return
        }

        console.log("File caricato:", data)

        const { data: publicUrl } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(`public/${nomeFile}`)

        await supabase
            .from('profili')
            .update({ avatar_url: publicUrl.publicUrl })
            .eq('id', profilo.id)

        router.refresh()
    }

    const logout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    } 

    return (
        <div className="min-h-screen bg-green-950 flex flex-col relative overflow-hidden">

            {/* Decorazioni campo da calcio */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-72 h-72 rounded-full border border-white opacity-5" />
                <div className="absolute w-4 h-4 rounded-full bg-white opacity-5" />
            </div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-5 pointer-events-none" />
            <div className="absolute top-1/4 bottom-1/4 left-20 w-px bg-white opacity-5 pointer-events-none" />
            <div className="absolute top-1/4 bottom-1/4 right-20 w-px bg-white opacity-5 pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 bg-green-900 border-b border-green-700 px-6 py-4 flex items-center justify-between">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-green-300 hover:text-white transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">Indietro</span>
                </button>

                <div className="flex items-center gap-2">
                    <span className="text-lg">⚽</span>
                    <span className="text-green-200 text-sm font-bold tracking-widest uppercase">Campo Booking</span>
                </div>

                <button onClick={logout} className="flex items-center gap-2 text-green-300 hover:text-red-400 transition-colors duration-200">
                    <span className="text-sm font-medium">Logout</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                    </svg>
                </button>
            </header>

            {/* Contenuto centrato */}
            <div className="flex-1 flex items-center justify-center p-6">

                {/* Card */}
                <div className="relative z-10 w-80 rounded-2xl overflow-hidden shadow-2xl border border-green-700 bg-green-900">

                    {/* Header card */}
                    <div className="bg-green-800 px-5 py-3 flex items-center gap-2 border-b border-green-700">
                        <span className="text-lg">⚽</span>
                        <span className="text-green-200 text-xs font-bold tracking-widest uppercase">Profilo</span>
                    </div>

                    {profilo ? (
                        <div className="flex flex-col items-center px-8 py-8 gap-4">

                            {/* Avatar */}
                            <label className="cursor-pointer relative group">
                                <img
                                    src={profilo.avatar_url || "/default-avatar.png"}
                                    alt="Foto utente"
                                    className="w-24 h-24 rounded-full object-cover border-4 border-green-500 shadow-lg group-hover:brightness-75 transition-all duration-200"
                                />
                                <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <svg className="w-7 h-7 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.172a2 2 0 001.414-.586l.828-.828A2 2 0 018.828 5h6.344a2 2 0 011.414.586l.828.828A2 2 0 0018.828 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={gestisciImmagine} />
                            </label>

                            {/* Badge */}
                            <span className="bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-full tracking-widest uppercase shadow">
                                🏆 Giocatore
                            </span>

                            {/* Divisore */}
                            <div className="flex items-center gap-2 w-full">
                                <div className="flex-1 h-px bg-green-700" />
                                <span className="text-sm">⚽</span>
                                <div className="flex-1 h-px bg-green-700" />
                            </div>

                            {/* Nome ed email */}
                            <div className="text-center">
                                <p className="text-white text-xl font-bold tracking-tight">
                                    {profilo.nome_completo}
                                </p>
                                <p className="text-green-400 text-sm mt-1">
                                    {profilo.email}
                                </p>
                            </div>

                            {/* Statistiche */}
                            <div className="w-full grid grid-cols-3 gap-2 mt-1">
                                <div className="bg-green-800 rounded-xl p-3 text-center border border-green-700">
                                    <p className="text-white font-bold text-lg leading-none">0</p>
                                    <p className="text-green-400 text-xs mt-1">Partite</p>
                                </div>
                                <div className="bg-green-800 rounded-xl p-3 text-center border border-green-700">
                                    <p className="text-white font-bold text-lg leading-none">0</p>
                                    <p className="text-green-400 text-xs mt-1">Campi</p>
                                </div>
                                <div className="bg-green-800 rounded-xl p-3 text-center border border-green-700">
                                    <p className="text-white font-bold text-lg leading-none">0</p>
                                    <p className="text-green-400 text-xs mt-1">Gol</p>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <span className="text-4xl animate-bounce">⚽</span>
                            <p className="text-green-400 text-xs tracking-widest uppercase">Caricamento...</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

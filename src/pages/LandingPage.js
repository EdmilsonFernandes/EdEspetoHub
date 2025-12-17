import React from 'react';
import { useNavigate } from 'react-router-dom';

export function LandingPage() {
    const navigate =
        useNavigate();

    const goToDemoStore =
        () => {
            navigate(
                '/test-store',
            );
        };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <header className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white font-black flex items-center justify-center shadow-lg">
                                CS
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-lg font-bold text-gray-900">
                                    Chama
                                    no
                                    Espeto
                                </p>
                                <p className="text-sm text-gray-500">
                                    Plataforma
                                    multi-loja
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                onClick={
                                    goToDemoStore
                                }
                                className="px-3 py-2 sm:px-4 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <span className="hidden sm:inline">
                                    Ver
                                    loja
                                    demo
                                </span>
                                <span className="sm:hidden">
                                    Demo
                                </span>
                            </button>
                            <button
                                onClick={() =>
                                    navigate(
                                        '/create',
                                    )
                                }
                                className="px-3 py-2 sm:px-4 text-sm rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
                            >
                                <span className="hidden sm:inline">
                                    Criar
                                    Loja
                                </span>
                                <span className="sm:hidden">
                                    Criar
                                </span>
                            </button>
                            <button
                                onClick={() =>
                                    navigate(
                                        '/admin',
                                    )
                                }
                                className="px-3 py-2 sm:px-4 text-sm rounded-lg border-2 border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white transition-all"
                            >
                                <span className="hidden sm:inline">
                                    Admin
                                </span>
                                <span className="sm:hidden">
                                    Admin
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Banner */}
            <div className="w-full">
                <img
                    src="/chama-no-espeto.jpeg"
                    alt="Chama no Espeto"
                    className="w-full h-64 sm:h-96 lg:h-screen object-contain"
                />
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-8 sm:py-12 lg:py-16">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                        <section className="space-y-6 lg:space-y-8">
                            <div className="space-y-4">
                                <span className="inline-flex items-center px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full uppercase tracking-wide border border-red-100">
                                    🔥
                                    Plataforma
                                    multi-loja
                                </span>
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-gray-900 leading-tight">
                                    Crie
                                    sites
                                    de
                                    pedidos
                                    de
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600">
                                        {' '}
                                        churrasco{' '}
                                    </span>
                                    personalizados
                                </h1>
                                <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl">
                                    Configure
                                    a
                                    identidade
                                    visual
                                    do
                                    seu
                                    espeto
                                    e
                                    publique
                                    um
                                    link
                                    exclusivo
                                    para
                                    seus
                                    clientes
                                    fazerem
                                    pedidos
                                    online.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3">
                                        <span className="text-white text-lg">
                                            🎨
                                        </span>
                                    </div>
                                    <p className="font-semibold text-gray-900 mb-1">
                                        Identidade
                                        visual
                                        flexível
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Logo,
                                        cores
                                        e
                                        slug
                                        exclusivo
                                        por
                                        loja.
                                    </p>
                                </div>
                                <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3">
                                        <span className="text-white text-lg">
                                            ⚡
                                        </span>
                                    </div>
                                    <p className="font-semibold text-gray-900 mb-1">
                                        Gestão
                                        completa
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Produtos,
                                        status
                                        e
                                        fila
                                        do
                                        churrasqueiro.
                                    </p>
                                </div>
                                <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-3">
                                        <span className="text-white text-lg">
                                            📱
                                        </span>
                                    </div>
                                    <p className="font-semibold text-gray-900 mb-1">
                                        Mobile-first
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Otimizado
                                        para
                                        celular
                                        e
                                        tablet.
                                    </p>
                                </div>
                                <div className="p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-3">
                                        <span className="text-white text-lg">
                                            🚀
                                        </span>
                                    </div>
                                    <p className="font-semibold text-gray-900 mb-1">
                                        Setup
                                        rápido
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Sua
                                        loja
                                        online
                                        em
                                        minutos.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white border border-gray-100 rounded-3xl shadow-xl p-8 sm:p-10 lg:sticky lg:top-24 text-center">
                            <div className="space-y-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                                    <span className="text-white text-4xl">
                                        🍖
                                    </span>
                                </div>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                                        Pronto
                                        para
                                        começar?
                                    </h2>
                                    <p className="text-gray-600">
                                        Crie
                                        sua
                                        loja
                                        online
                                        em
                                        minutos
                                        e
                                        comece
                                        a
                                        receber
                                        pedidos
                                        hoje
                                        mesmo.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() =>
                                            navigate(
                                                '/create',
                                            )
                                        }
                                        className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                    >
                                        🚀
                                        Criar
                                        minha
                                        loja
                                        agora
                                    </button>
                                    <button
                                        onClick={
                                            goToDemoStore
                                        }
                                        className="w-full border-2 border-gray-200 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                                    >
                                        👀
                                        Ver
                                        loja
                                        demo
                                        primeiro
                                    </button>
                                </div>

                                <div className="pt-6 border-t border-gray-100">
                                    <p className="text-sm text-gray-500 mb-3">
                                        ✨
                                        Recursos
                                        inclusos:
                                    </p>
                                    <div className="space-y-2 text-left">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="text-green-500">
                                                ✓
                                            </span>
                                            <span>
                                                Cardápio
                                                personalizado
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="text-green-500">
                                                ✓
                                            </span>
                                            <span>
                                                Integração
                                                com
                                                WhatsApp
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="text-green-500">
                                                ✓
                                            </span>
                                            <span>
                                                Painel
                                                administrativo
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="text-green-500">
                                                ✓
                                            </span>
                                            <span>
                                                Fila
                                                do
                                                churrasqueiro
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}

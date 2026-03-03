import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-6 py-12">
            <div className="text-center max-w-lg">
                {/* 404 with bouncy sad face */}
                <div className="relative mb-8">
                    <h1 className="text-[150px] md:text-[200px] font-black text-primary opacity-5 leading-none select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-bounce">
                            <svg
                                className="w-36 h-36 md:w-48 md:h-48 text-(--color-bg-accent)"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">
                    ¡Oops! Página no encontrada
                </h2>
                <p className="text-secondary text-lg mb-8 leading-relaxed">
                    La página que buscas no existe o ha sido movida.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-themed text-primary font-semibold rounded-lg transition-all duration-300 hover:bg-secondary hover:cursor-pointer transform hover:scale-105"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        Página anterior
                    </button>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent text-on-accent font-semibold rounded-lg bg-accent-hover transition-all duration-300 hover:cursor-pointer transform hover:scale-105 hover:shadow-lg"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSearchUsers } from "@/api/generated/users/users";
import { Search, Clock } from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";

export default function UserSearch() {
    const [query, setQuery] = useState("");

    const { data: searchResponse, isLoading } = useSearchUsers(
        { q: query },
        {
            query: {
                enabled: query.trim().length > 0
            }
        }
    );

    const users = searchResponse || [];

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pt-8 px-4 md:px-0">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Buscar usuarios</h1>
                <p className="text-secondary text-sm">Encuentra a tus amigos por nombre de usuario.</p>
            </div>

            <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary">
                    <Search size={20} />
                </div>
                <input
                    type="search"
                    placeholder="Buscar por usuario..."
                    className="w-full bg-secondary placeholder-secondary outline-none px-4 py-3 pl-10 rounded-xl font-medium border border-themed focus:border-themed transition-all shadow-sm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-4 mt-2">
                {query.trim() === "" ? (
                    <div className="text-secondary text-center py-12 bg-secondary rounded-xl border border-dashed border-themed">
                        Escribe un nombre de usuario para comenzar a buscar.
                    </div>
                ) : isLoading ? (
                    <div className="text-secondary text-center py-12 font-bold animate-pulse bg-secondary rounded-xl border border-themed">
                        Buscando...
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-secondary text-center py-12 bg-secondary rounded-xl border border-dashed border-themed">
                        No se han encontrado usuarios que coincidan con &quot;<span className="font-bold">{query}</span>&quot;.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {users.map((u) => (
                            <Link key={u._id} to={`/user/${u._id}`} className="flex items-center justify-between bg-secondary p-4 rounded-xl shadow-sm border border-themed hover:border-themed transition-colors group">
                                <div className="flex items-center gap-4">
                                    <UserAvatar user={u} size={48} />
                                    <div>
                                        <p className="font-bold text-primary transition-colors text-lg">
                                            {u.username}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {u.sent_friend_request ? (
                                        <div className="flex items-center gap-2 text-secondary bg-secondary rounded-xl px-3 py-2 text-sm font-medium" title="Solicitud enviada">
                                            <Clock size={18} />
                                            <span className="hidden sm:inline">Pendiente</span>
                                        </div>
                                    ) : u.received_friend_request ? (
                                        <div className="flex items-center gap-2 text-primary bg-secondary rounded-xl px-3 py-2 text-sm font-bold border border-themed" title="Tienes una solicitud pendiente">
                                            <span className="hidden sm:inline">Responder solicitud</span>
                                        </div>
                                    ) : null}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
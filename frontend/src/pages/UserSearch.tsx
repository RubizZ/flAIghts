import { useState } from "react";
import { Link } from "react-router-dom";
import { useSearchUsers } from "@/api/generated/users/users";
import { Search, Clock } from "lucide-react";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTranslation } from "react-i18next";

export default function UserSearch() {
    const { t } = useTranslation();
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
                <h1 className="text-3xl font-bold">{t("userSearch.title")}</h1>
                <p className="text-content-muted text-sm">{t("userSearch.subtitle")}</p>
            </div>

            <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-content-muted">
                    <Search size={20} />
                </div>
                <input
                    type="search"
                    placeholder={t("userSearch.placeholder")}
                    className="w-full bg-surface placeholder-content-muted outline-none px-4 py-3 pl-10 rounded-xl font-medium border border-line focus:border-brand shadow-sm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-4 mt-2">
                {query.trim() === "" ? (
                    <div className="text-content-muted text-center py-12 bg-surface rounded-xl border border-dashed border-line">
                        {t("userSearch.emptyState")}
                    </div>
                ) : isLoading ? (
                    <div className="text-content-muted text-center py-12 font-bold animate-pulse bg-surface rounded-xl border border-line">
                        {t("userSearch.loading")}
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-content-muted text-center py-12 bg-surface rounded-xl border border-dashed border-line">
                        {t("userSearch.noResults", { query })}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {users.map((u) => (
                            <Link key={u._id} to={`/user/${u._id}`} className="flex items-center justify-between bg-surface p-4 rounded-xl shadow-sm border border-line hover:border-brand group">
                                <div className="flex items-center gap-4">
                                    <UserAvatar user={u} size={48} />
                                    <div>
                                        <p className="font-bold text-content text-lg">
                                            {u.username}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {u.sent_friend_request ? (
                                        <div className="flex items-center gap-2 text-content-muted bg-surface rounded-xl px-3 py-2 text-sm font-medium" title={t("userSearch.status.pending")}>
                                            <Clock size={18} />
                                            <span className="hidden sm:inline">{t("userSearch.status.pending")}</span>
                                        </div>
                                    ) : u.received_friend_request ? (
                                        <div className="flex items-center gap-2 text-content bg-surface rounded-xl px-3 py-2 text-sm font-bold border border-line" title={t("userSearch.status.respond")}>
                                            <span className="hidden sm:inline">{t("userSearch.status.respond")}</span>
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
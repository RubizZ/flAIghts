import {
    useGetUserById,
    useSendFriendRequest,
    useAcceptFriendRequest,
    useCancelFriendRequest,
    useRemoveFriend,
    getGetUserByIdQueryKey,
    getGetSelfUserQueryKey
} from "@/api/generated/openapi/users";
import { useGetSearchesInfinite } from "@/api/generated/openapi/search";
import { useState, UIEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Lock, MessageCircle, UserMinus, History, Star, Users, Calendar, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import UserAvatar from "@/components/ui/UserAvatar";
import { useSendMessage } from "@/api/generated/openapi/conversations";
import SearchCard from "@/components/search/SearchCard";
import { useTranslation } from "react-i18next";

export default function UserProfile() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user: authUser, isLoading: isAuthLoading } = useAuth();

    if (!id) {
        throw new Error("User ID is required");
    }

    const queryClient = useQueryClient();
    const invalidateUser = () => {
        queryClient.invalidateQueries({ queryKey: getGetUserByIdQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetSelfUserQueryKey() });
    };

    const { mutate: sendFriendRequest } = useSendFriendRequest({
        mutation: {
            onSuccess: () => {
                toast.success(t("userProfile.toast.requestSent"));
                invalidateUser();
            },
            onError: (error) => toast.error(error.message),
        },
    });

    const { mutate: sendMessage } = useSendMessage({
        mutation: {
            onSuccess: () => {
                toast.success(t("share.flightSharedSuccess"));
                window.dispatchEvent(new CustomEvent('flaights:mission:send-message'));
                window.dispatchEvent(new CustomEvent('flaights:mission:share-from-results'));
            },
            onError: () => toast.error(t("share.shareFlightError"))
        }
    });

    const { mutate: acceptFriendRequest } = useAcceptFriendRequest({
        mutation: {
            onSuccess: () => {
                toast.success(t("userProfile.toast.requestAccepted"));
                invalidateUser();
            },
            onError: (error) => toast.error(error.message),
        },
    });

    const { mutate: cancelFriendRequest } = useCancelFriendRequest({
        mutation: {
            onSuccess: () => {
                toast.success(t("userProfile.toast.requestCancelled"));
                invalidateUser();
            },
            onError: (error) => toast.error(error.message),
        },
    });

    const { mutate: removeFriend } = useRemoveFriend({
        mutation: {
            onSuccess: () => {
                toast.success(t("userProfile.toast.friendRemoved"));
                invalidateUser();
            },
            onError: (error) => toast.error(error.message),
        }
    });

    const { data: user, isLoading, isError, error } = useGetUserById(id, {
        query: {
            enabled: !!id && isAuthenticated,
        },
    });

    const {
        data: searchesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isSearchesLoading
    } = useGetSearchesInfinite(
        id,
        {
            limit: 10,
            sharedOnly: true // Siempre mostramos solo las destacadas en el perfil
        },
        {
            query: {
                enabled: !!id && !!user && (user.type !== "public" || user.public === true),
                refetchOnWindowFocus: false,
            }
        }
    );

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    useEffect(() => {
        if (user && user.type !== "self") {
            window.dispatchEvent(new CustomEvent('flaights:mission:view-user-profile'));
        }
    }, [user]);

    if (isAuthLoading || isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-6 animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-red-50 rounded-full border border-red-100">
                    <Lock className="w-12 h-12 text-red-500" />
                </div>
                <div className="text-center gap-2 flex flex-col items-center">
                    <h1 className="text-3xl font-bold text-content">{t("userProfile.notAuthenticated.title")}</h1>
                    <p className="text-content-muted max-w-sm">
                        {t("userProfile.notAuthenticated.description")}
                    </p>
                </div>
                <Link to="/login" className="px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 cursor-pointer font-bold">
                    {t("userProfile.notAuthenticated.login")}
                </Link>
            </div>
        );
    }

    if (isError && error?.code === "NOT_FOUND") {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-6 animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-red-50 rounded-full border border-red-100">
                    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="text-center gap-2 flex flex-col">
                    <h1 className="text-3xl font-bold text-content">{t("userProfile.notFound.title")}</h1>
                    <p className="text-content-muted max-w-sm">
                        {t("userProfile.notFound.description", { id })}
                    </p>
                </div>
                <button
                    onClick={() => navigate("/")}
                    className="px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 cursor-pointer hover:scale-[1.02] text-bold"
                >
                    {t("userProfile.notFound.home")}
                </button>
            </div>
        );
    }

    if (isError || user === undefined) return null;

    const lastSeenAt = new Date(user.last_seen_at).getTime();
    const now = new Date().getTime();

    return (
        <div className="flex flex-col lg:flex-row p-4 lg:p-8 gap-6 lg:gap-8 justify-center w-full max-w-6xl mx-auto items-start min-h-[calc(100vh-100px)] lg:h-[calc(100vh-100px)] overflow-y-auto lg:overflow-hidden">
            <div className="flex flex-col gap-6 w-full lg:w-fit">
                <div className="flex flex-col text-center gap-4 bg-main p-6 lg:p-8 rounded-3xl border border-line shadow-sm shrink-0 w-full lg:w-fit lg:sticky lg:top-8">
                    <div className="relative self-center">
                        <UserAvatar user={user} className="w-32 h-32 lg:w-64 lg:h-64 border-4 border-line p-1 bg-main" />
                        {lastSeenAt + 5 * 60 * 1000 >= now ? (
                            <div className="absolute bottom-2 right-2 lg:bottom-6 lg:right-6 w-6 h-6 lg:w-8 lg:h-8 bg-green-500 rounded-full border-4 border-line shadow-sm" title={t("userProfile.status.online")}></div>
                        ) : (
                            <div className="absolute bottom-2 right-2 lg:bottom-6 lg:right-6 w-6 h-6 lg:w-8 lg:h-8 bg-red-500 rounded-full border-4 border-line shadow-sm" title={t("userProfile.status.offline")}></div>
                        )}
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-center gap-2">
                            <h1 className="text-3xl font-black text-content tracking-tight leading-none">{user.username}</h1>
                            {user.role === 'admin' && (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-600 shadow-sm" title={t("userProfile.admin")}>
                                    <ShieldCheck size={12} className="fill-amber-500/10" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Admin</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-row flex-wrap lg:flex-col gap-2 justify-center items-center">
                            {user.type === "friend" && 'friend_since' in user ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/5 border border-brand/10 rounded-xl">
                                    <Users size={12} className="text-brand" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand">{t("userProfile.status.friendSince", { date: new Date(user.friend_since).toLocaleDateString() })}</span>
                                </div>
                            ) : user.type === "public" && 'sent_friend_request' in user && user.sent_friend_request ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                    <Users size={12} className="text-amber-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">{t("userProfile.status.sentRequest")}</span>
                                </div>
                            ) : user.type === "public" && 'received_friend_request' in user && user.received_friend_request ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/5 border border-green-500/10 rounded-xl">
                                    <Users size={12} className="text-green-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-500">{t("userProfile.status.receivedRequest")}</span>
                                </div>
                            ) : null}

                            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-line rounded-xl">
                                <Calendar size={12} className="text-content-muted opacity-60" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted opacity-80">{t("userProfile.status.memberSince", { date: new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                        {user.type === "self" ? (
                            <button onClick={() => navigate("/settings")} className="w-full px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                {t("userProfile.actions.editProfile")}
                            </button>
                        ) : user.type === "friend" ? (
                            <div className="flex flex-col gap-3">
                                <Link to={`/chats/${id}`} className="w-full justify-center flex items-center gap-2 px-8 py-3 bg-brand text-content-on-brand rounded-full transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                    <MessageCircle size={18} />
                                    {t("userProfile.actions.message")}
                                </Link>
                                <button onClick={() => removeFriend({ id })} className="w-full justify-center flex items-center gap-2 px-8 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                    <UserMinus size={18} />
                                    {t("userProfile.actions.remove")}
                                </button>
                            </div>
                        ) : user.type === "public" && 'received_friend_request' in user && user.received_friend_request ? (
                            <button onClick={() => acceptFriendRequest({ id })} className="w-full px-8 py-3 bg-green-500 text-content-on-brand rounded-full hover:bg-green-600 transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                {t("userProfile.actions.acceptRequest")}
                            </button>
                        ) : user.type === "public" && 'sent_friend_request' in user && user.sent_friend_request ? (
                            <button onClick={() => cancelFriendRequest({ id })} className="w-full px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                {t("userProfile.actions.cancelRequest")}
                            </button>
                        ) : (
                            <button onClick={() => sendFriendRequest({ id })} className="w-full px-8 py-3 bg-brand text-content-on-brand rounded-full hover:bg-brand/90 transition-all shadow-xl active:scale-95 cursor-pointer font-bold hover:scale-[1.02]">
                                {t("userProfile.actions.sendRequest")}
                            </button>
                        )}
                    </div>

                    {/* Expositor de Badges */}
                    {user.badges && user.badges.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-line">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-content-muted mb-4 opacity-50">{t("userProfile.badges.title")}</p>
                            <div className="flex flex-wrap lg:flex-col gap-3 justify-center lg:items-center bg-surface/50 p-4 rounded-2xl border border-line/50 shadow-inner">
                                {user.badges.map((badge) => {
                                    const earnedDate = new Date(badge.earned_at);
                                    const formattedDate = !isNaN(earnedDate.getTime())
                                        ? earnedDate.toLocaleDateString()
                                        : 'Fecha desconocida';

                                    return (
                                        <div
                                            key={badge.id}
                                            className="group relative flex items-center justify-center w-12 h-12 bg-main border border-line rounded-xl shadow-sm hover:shadow-md active:scale-95 hover:-translate-y-1 transition-all cursor-pointer hover:border-brand/30 focus-within:border-brand/30 outline-hidden"
                                            tabIndex={0}
                                        >
                                            <span className="text-2xl drop-shadow-sm select-none">{badge.icon}</span>

                                            {/* Tooltip Detallado (Hover & Focus) */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-content text-main text-[10px] rounded-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all scale-90 group-hover:scale-100 group-focus-within:scale-100 whitespace-nowrap pointer-events-none z-50 shadow-2xl border border-line flex flex-col gap-0.5 items-center">
                                                <span className="font-black uppercase tracking-tight text-brand">{badge.name}</span>
                                                <span className="opacity-60 font-bold italic">{t("userProfile.badges.earnedOn", { date: formattedDate })}</span>
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-content"></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-main rounded-3xl border border-line shadow-sm p-6 lg:p-8 flex flex-col w-full lg:h-full lg:max-h-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <Star className="w-6 h-6 text-amber-500" fill="currentColor" />
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-content tracking-tight">{t("userProfile.searches.featured")}</h1>
                    </div>

                    {user.type === "self" && (
                        <Link
                            to="/history"
                            className="flex items-center gap-2 px-4 py-2 bg-surface border border-line rounded-2xl text-sm font-bold text-content hover:border-brand hover:text-brand transition-all shadow-sm"
                            onClick={() => window.dispatchEvent(new CustomEvent('flaights:mission:access-search-history'))}
                        >
                            <History size={16} />
                            {t("userProfile.searches.viewHistory")}
                        </Link>
                    )}
                </div>

                {user.type === "public" && !user.public ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-content-muted opacity-70">
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h2 className="text-xl font-bold">{t("userProfile.searches.private")}</h2>
                        <p className="max-w-xs text-center">{t("userProfile.searches.privateDesc", { username: user.username })}</p>
                    </div>
                ) : (
                    <div
                        className="flex-1 lg:overflow-y-auto lg:pr-4 flex flex-col gap-6 custom-scrollbar"
                        onScroll={handleScroll}
                    >
                        {isSearchesLoading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand"></div>
                            </div>
                        ) : searchesData?.pages[0]?.items?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center gap-4 border-2 border-dashed border-line rounded-[2.5rem] bg-surface/30">
                                <div className="p-4 bg-surface border border-line rounded-full shadow-sm">
                                    <Star className="w-8 h-8 text-content-muted opacity-20" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-lg font-bold text-content">{t("userProfile.searches.emptyFeatured")}</h3>
                                    <p className="text-sm text-content-muted max-w-[250px]">
                                        {t("userProfile.searches.emptyFeaturedDesc")}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {searchesData?.pages.map((page, i) => (
                                    <div key={i} className="flex flex-col gap-6">
                                        {page.items.map((search) => (
                                            <SearchCard
                                                key={search._id}
                                                search={search}
                                                isFeatured
                                            >
                                            </SearchCard>
                                        ))}
                                    </div>
                                ))}

                                {isFetchingNextPage && (
                                    <div className="flex justify-center p-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand"></div>
                                    </div>
                                )}

                                {!hasNextPage && (searchesData?.pages[0]?.items?.length ?? 0) > 0 && (
                                    <div className="text-center p-8 text-[10px] text-content-muted/40 uppercase tracking-[0.2em] font-black">
                                        {t("userProfile.searches.end")}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
}
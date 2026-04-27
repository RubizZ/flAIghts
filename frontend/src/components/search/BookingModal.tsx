import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ExternalLink, Plane, AlertCircle, Loader2 } from 'lucide-react';
import type { BookingResponse, BookingSegment, BookingOption } from '@/api/generated/openapi/model';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingData: BookingResponse | null;
    outboundSegmentsCount: number;
    isLoading: boolean;
    error: any;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, bookingData, outboundSegmentsCount, isLoading, error }) => {
    const { t } = useTranslation();
    const backdropMouseDown = useRef(false);

    if (!isOpen) return null;

    const handleOptionClick = (option: BookingOption) => {
        if (!option.url) return;

        if (option.post_data) {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = option.url;
            form.target = '_blank';

            const params = new URLSearchParams(option.post_data);
            params.forEach((value, key) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        } else {
            window.open(option.url, '_blank');
        }
    };

    return (
        <div
            className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) backdropMouseDown.current = true;
            }}
            onMouseUp={(e) => {
                if (e.target === e.currentTarget && backdropMouseDown.current) {
                    onClose();
                }
                backdropMouseDown.current = false;
            }}
        >
            <div className="relative w-full max-w-2xl max-h-[90svh] overflow-hidden rounded-[2.5rem] border border-white/10 bg-gray-950 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col animate-in zoom-in duration-300">

                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">{t('booking.title')}</h2>
                        <p className="text-gray-400 text-sm mt-1 font-medium">{t('booking.subtitle')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 text-brand animate-spin" />
                            <p className="text-white font-bold animate-pulse">{t('booking.loading')}</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                            <AlertCircle className="w-12 h-12 text-rose-500" />
                            <p className="text-white font-bold">{t('booking.error')}</p>
                        </div>
                    ) : bookingData?.segments.map((segment, idx) => {
                        const isReturn = idx >= outboundSegmentsCount;
                        const isFirstOfGroup = idx === 0 || idx === outboundSegmentsCount;
                        const returnSegmentsCount = (bookingData?.segments.length || 0) - outboundSegmentsCount;
                        const hasMultipleInGroup = !isReturn ? outboundSegmentsCount > 1 : returnSegmentsCount > 1;

                        return (
                            <div key={idx} className="mb-10 last:mb-0">
                                {isFirstOfGroup && (bookingData?.segments.length || 0) > 1 && (
                                    <div className="flex flex-wrap items-center gap-3 mb-6">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${!isReturn ? 'bg-brand/20 text-brand border border-brand/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]'}`}>
                                            {!isReturn ? t('common.outbound') : t('common.return')}
                                        </div>
                                        {hasMultipleInGroup && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-in fade-in slide-in-from-left-2 duration-500">
                                                <AlertCircle size={12} className="animate-pulse" />
                                                <span className="text-[10px] font-bold">{t('booking.multipleSegmentsWarning')}</span>
                                            </div>
                                        )}
                                        <div className="h-px flex-1 min-w-[20px] bg-linear-to-r from-white/10 to-transparent" />
                                    </div>
                                )}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${!isReturn ? 'bg-brand/20 text-brand' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                        <Plane size={18} className={isReturn ? "rotate-[135deg]" : "-rotate-45"} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">
                                        {t('booking.segmentTitle', { origin: segment.origin, destination: segment.destination })}
                                    </h3>
                                </div>

                            <div className="grid gap-3">
                                {segment.options.length > 0 ? segment.options.map((option, optIdx) => (
                                    <button
                                        key={optIdx}
                                        onClick={() => handleOptionClick(option)}
                                        className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-brand/50 hover:bg-white/10 transition-all duration-300 text-left cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="z-10 flex items-center gap-4 flex-1">
                                            {option.logo ? (
                                                <div className="h-12 w-12 rounded-xl bg-white p-2 flex items-center justify-center shrink-0 shadow-sm overflow-hidden border border-white/5">
                                                    <img
                                                        src={option.logo}
                                                        alt={option.name}
                                                        className="h-full w-full object-contain"
                                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                                    <Plane size={24} className="text-white/20" />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-black text-lg group-hover:text-brand transition-colors truncate">
                                                    {option.name}
                                                </p>
                                                {option.extensions && option.extensions.length > 0 ? (
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                                        {option.extensions.map((ext, ext_idx) => (
                                                            <span key={ext_idx} className="text-[10px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-1">
                                                                <span className="w-1 h-1 rounded-full bg-brand/40" />
                                                                {ext}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-400 text-xs font-medium">
                                                        {option.post_data ? t('booking.postNotice') : t('booking.go')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 sm:mt-0 flex items-center gap-4 z-10 w-full sm:w-auto justify-between">
                                            {option.price && (
                                                <span className="text-2xl font-black text-brand">
                                                    {option.price}€
                                                </span>
                                            )}
                                            <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                                                <ExternalLink size={18} />
                                            </div>
                                        </div>

                                        <div className="absolute inset-0 bg-linear-to-r from-brand/0 via-brand/5 to-brand/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    </button>
                                )) : (
                                    <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center text-gray-500 italic">
                                        {t('booking.noOptions')}
                                    </div>
                                )}
                            </div>
                        </div>
                    )})}
                </div>

                {/* Footer Accent */}
                <div className="h-1.5 w-full bg-linear-to-r from-brand to-indigo-600" />
            </div>
        </div>
    );
};

export default BookingModal;

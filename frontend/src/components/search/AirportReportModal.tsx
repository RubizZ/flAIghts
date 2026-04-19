import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useReportAirportError } from "@/api/generated/openapi/airports";
import { AirportResponse } from "@/api/generated/openapi/model";

interface AirportReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    airport: AirportResponse | null;
}

const MIN_CHARS = 5;
const MAX_CHARS = 1000;

export default function AirportReportModal({ isOpen, onClose, airport }: AirportReportModalProps) {
    const [reportReason, setReportReason] = useState("");

    const isTooShort = reportReason.trim().length < MIN_CHARS;

    const { mutate: sendReport, isPending } = useReportAirportError({
        mutation: {
            onSuccess: (data) => {
                toast.success((data as any).message || "¡Gracias! Tu reporte ha sido enviado.");
                setReportReason("");
                onClose();
            },
            onError: (error: any) => {
                toast.error(error?.message || "Error al enviar el reporte. Inténtalo de nuevo.");
            }
        }
    });

    if (!isOpen || !airport) return null;

    const handleSendReport = () => {
        if (isTooShort) {
            toast.error("Por favor, describe el error antes de enviar");
            return;
        }

        sendReport({
            iata: airport.iata_code,
            data: { reason: reportReason }
        });
    };

    const handleCancel = () => {
        if (isPending) return;
        setReportReason("");
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={handleCancel}
        >
            <div
                className="premium-glass w-full max-w-md p-8 rounded-4xl flex flex-col gap-6 shadow-2xl animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-2xl">
                        <AlertTriangle className="text-red-500" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-content">Reportar error</h2>
                        <p className="text-content-muted text-sm">Ayúdanos a mejorar los datos de {airport.iata_code}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-main/50 p-4 rounded-2xl border border-line">
                        <div className="text-[10px] text-content-muted uppercase font-bold tracking-wider mb-1">Aeropuerto seleccionado</div>
                        <div className="text-content font-bold">{airport.name} ({airport.iata_code})</div>
                        <div className="text-content-muted text-xs">{airport.city}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-content-muted ml-1">Descripción del error</label>
                        <textarea
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="Ej: El nombre está mal escrito, la ubicación es incorrecta o es una base militar..."
                            className="w-full h-32 px-4 py-3 bg-main/50 border border-line rounded-2xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all text-sm resize-none text-content"
                            maxLength={MAX_CHARS}
                            autoFocus
                        />
                        <div className="flex justify-end px-1">
                            <span className={`text-[10px] font-bold ${isTooShort ? 'text-red-500' : 'text-content-muted'}`}>
                                {reportReason.length} / {MAX_CHARS} {isTooShort && `(mínimo ${MIN_CHARS})`}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleCancel}
                        className="flex-1 py-3 bg-surface border border-line text-content font-bold rounded-2xl hover:bg-surface/80 transition-all cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSendReport}
                        disabled={isPending || isTooShort}
                        className="flex-1 py-3 bg-brand text-content-on-brand font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isPending ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Enviando...</span>
                            </>
                        ) : (
                            "Enviar reporte"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

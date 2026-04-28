import Skeleton from "../ui/Skeleton";

export default function FlightCardSkeleton() {
    return (
        <div className="bg-main/80 dark:bg-main/60 backdrop-blur-xl border border-line rounded-2xl shadow-lg p-5 overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                {/* Route Info Skeleton */}
                <div className="flex flex-1 items-center gap-4 w-full">
                    <div className="flex flex-col gap-2 flex-1">
                        <Skeleton height={20} width="60%" />
                        <Skeleton height={14} width="40%" className="opacity-60" />
                    </div>
                    
                    <div className="flex flex-col items-center gap-1 mx-4">
                        <Skeleton height={12} width={60} />
                        <div className="w-24 h-px bg-line/50 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-line" />
                        </div>
                        <Skeleton height={10} width={40} className="opacity-40" />
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-1">
                        <Skeleton height={20} width="60%" />
                        <Skeleton height={14} width="40%" className="opacity-60" />
                    </div>
                </div>

                {/* Price & Action Skeleton */}
                <div className="flex flex-col items-center sm:items-end justify-center px-8 border-t sm:border-t-0 sm:border-l border-line/20 py-4 sm:py-0 w-full sm:w-auto min-w-[140px]">
                    <Skeleton height={10} width={60} className="mb-2 opacity-40" />
                    <Skeleton height={32} width={80} className="mb-3" />
                    <Skeleton height={36} width={100} borderRadius="12px" />
                </div>
            </div>
        </div>
    );
}

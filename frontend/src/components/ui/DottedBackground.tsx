interface DottedBackgroundProps {
    className?: string; // Para personalización extra
}

export default function DottedBackground({ className = "" }: DottedBackgroundProps) {
    return (
        <div className={`absolute inset-0 pointer-events-none ${className}`}>
            {/* Dots Pattern */}
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                    backgroundSize: '16px 16px'
                }}
            />
        </div>
    );
}

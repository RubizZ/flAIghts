import React from "react";

interface PlaneBackgroundProps {
    className?: string;
}

export default function PlaneBackground({ className = "" }: PlaneBackgroundProps) {
    const planeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-20 -20 64 64" fill="currentColor" stroke="none"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;

    const encodedPlane = encodeURIComponent(planeIcon).replace(/'/g, "%27").replace(/"/g, "%22");

    return (
        <div className={`absolute inset-0 pointer-events-none text-primary ${className}`}>
            <div
                className="absolute inset-0 bg-current transition-opacity duration-300 opacity-5"
                style={{
                    maskImage: `url("data:image/svg+xml;charset=utf-8,${encodedPlane}")`,
                    WebkitMaskImage: `url("data:image/svg+xml;charset=utf-8,${encodedPlane}")`,
                    maskSize: '40px 40px',
                    WebkitMaskSize: '40px 40px',
                    maskRepeat: 'space',
                    WebkitMaskRepeat: 'space'
                }}
            />
        </div>
    );
}

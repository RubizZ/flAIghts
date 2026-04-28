import React from "react";

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = "", width, height, borderRadius }) => {
    return (
        <div 
            className={`skeleton ${className}`}
            style={{ 
                width: width, 
                height: height,
                borderRadius: borderRadius
            }}
        />
    );
};

export default Skeleton;

export default function StarsBackground({ className = "" }: { className?: string }) {
    return (
        <div className={`absolute inset-0 overflow-hidden z-0 ${className}`}>
            <div className="absolute inset-0 bg-gradient-radial from-[#1B2735] to-[#090A0F]" />
            <div className="stars"></div>
            <div className="stars2"></div>
            <div className="stars3"></div>
            <style>
                {`
                @keyframes space-drift {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-2000px); }
                }

                .stars, .stars2, .stars3 {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                }

                .stars {
                    background: transparent url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><circle cx='20' cy='20' r='1.5' fill='white' opacity='0.8'/><circle cx='120' cy='80' r='1' fill='white' opacity='0.6'/><circle cx='80' cy='150' r='1.5' fill='white' opacity='0.5'/><circle cx='180' cy='30' r='0.5' fill='white' opacity='0.8'/><circle cx='40' cy='180' r='1' fill='white' opacity='0.7'/></svg>") repeat;
                    animation: space-drift 100s linear infinite;
                }

                .stars2 {
                    background: transparent url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><circle cx='40' cy='50' r='1' fill='white' opacity='0.4'/><circle cx='220' cy='180' r='2' fill='white' opacity='0.5'/><circle cx='180' cy='250' r='1.5' fill='white' opacity='0.3'/><circle cx='280' cy='80' r='1' fill='white' opacity='0.6'/><circle cx='100' cy='280' r='1.5' fill='white' opacity='0.4'/></svg>") repeat;
                    animation: space-drift 150s linear infinite;
                }

                .stars3 {
                    background: transparent url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><circle cx='80' cy='100' r='2' fill='white' opacity='0.3'/><circle cx='320' cy='280' r='2.5' fill='white' opacity='0.4'/><circle cx='280' cy='350' r='1' fill='white' opacity='0.2'/><circle cx='380' cy='130' r='1.5' fill='white' opacity='0.3'/><circle cx='140' cy='380' r='2' fill='white' opacity='0.4'/></svg>") repeat;
                    animation: space-drift 200s linear infinite;
                }
                `}
            </style>
        </div>
    );
}

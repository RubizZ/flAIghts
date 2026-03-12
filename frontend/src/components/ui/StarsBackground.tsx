export default function StarsBackground({ className = "" }: { className?: string }) {
    return (
        <div className={`absolute inset-0 overflow-hidden z-0 ${className}`}>
            {/* Light Mode Gradient - Vibrant Sky */}
            <div className="absolute inset-0 bg-linear-to-br from-[#bae6fd] via-[#e0f2fe] to-[#f0f9ff] dark:hidden" />
            
            {/* Dark Mode Gradient - Deep Interstellar */}
            <div className="absolute inset-0 hidden dark:block bg-gradient-radial from-[#1e1b4b] via-[#0f172a] to-[#020617]" />
            
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

                /* Default (Light Mode) - Denser Indigo dots */
                .stars {
                    background: transparent url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><circle cx='20' cy='20' r='1.5' fill='%234338ca' opacity='0.3'/><circle cx='120' cy='80' r='1' fill='%234338ca' opacity='0.2'/><circle cx='80' cy='150' r='1.5' fill='%234338ca' opacity='0.15'/><circle cx='180' cy='30' r='0.5' fill='%234338ca' opacity='0.3'/><circle cx='40' cy='180' r='1' fill='%234338ca' opacity='0.25'/><circle cx='150' cy='10' r='1.2' fill='%234338ca' opacity='0.2'/><circle cx='10' cy='100' r='0.8' fill='%234338ca' opacity='0.3'/><circle cx='190' cy='160' r='1.4' fill='%234338ca' opacity='0.15'/></svg>") repeat;
                    animation: space-drift 100s linear infinite;
                }

                .stars2 {
                    background: transparent url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><circle cx='40' cy='50' r='1' fill='%234338ca' opacity='0.2'/><circle cx='220' cy='180' r='2' fill='%234338ca' opacity='0.25'/><circle cx='180' cy='250' r='1.5' fill='%234338ca' opacity='0.15'/><circle cx='280' cy='80' r='1' fill='%234338ca' opacity='0.25'/><circle cx='100' cy='280' r='1.5' fill='%234338ca' opacity='0.2'/><circle cx='20' cy='220' r='1.2' fill='%234338ca' opacity='0.15'/><circle cx='250' cy='40' r='1.8' fill='%234338ca' opacity='0.2'/><circle cx='150' cy='130' r='1' fill='%234338ca' opacity='0.3'/></svg>") repeat;
                    animation: space-drift 150s linear infinite;
                }

                .stars3 {
                    background: transparent url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><circle cx='80' cy='100' r='2' fill='%234338ca' opacity='0.15'/><circle cx='320' cy='280' r='2.5' fill='%234338ca' opacity='0.2'/><circle cx='280' cy='350' r='1' fill='%234338ca' opacity='0.1'/><circle cx='380' cy='130' r='1.5' fill='%234338ca' opacity='0.15'/><circle cx='140' cy='380' r='2' fill='%234338ca' opacity='0.2'/><circle cx='50' cy='50' r='1.5' fill='%234338ca' opacity='0.1'/><circle cx='200' cy='200' r='2.2' fill='%234338ca' opacity='0.15'/><circle cx='350' cy='20' r='1.8' fill='%234338ca' opacity='0.12'/></svg>") repeat;
                    animation: space-drift 200s linear infinite;
                }

                /* Dark Mode Overrides - Denser stars */
                .dark .stars {
                    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><circle cx='20' cy='20' r='1.5' fill='white' opacity='0.8'/><circle cx='120' cy='80' r='1' fill='white' opacity='0.6'/><circle cx='80' cy='150' r='1.5' fill='white' opacity='0.5'/><circle cx='180' cy='30' r='0.5' fill='white' opacity='0.8'/><circle cx='40' cy='180' r='1' fill='white' opacity='0.7'/><circle cx='150' cy='10' r='1.2' fill='white' opacity='0.6'/><circle cx='10' cy='100' r='0.8' fill='white' opacity='0.8'/><circle cx='190' cy='160' r='1.4' fill='white' opacity='0.5'/></svg>");
                }

                .dark .stars2 {
                    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><circle cx='40' cy='50' r='1' fill='white' opacity='0.4'/><circle cx='220' cy='180' r='2' fill='white' opacity='0.5'/><circle cx='180' cy='250' r='1.5' fill='white' opacity='0.3'/><circle cx='280' cy='80' r='1' fill='white' opacity='0.6'/><circle cx='100' cy='280' r='1.5' fill='white' opacity='0.4'/><circle cx='20' cy='220' r='1.2' fill='white' opacity='0.5'/><circle cx='250' cy='40' r='1.8' fill='white' opacity='0.3'/><circle cx='150' cy='130' r='1' fill='white' opacity='0.6'/></svg>");
                }

                .dark .stars3 {
                    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><circle cx='80' cy='100' r='2' fill='white' opacity='0.3'/><circle cx='320' cy='280' r='2.5' fill='white' opacity='0.4'/><circle cx='280' cy='350' r='1' fill='white' opacity='0.2'/><circle cx='380' cy='130' r='1.5' fill='white' opacity='0.3'/><circle cx='140' cy='380' r='2' fill='white' opacity='0.4'/><circle cx='50' cy='50' r='1.5' fill='white' opacity='0.3'/><circle cx='200' cy='200' r='2.2' fill='white' opacity='0.4'/><circle cx='350' cy='20' r='1.8' fill='white' opacity='0.2'/></svg>");
                }
                `}
            </style>
        </div>
    );
}

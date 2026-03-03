import { useState } from "react";
import Globe from "./Globe.tsx"
import { ArrowLeftRight, Plus } from "lucide-react";

function SearchFlight() {
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");

    const handleSwitch = () => {
        const temp = origin;
        setOrigin(destination);
        setDestination(temp);
    }

    const handleMapSelect = (iata: string) => {
        if (!origin) {
            setOrigin(iata);
        } else if (!destination && origin !== iata) {
            setDestination(iata);
        } else {
            setOrigin(iata);
            setDestination("");
        }
    }

    return (
        <div className='flex flex-col items-center justify-center gap-5'>
            <div className='flex items-center justify-center gap-5 mt-5'>
                <div className='flex flex-col gap-2.5'>
                    <input
                        type="text"
                        placeholder="Origin"
                        className='border border-themed bg-primary text-primary px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-accent'
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                        maxLength={3}
                    />
                    <input
                        type="date"
                        placeholder="Date"
                        className='border border-themed bg-primary text-primary px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-accent'
                    />
                </div>
                <button
                    onClick={handleSwitch}
                    className="hover:bg-secondary text-primary p-2 rounded-full transition cursor-pointer"
                >
                    <ArrowLeftRight />
                </button>
                <div className='flex flex-col gap-2.5'>
                    <input
                        type="text"
                        placeholder="Destination"
                        className='border border-themed bg-primary text-primary px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-accent'
                        value={destination}
                        onChange={(e) => setDestination(e.target.value.toUpperCase())}
                        maxLength={3}
                    />
                    <input
                        type="date"
                        placeholder="Date"
                        className='border border-themed bg-primary text-primary px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-accent'
                    />
                </div>
                <div className='flex flex-col gap-3 items-center justify-center'>
                    <select
                        className='border border-themed bg-primary text-primary hover:bg-secondary rounded-full px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent'
                        defaultValue="roundTrip"
                    >
                        <option value="oneWay">One way</option>
                        <option value="roundTrip">Round trip</option>
                    </select>
                    <div className='flex items-center justify-center gap-1.5 text-primary'>
                        <button className="border border-themed rounded-full hover:bg-secondary cursor-pointer p-0.5">
                            <Plus />
                        </button>
                        Add stop
                    </div>
                </div>
            </div>
            <Globe
                onAirportSelect={handleMapSelect}
                selectedAirports={[origin, destination]}
            />
            <button className='border border-themed bg-accent text-on-accent hover:bg-accent-hover rounded-full px-5 py-2 cursor-pointer font-medium transition'>
                Buscar vuelos
            </button>
        </div>
    )
}

export default SearchFlight;
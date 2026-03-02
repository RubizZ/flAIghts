import { useState } from "react";
import Globe from "./Globe.tsx"
import { ArrowLeftRight, Plus } from "lucide-react";
import AirportAutocomplete from "./AirportAutocomplete.tsx";
import { useSearchRequest } from "@/api/generated/search/search";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function SearchFlight() {
    const [origin, setOrigin] = useState("");
    const [destination, setDestination] = useState("");
    const [departureDate, setDepartureDate] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [tripType, setTripType] = useState("roundTrip");

    const navigate = useNavigate();
    const { mutate: searchRequest, isPending } = useSearchRequest();

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

    const handleSearch = () => {
        if (!origin || !destination || !departureDate) {
            toast.error("Por favor, completa origen, destino y fecha de salida");
            return;
        }

        const requestData = {
            origins: [origin],
            destinations: [destination],
            criteria: {
                priority: "balanced" as const,
            },
            // Searches created by anonymous users must be shared to be retrieved later by URL
            shared: true,
            departure_date: departureDate,
            // Ensure we only send return_date if it's a round trip and the date is not empty
            return_date: (tripType === "roundTrip" && returnDate) ? returnDate : undefined,
        };

        searchRequest({
            data: requestData
        }, {
            onSuccess: (response) => {
                // The react-query mutator from Orval likely unwraps the server response.
                // `response` is the actual search object, not the full Axios response.
                const searchId = response.id;
                if (!searchId) {
                    console.error("Error: searchId not found in the response.", response);
                    toast.error("La respuesta del servidor no contenía un ID de búsqueda.");
                    return;
                }
                toast.success("Búsqueda iniciada");
                navigate(`/search/${searchId}`);
            },
            onError: (error) => {
                console.error(error);
                toast.error("Error al buscar vuelos");
            }
        });
    }

    return (
        <div className='flex flex-col items-center justify-center gap-5'>
            <div className='flex items-center justify-center gap-5 mt-5'>
                <div className='flex flex-col gap-2.5'>
                    <AirportAutocomplete
                        placeholder="Origin"
                        className='border border-themed bg-primary text-primary px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-accent'
                        value={origin}
                        onChange={setOrigin}
                    />
                    <input
                        type="date"
                        placeholder="Date"
                        className='border border-themed bg-primary text-primary px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-accent'
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleSwitch}
                    className="hover:bg-secondary text-primary p-2 rounded-full transition cursor-pointer"
                >
                    <ArrowLeftRight />
                </button>
                <div className='flex flex-col gap-2.5'>
                    <AirportAutocomplete
                        placeholder="Destination"
                        className='border border-themed bg-primary text-primary px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-accent'
                        value={destination}
                        onChange={setDestination}
                    />
                    <input
                        type="date"
                        placeholder="Date"
                        className='border border-themed bg-primary text-primary px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-accent'
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        disabled={tripType === "oneWay"}
                    />
                </div>
                <div className='flex flex-col gap-3 items-center justify-center'>
                    <select
                        className='border border-themed bg-primary text-primary hover:bg-secondary rounded-full px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent'
                        value={tripType}
                        onChange={(e) => setTripType(e.target.value)}
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
            <button 
                onClick={handleSearch}
                disabled={isPending}
                className='border border-themed bg-accent text-on-accent hover:bg-accent-hover rounded-full px-5 py-2 cursor-pointer font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
            >
                {isPending ? "Buscando..." : "Buscar vuelos"}
            </button>
        </div>
    )
}

export default SearchFlight;
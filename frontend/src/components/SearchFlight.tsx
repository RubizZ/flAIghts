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

    const { mutate: searchRequest, isPending } = useSearchRequest({
        mutation: {
            onSuccess: (data) => {
                // Axios unwraps the response, so data is already the response body
                toast.success("Búsqueda iniciada");
                navigate(`/search/${data._id}`);
            },
            onError: (error) => {
                console.error(error);
                toast.error(error?.message || "Error al buscar vuelos");
            }
        }
    });

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
            departure_date: departureDate,
            // Ensure we only send return_date if it's a round trip and the date is not empty
            return_date: (tripType === "roundTrip" && returnDate) ? returnDate : undefined,
        };

        searchRequest({
            data: requestData
        });
    }

    return (
        <div className='flex flex-col items-center justify-center gap-5 w-full overflow-x-hidden'>
            <div className='flex flex-wrap items-center justify-center gap-3 sm:gap-5 mt-5 px-4 w-full'>
                <div className='flex flex-col gap-2.5'>
                    <AirportAutocomplete
                        placeholder="Origin"
                        className='border border-line bg-main text-content px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-brand'
                        value={origin}
                        onChange={setOrigin}
                    />
                    <input
                        type="date"
                        placeholder="Date"
                        className='border border-line bg-main text-content px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-brand'
                        value={departureDate}
                        onChange={(e) => setDepartureDate(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleSwitch}
                    className="hover:bg-surface text-content p-2 rounded-full transition cursor-pointer"
                >
                    <ArrowLeftRight />
                </button>
                <div className='flex flex-col gap-2.5'>
                    <AirportAutocomplete
                        placeholder="Destination"
                        className='border border-line bg-main text-content px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-brand'
                        value={destination}
                        onChange={setDestination}
                    />
                    <input
                        type="date"
                        placeholder="Date"
                        className='border border-line bg-main text-content px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-brand'
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        disabled={tripType === "oneWay"}
                    />
                </div>
                <div className='flex flex-col gap-3 items-center justify-center'>
                    <select
                        className='border border-line bg-main text-content hover:bg-surface rounded-full px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand'
                        value={tripType}
                        onChange={(e) => setTripType(e.target.value)}
                    >
                        <option value="oneWay">One way</option>
                        <option value="roundTrip">Round trip</option>
                    </select>
                    <div className='flex items-center justify-center gap-1.5 text-content'>
                        <button className="border border-line rounded-full hover:bg-surface cursor-pointer p-0.5">
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
                className='border border-line bg-brand text-content-on-brand hover:bg-brand-hover rounded-full px-5 py-2 cursor-pointer font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
            >
                {isPending ? "Buscando..." : "Buscar vuelos"}
            </button>
        </div>
    )
}

export default SearchFlight;
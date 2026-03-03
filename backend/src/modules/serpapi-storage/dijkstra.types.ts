export interface DijkstraFlightEdge {
    id: string; // booking_token o un ID único
    from: string;           
    to: string;             
    price: number;          
    duration: number;       
    stops: number;   
    date: string; //YYYY-MM-DD
    airline: string;
    airline_logo?: string;
    departure_time: string;
    arrival_time: string;
}
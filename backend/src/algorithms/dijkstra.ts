import { singleton } from "tsyringe";
import { PriorityQueue } from "../structures/priority-queue.js";

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

@singleton()
export class Dijkstra {
    public findPath(
        inicio: string,
        fin: string,
        edges: DijkstraFlightEdge[],
        priority: "balanced" | "cheap" | "fast"
    ): DijkstraFlightEdge[] | null {
        
        const distancias: Record<string, number> = {};
        const prevEdge: Record<string, DijkstraFlightEdge | null> = {};
        const arrivalTimes: Record<string, Date> = {};
        const pq = new PriorityQueue<string>();

        const nodos = new Set<string>();
        edges.forEach(e => {
            nodos.add(e.from);
            nodos.add(e.to);
        });
        const adjacencyList = new Map<string, DijkstraFlightEdge[]>();

        for (const edge of edges) {
            if (!adjacencyList.has(edge.from)) {
                adjacencyList.set(edge.from, []);
            }

            adjacencyList.get(edge.from)!.push(edge);
        }

        for (const nodo of nodos) {
            distancias[nodo] = Infinity;
            prevEdge[nodo] = null;
            arrivalTimes[nodo] = new Date(-8640000000000000);
        }

        if (!nodos.has(inicio)) return null;

        distancias[inicio] = 0;
        arrivalTimes[inicio] = new Date(-8640000000000000);
        pq.enqueue(inicio, 0);

        while (!pq.isEmpty()) {
            const u = pq.dequeue();
            if (!u || u === fin) break;

            const aristasVecinas = adjacencyList.get(u) || [];

            for (const edge of aristasVecinas) {
                const departureDate = parseEdgeDateTime(edge.departure_time);
                if (arrivalTimes[u]! > departureDate) {
                    continue;
                }

                const waitMinutes = Math.max(0, departureDate.getTime() - arrivalTimes[u]!.getTime()) / 60000;
                const weight = this.calculateWeight(edge, waitMinutes, priority);
                const alt = distancias[u]! + weight;

                if (alt < distancias[edge.to]!) {
                    distancias[edge.to] = alt;
                    prevEdge[edge.to] = edge;
                    arrivalTimes[edge.to] = parseEdgeDateTime(edge.arrival_time);
                    pq.enqueue(edge.to, alt);
                }
            }
        }

        return this.reconstructPath(prevEdge, fin);
    }

    private calculateWeight(edge: DijkstraFlightEdge, waitMinutes: number, priority: "cheap" | "fast" | "balanced"): number {
        switch (priority) {
            case "cheap":
                return edge.price;
            case "fast":
                return edge.duration;
            case "balanced":
                return edge.price + (edge.duration / 10);
            default:
                return edge.price;
        }
    }

    private reconstructPath(
        prevEdge: Record<string, DijkstraFlightEdge | null>, 
        target: string
    ): DijkstraFlightEdge[] | null {
        const path: DijkstraFlightEdge[] = [];
        let curr: string | null = target;
        while (curr !== null && prevEdge[curr] !== null) {
            const edge: DijkstraFlightEdge = prevEdge[curr]!; 
            
            path.unshift(edge);
            curr = edge.from;
        }

        return path.length > 0 ? path : null;
    }
}

export function parseEdgeDateTime(input: string): Date {
    let normalized = input;
    if (input.includes(" ") && !input.includes("T")) {
        normalized = input.replace(" ", "T");
    }
    return new Date(normalized);
}
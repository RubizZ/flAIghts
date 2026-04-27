import { singleton, inject } from "tsyringe";
import { Dijkstra, type DijkstraFlightEdge, type RoutePreferences, type WeightCriteria, parseEdgeDateTime } from "./dijkstra.js";

@singleton()
export class Yen {
    constructor(@inject(Dijkstra) private readonly dijkstra: Dijkstra) { }

    /**
     * Encuentra las K rutas simples más cortas entre un origen y un destino.
     */
    public findKPaths(
        start: string,
        end: string,
        edges: DijkstraFlightEdge[],
        k: number,
        criteria: WeightCriteria,
        preferences: RoutePreferences,
        previousArrival?: Date
    ): DijkstraFlightEdge[][] {
        const A: DijkstraFlightEdge[][] = [];
        const B: { path: DijkstraFlightEdge[]; weight: number }[] = [];

        const firstPath = this.dijkstra.findPath(start, end, edges, preferences, {
            criteria,
            previousArrival
        });

        if (!firstPath) {
            return [];
        }

        A.push(firstPath);

        for (let i = 1; i < k; i++) {
            const lastPath = A[i - 1]!;

            for (let j = 0; j < lastPath.length; j++) {
                const spurNode = lastPath[j]?.from;
                if (!spurNode) continue;
                
                const rootPath = lastPath.slice(0, j);

                const deletedEdges = new Set<string>();
                const deletedNodes = new Set<string>();

                for (const path of A) {
                    if (this.isPrefix(rootPath, path.slice(0, j)) && path.length > j) {
                        deletedEdges.add(path[j]!.id);
                    }
                }

                for (const edge of rootPath) {
                    if (edge.from !== spurNode) {
                        deletedNodes.add(edge.from);
                    }
                }

                let spurArrival = previousArrival;
                if (rootPath.length > 0) {
                    spurArrival = parseEdgeDateTime(rootPath[rootPath.length - 1]!.arrival_time);
                }

                const spurPath = this.dijkstra.findPath(spurNode, end, edges, preferences, {
                    deletedEdges,
                    deletedNodes,
                    criteria,
                    previousArrival: spurArrival
                });

                if (spurPath) {
                    const totalPath = [...rootPath, ...spurPath];

                    if (!this.containsPath(A, totalPath) && !this.containsPath(B.map(b => b.path), totalPath)) {
                        const weight = this.calculateTotalPathWeight(totalPath, criteria, preferences, previousArrival);
                        B.push({ path: totalPath, weight });
                    }
                }
            }

            if (B.length === 0) {
                break;
            }

            B.sort((a, b) => a.weight - b.weight);
            const bestCandidate = B.shift()!;
            A.push(bestCandidate.path);
        }

        return A;
    }

    private isPrefix(prefix: DijkstraFlightEdge[], subPath: DijkstraFlightEdge[]): boolean {
        if (prefix.length !== subPath.length) return false;
        for (let i = 0; i < prefix.length; i++) {
            if (prefix[i]!.id !== subPath[i]!.id) return false;
        }
        return true;
    }

    private containsPath(list: DijkstraFlightEdge[][], path: DijkstraFlightEdge[]): boolean {
        return list.some(p =>
            p.length === path.length &&
            p.every((edge, index) => edge.id === path[index]!.id)
        );
    }

    private calculateTotalPathWeight(
        path: DijkstraFlightEdge[],
        criteria: WeightCriteria,
        preferences: RoutePreferences,
        initialArrival?: Date
    ): number {
        let totalWeight = 0;
        let currentArrival = initialArrival;

        for (const edge of path) {
            const departureTime = parseEdgeDateTime(edge.departure_time);
            const waitMinutes = currentArrival
                ? Math.max(0, (departureTime.getTime() - currentArrival.getTime()) / 60000)
                : 0;

            const durationTotal = edge.duration + waitMinutes;

            if (criteria === "price") {
                totalWeight += edge.price;
            } else if (criteria === "duration") {
                totalWeight += durationTotal;
            } else {
                totalWeight += edge.price * preferences.price_weight;
                totalWeight += (durationTotal * 0.1) * preferences.duration_weight;
                totalWeight += (edge.stops * 50) * preferences.stops_weight;
            }

            currentArrival = parseEdgeDateTime(edge.arrival_time);
        }

        return totalWeight || 1; // Evitar 0 por si acaso
    }
}

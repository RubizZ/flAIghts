import { singleton, inject } from "tsyringe";
import { Dijkstra, type DijkstraFlightEdge, type RoutePreferences, type WeightCriteria, parseEdgeDateTime } from "./dijkstra.js";

@singleton()
export class Yen {
    constructor(@inject(Dijkstra) private readonly dijkstra: Dijkstra) { }

    /**
     * Encuentra las K rutas simples más cortas, permitiendo reanudar desde un estado previo.
     */
    public findKPathsWithState(
        start: string,
        end: string,
        edges: DijkstraFlightEdge[],
        k: number,
        criteria: WeightCriteria,
        preferences: RoutePreferences,
        state?: {
            A: DijkstraFlightEdge[][];
            B: { path: DijkstraFlightEdge[]; weight: number }[];
            lastExploredIndex: number;
        },
        previousArrival?: Date
    ): { 
        paths: DijkstraFlightEdge[][]; 
        newState: { 
            A: DijkstraFlightEdge[][]; 
            B: { path: DijkstraFlightEdge[]; weight: number }[]; 
            lastExploredIndex: number; 
        } 
    } {
        const A = state?.A || [];
        const B = state?.B || [];
        let lastExploredIndex = state?.lastExploredIndex ?? 0;

        // Si A está vacío, calculamos la primera ruta
        if (A.length === 0) {
            const firstPath = this.dijkstra.findPath(start, end, edges, preferences, {
                criteria,
                previousArrival
            });

            if (!firstPath) {
                return { paths: [], newState: { A: [], B: [], lastExploredIndex: 0 } };
            }
            A.push(firstPath);
            lastExploredIndex = 0; // Todavía no hemos explorado sus desviaciones
        }

        const initialLength = A.length;
        const targetTotal = initialLength + k;

        // Bucle de Yen
        // Mientras no tengamos suficientes rutas y haya candidatos o rutas para explorar
        while (A.length < targetTotal) {
            // Si hemos explorado todas las rutas actuales en A y no hay más en B, terminamos
            if (lastExploredIndex >= A.length && B.length === 0) break;

            // Explorar desviaciones de la ruta en A[lastExploredIndex]
            if (lastExploredIndex < A.length) {
                const pathToBeExplored = A[lastExploredIndex]!;
                
                for (let j = 0; j < pathToBeExplored.length; j++) {
                    const spurNode = pathToBeExplored[j]?.from;
                    if (!spurNode) continue;
                    
                    const rootPath = pathToBeExplored.slice(0, j);

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
                lastExploredIndex++;
            }

            // Si tenemos candidatos en B, pasamos el mejor a A
            if (B.length > 0) {
                B.sort((a, b) => a.weight - b.weight);
                const bestCandidate = B.shift()!;
                A.push(bestCandidate.path);
            } else if (lastExploredIndex >= A.length) {
                // No hay más candidatos y no hay más rutas que explorar
                break;
            }
        }

        // Retornamos las NUEVAS rutas (las que se añadieron en esta llamada)
        // y el nuevo estado completo
        return {
            paths: A.slice(initialLength),
            newState: { A, B, lastExploredIndex }
        };
    }

    /**
     * @deprecated Use findKPathsWithState for better performance
     */
    public findKPaths(
        start: string,
        end: string,
        edges: DijkstraFlightEdge[],
        k: number,
        criteria: WeightCriteria,
        preferences: RoutePreferences,
        previousArrival?: Date,
        skip: number = 0
    ): DijkstraFlightEdge[][] {
        const result = this.findKPathsWithState(start, end, edges, k + skip, criteria, preferences, undefined, previousArrival);
        return result.newState.A.slice(skip);
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
                totalWeight += edge.price || 1000000;
            } else if (criteria === "duration") {
                totalWeight += durationTotal;
            } else {
                totalWeight += (edge.price || 1000000) * preferences.price_weight;
                totalWeight += (durationTotal * 0.1) * preferences.duration_weight;
                totalWeight += (edge.stops * 50) * preferences.stops_weight;
            }

            currentArrival = parseEdgeDateTime(edge.arrival_time);
        }

        return totalWeight || 1; // Evitar 0 por si acaso
    }
}

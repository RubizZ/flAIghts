import type { DijkstraFlightEdge } from "./dijkstra.js";
import { singleton, inject } from "tsyringe";
import { SerpapiStorageService } from "../modules/serpapi-storage/serpapi-storage.service.js";


export type FlightEdge = Pick<DijkstraFlightEdge, "from" | "to" | "price">;

type Chromosome = string[];

export interface TripResult {
    route: string[];
    cost: number;
}


function toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
}

function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min;
}


@singleton()
export class GeneticTripOptimizer {
    constructor(
        @inject(SerpapiStorageService) private readonly storageService: SerpapiStorageService
    ) { }



    /**
     *
     *
     * @param origin        - IATA code of the home airport
     * @param cities        - List of destination airports to visit
     * @param startDate     - Date of the first flight
     * @param daysPerCity   - Number of days spent in each city
     * @param generations   - Number of GA generations (default 120)
     * @param populationSize - Number of chromosomes (default 60)
     */
    public async findBestTrip(
        origin: string,
        cities: string[],
        startDate: Date,
        daysPerCity: number,
        generations: number = 120,
        populationSize: number = 60
    ): Promise<TripResult> {
        if (cities.length === 0) {
            return { route: [origin, origin], cost: 0 };
        }

        if (cities.length === 1) {
            const date0 = toDateString(startDate);
            const date1 = toDateString(addDays(startDate, daysPerCity));
            const [c0, c1] = await Promise.all([
                this.cheapestFlight(origin, cities[0]!, date0),
                this.cheapestFlight(cities[0]!, origin, date1),
            ]);
            return {
                route: [origin, cities[0]!, origin],
                cost: c0 + c1,
            };
        }
        let population: Chromosome[] = this.initPopulation(cities, populationSize);


        const legDates: string[] = [];
        for (let i = 0; i <= cities.length; i++) {
            legDates.push(toDateString(addDays(startDate, daysPerCity * i)));
        }

        const firstLegPromise = this.storageService.getFlightEdges(
            [origin],
            cities,
            legDates[0]!
        );

        const lastLegPromise = this.storageService.getFlightEdges(
            cities,
            [origin],
            legDates[cities.length]!
        );


        const citiesWithoutFirst = cities.slice(1);
        const firstCityOnly = [cities[0]!];

        const middleLegPromises: Promise<unknown>[] = [];
        for (let i = 1; i < cities.length; i++) {
            const date = legDates[i]!;
            middleLegPromises.push(
                this.storageService.getFlightEdges(cities, citiesWithoutFirst, date)
            );
            middleLegPromises.push(
                this.storageService.getFlightEdges(cities, firstCityOnly, date)
            );
        }

        await Promise.all([firstLegPromise, lastLegPromise, ...middleLegPromises]);
        await Promise.all(
            legDates.map(date => this.storageService.warmUpCache(date))
        );


        for (let gen = 0; gen < generations; gen++) {
            const scored = await Promise.all(
                population.map(async (chrom) => ({
                    chrom,
                    cost: await this.evaluateCost(chrom, origin, startDate, daysPerCity),
                }))
            );

            scored.sort((a, b) => a.cost - b.cost);

            const eliteCount = Math.max(2, Math.floor(populationSize * 0.1));
            const elites = scored.slice(0, eliteCount).map((s) => s.chrom);

            const nextGen: Chromosome[] = [...elites];
            while (nextGen.length < populationSize) {
                const parentA = elites[randInt(0, elites.length)]!;
                const parentB = elites[randInt(0, elites.length)]!;
                let child = this.orderedCrossover(parentA, parentB);
                child = this.swapMutation(child, 0.2);
                nextGen.push(child);
            }

            population = nextGen;
        }

        const finalScored = await Promise.all(
            population.map(async (chrom) => ({
                chrom,
                cost: await this.evaluateCost(chrom, origin, startDate, daysPerCity),
            }))
        );

        finalScored.sort((a, b) => a.cost - b.cost);
        const best = finalScored[0]!;

        return {
            route: [origin, ...best.chrom, origin],
            cost: best.cost,
        };
    }


    private async cheapestFlight(from: string, to: string, date: string): Promise<number> {
        try {
            const edges = await this.storageService.getFlightEdges([from], [to], date);
            const prices = edges.filter((e) => e.from === from && e.to === to).map((e) => e.price);
            return prices.length > 0 ? Math.min(...prices) : Infinity;
        } catch {
            return Infinity;
        }
    }


    private readonly pendingFetches = new Map<string, Promise<void>>();

    private async evaluateCost(
        chromosome: Chromosome,
        origin: string,
        startDate: Date,
        daysPerCity: number
    ): Promise<number> {
        const route = [origin, ...chromosome, origin];
        let total = 0;

        for (let i = 0; i < route.length - 1; i++) {
            const from = route[i]!;
            const to = route[i + 1]!;
            const date = toDateString(addDays(startDate, daysPerCity * i));

            let price = this.storageService.getMinPrice(from, to, date);

            if (price === Infinity) {
                const key = `${from}→${to}@${date}`;
                if (!this.pendingFetches.has(key)) {
                    const fetch = this.storageService
                        .getFlightEdges([from], [to], date)
                        .then(() => { this.pendingFetches.delete(key); })
                        .catch(() => { this.pendingFetches.delete(key); });
                    this.pendingFetches.set(key, fetch);
                }

                try {
                    await this.pendingFetches.get(key)!;
                    price = this.storageService.getMinPrice(from, to, date);
                } catch {
                    price = Infinity;
                }
            }

            total += price;
            if (total === Infinity) break;
        }

        return total;
    }


    private initPopulation(cities: string[], size: number): Chromosome[] {
        const population: Chromosome[] = [];
        for (let i = 0; i < size; i++) {
            population.push(shuffle([...cities]));
        }
        return population;
    }

    private orderedCrossover(parentA: Chromosome, parentB: Chromosome): Chromosome {
        const len = parentA.length;
        const child: (string | null)[] = new Array(len).fill(null);

        const start = randInt(0, len);
        const end = randInt(start + 1, len + 1);

        for (let i = start; i < end; i++) {
            child[i] = parentA[i]!;
        }

        const inChild = new Set<string>(child.filter((c): c is string => c !== null));

        let fillPos = 0;
        for (const city of parentB) {
            if (inChild.has(city)) continue;
            while (child[fillPos] !== null) {
                fillPos++;
                if (fillPos >= len) break;
            }
            if (fillPos >= len) break;
            child[fillPos] = city;
            inChild.add(city);
            fillPos++;
        }

        return child as string[];
    }

    private swapMutation(chromosome: Chromosome, rate: number): Chromosome {
        if (Math.random() >= rate || chromosome.length < 2) return [...chromosome];

        const result = [...chromosome];
        const i = randInt(0, result.length);
        let j = randInt(0, result.length - 1);
        if (j >= i) j++;

        [result[i], result[j]] = [result[j]!, result[i]!];
        return result;
    }
}

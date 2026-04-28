import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import airplaneModelUrl from "@/assets/plane.glb";
import { gsap } from "gsap";
import { PlaneTakeoff, PlaneLanding, X } from "lucide-react";
import { useGetGlobeAirports } from "@/api/generated/openapi/airports";
import type { AirportResponse, CityResponse } from "@/api/generated/openapi/model";
import { UnifiedSelection, isAirport, isCity, getEntityId, getEntityLocation, getEntityName, getAllIatas } from "@/types/selection";
import { useUserLocation } from "@/context/UserLocationContext";
import { useTranslation } from "react-i18next";

interface AirportData {
    iata: string;
    lat: number;
    lon: number;
    name: string;
    city: string;
    country?: string;
}

interface GlobeProps {
    onAirportSelect?: (airport: AirportResponse) => void;
    selectedAirports?: string[];
    origins?: UnifiedSelection[];
    destinations?: UnifiedSelection[];
    interactive?: boolean;
    horizontalOffset?: number;
    onReady?: () => void;
    onSetOrigin?: (entity: UnifiedSelection) => void;
    onSetDestination?: (entity: UnifiedSelection) => void;
    onRemoveEntity?: (entity: UnifiedSelection) => void;
    onAirportClick?: (airport: AirportResponse | null) => void;
    onMovementChange?: (isMoving: boolean, isUserInteracting: boolean) => void;
    focusIata?: string;
    hoveredEntity?: UnifiedSelection | null;
    hoveredType?: 'origin' | 'destination' | null;
    steps?: AirportResponse[][];
}

export default function Globe({
    onAirportSelect,
    selectedAirports = [],
    origins = [],
    destinations = [],
    interactive = false,
    horizontalOffset = 0,
    onReady,
    onSetOrigin,
    onSetDestination,
    onRemoveEntity,
    onAirportClick,
    onMovementChange,
    focusIata,
    hoveredEntity,
    steps = []
}: GlobeProps) {
    const { t } = useTranslation();
    const { location, isLoading: isLocLoading } = useUserLocation();
    const DEBUG_HITBOXES = false;

    // Use a debounced IATA for camera specifically, so rapid hovers don't jitter the globe
    const [debouncedHoveredIata, setDebouncedHoveredIata] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedHoveredIata(hoveredEntity && isAirport(hoveredEntity) ? hoveredEntity.iata_code : null);
        }, 500); // 500ms debounce for camera movement ONLY
        return () => clearTimeout(timer);
    }, [hoveredEntity]);

    const originsIata = useMemo(() => getAllIatas(origins), [origins]);
    const destinationsIata = useMemo(() => getAllIatas(destinations), [destinations]);
    const stepsIata = useMemo(() => (steps || []).map((step: AirportResponse[]) => step.map((s: AirportResponse) => s.iata_code).filter(Boolean) as string[]), [steps]);
    const allStepsIata = useMemo(() => stepsIata.flat(), [stepsIata]);

    const toAirportResponse = (ad: AirportData): AirportResponse => ({
        iata_code: ad.iata,
        name: ad.name,
        city: ad.city,
        country: ad.country,
        location: {
            coordinates: [ad.lon, ad.lat],
            type: "Point"
        }
    } as AirportResponse);
    const mountRef = useRef<HTMLDivElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);
    const originLabelRefs = useRef<(HTMLDivElement | null)[]>([]);
    const destLabelRefs = useRef<(HTMLDivElement | null)[]>([]);
    const hoverLabelRef = useRef<HTMLDivElement | null>(null);
    const contextMenuContainerRef = useRef<HTMLDivElement | null>(null);
    const labelGroupRef = useRef<THREE.Group>(new THREE.Group());
    const clusterTextureCache = useRef<Record<number, THREE.CanvasTexture>>({});
    const zoomDistRef = useRef(3.2);
    const lastClusteredDistRef = useRef(3.2);
    const clusteredDataCacheRef = useRef<Record<string, any>>({});
    const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const airplaneModelRef = useRef<THREE.Group | null>(null);
    const airportsDataRef = useRef<AirportData[]>([]);
    const airportsMap = useRef<Record<string, THREE.Mesh>>({});
    const lastItineraryKeyRef = useRef<string>("");
    const sharedAirportGeo = useRef(new THREE.SphereGeometry(0.0004, 12, 12));
    const sharedCityGeo = useRef(new THREE.SphereGeometry(0.0012, 12, 12));
    const sharedClusterGeo = useRef(new THREE.BoxGeometry(0.002, 0.002, 0.002));
    const arcsGroupRef = useRef<THREE.Group>(new THREE.Group());
    const planesRef = useRef<{
        mesh: THREE.Object3D;
        curve: THREE.Curve<THREE.Vector3>;
        points: THREE.Vector3[];
        lineGroup: THREE.Group;
        lines: THREE.Line[];
        progress: number;
        speed: number;
        totalLength: number;
        isAmbient?: boolean;
        waitDuration: number;
        // Fields for sequential itinerary legs
        currentLayerIndex?: number;
        arrivalIata?: string;
        // Persistent dashed trail for multi-leg itineraries
        persistentGroup?: THREE.Group;
        currentPersistentLine?: THREE.Line | null;
    }[]>([]);

    const sceneRef = useRef<THREE.Scene | null>(null);
    const earthGroupRef = useRef<THREE.Group>(new THREE.Group());
    const countryLabelsGroupRef = useRef<THREE.Group>(new THREE.Group());
    const airportGroupRef = useRef<THREE.Group>(new THREE.Group());
    const fadingOutGroupRef = useRef<THREE.Group>(new THREE.Group());
    const fadingOutLabelsRef = useRef<THREE.Group>(new THREE.Group());
    const starGroupRef = useRef<THREE.Group>(new THREE.Group());
    const shootingStarGroupRef = useRef<THREE.Group>(new THREE.Group());
    const shootingStarsRef = useRef<{
        mesh: THREE.Line | THREE.Group;
        velocity: THREE.Vector3;
        life: number;
        maxLife: number;
        isMeteor?: boolean;
    }[]>([]);
    const solarSystemGroupRef = useRef<THREE.Group>(new THREE.Group());
    const planetsRef = useRef<{
        mesh: THREE.Object3D;
        distance: number;
        speed: number;
        theta: number;
    }[]>([]);
    const moonRef = useRef<THREE.Mesh | null>(null);
    const sunRef = useRef<THREE.Group | null>(null);
    const solarGroupRef = useRef<THREE.Group>(new THREE.Group());
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const activeOriginsRef = useRef<string[]>([]);
    const activeDestsRef = useRef<string[]>([]);
    const activeOriginsEntitiesRef = useRef<UnifiedSelection[]>([]);
    const activeDestsEntitiesRef = useRef<UnifiedSelection[]>([]);
    const stepsIataRef = useRef<string[][]>([]);

    // Zoom control state for smooth stepped interaction
    const ZOOM_STEP = 0.25;
    const zoomAnimationRef = useRef<gsap.core.Tween | null>(null);
    const targetZoomDistRef = useRef<number>(3.25);

    useEffect(() => {
        activeOriginsRef.current = originsIata;
        activeDestsRef.current = destinationsIata;
        activeOriginsEntitiesRef.current = origins;
        activeDestsEntitiesRef.current = destinations;
        stepsIataRef.current = stepsIata;
    }, [originsIata, destinationsIata, origins, destinations, stepsIata]);
    const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2(-999, -999));
    const onSelectRef = useRef(onAirportSelect);
    const selectedAirportsRef = useRef(selectedAirports);
    const currentOffsetRef = useRef({ val: horizontalOffset });
    const homePositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 3.2));
    const onAirportClickRef = useRef(onAirportClick);
    const onMovementChangeRef = useRef(onMovementChange);
    useEffect(() => { onMovementChangeRef.current = onMovementChange; }, [onMovementChange]);
    const hoveredEntityRef = useRef(hoveredEntity);
    useEffect(() => { hoveredEntityRef.current = hoveredEntity; }, [hoveredEntity]);
    const lastCamPosRef = useRef(new THREE.Vector3());

    // Stable key for airports that must NOT be clustered (sorted to ignore order in swaps)
    const forcedAirportsKey = useMemo(() => {
        return [...originsIata, ...destinationsIata, ...allStepsIata, ...selectedAirports, hoveredEntity && isAirport(hoveredEntity) ? hoveredEntity.iata_code : null]
            .filter(Boolean)
            .sort()
            .join(',');
    }, [originsIata, destinationsIata, allStepsIata, selectedAirports, hoveredEntity]);

    const forcedCitiesKey = useMemo(() => {
        return [...origins, ...destinations]
            .filter(isCity)
            .map(getEntityId)
            .sort()
            .join(',');
    }, [origins, destinations]);

    const hoveredEntityId = hoveredEntity ? getEntityId(hoveredEntity) : null;
    const forcedEntitiesKey = `${forcedAirportsKey}|${forcedCitiesKey}|${hoveredEntityId}`;
    const lastCamQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
    const lastMoveTimeRef = useRef(0);
    const isUserInteractingRef = useRef(false);

    // Dynamic distance calculation based on aspect ratio to fit globe on mobile
    const calculateDistance = (w: number, h: number) => {
        const aspect = w / h;
        if (aspect < 1) {
            const raw = 1.8 / (aspect * 0.4142);
            return Math.ceil(raw / ZOOM_STEP) * ZOOM_STEP;
        }
        return 3.25; // Multiple of 0.25
    };

    const [isLoaded, setIsLoaded] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [geoReady, setGeoReady] = useState(false);
    const [initialTransitionDone, setInitialTransitionDone] = useState(false);
    const [clusterThreshold, setClusterThreshold] = useState(0.025);
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        worldPos: THREE.Vector3 | null;
        airport: AirportData | null;
        clusterAirports: AirportData[] | null;
        city: any | null;
    }>({ visible: false, x: 0, y: 0, worldPos: null, airport: null, clusterAirports: null, city: null });
    const contextMenuRefData = useRef(contextMenu);
    useEffect(() => {
        contextMenuRefData.current = contextMenu;
    }, [contextMenu]);
    const isMobileRef = useRef(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

    const { data: globeAirports, isSuccess: isAirportsLoaded } = useGetGlobeAirports({
        query: {
            staleTime: Infinity, // The list of airports is static enough
            refetchOnWindowFocus: false,
        }
    });

    const getThemeColorHex = (varName: string, defaultHex: number): number => {
        const value = typeof window !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(varName).trim() : '';
        if (!value) return defaultHex;
        return parseInt(value.replace('#', '0x'), 16);
    };

    const latLonToVector3 = (lat: number, lon: number, radius: number = 1) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        return new THREE.Vector3(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    };


    class GlobeItem {
        v3: THREE.Vector3;
        iata: string;
        name: string;
        city: string;
        lat: number;
        lon: number;
        country: string;
        airports: any[];
        isCity?: boolean;
        isSpecial: boolean;
        isCluster: boolean;
        stepIdx?: number;
        id: string;
        threshold: number;
        hM: number;

        constructor(data: any, forcedSet: Set<string>, threshold: number, hM: number) {
            this.v3 = data.v3.clone();
            this.iata = data.iata || '';
            this.name = data.name || '';
            this.city = data.city || '';
            this.country = data.country || '';
            this.lat = data.lat;
            this.lon = data.lon;
            this.threshold = threshold;
            this.hM = hM;
            this.airports = data.airports || [];
            this.isCity = !!data.isCity;
            this.isSpecial = forcedSet.has(this.isCity ? data.id : this.iata);
            this.isCluster = !!data.isCluster;
            this.stepIdx = data.stepIdx;
            if (this.isCluster) {
                const sortedIatas = [...this.airports].map(a => a.iata).sort();
                this.id = `c-${sortedIatas.join('-')}`;
            } else if (this.isCity) {
                this.id = data.id;
            } else {
                this.id = this.iata;
            }
        }

        get radius() { return this.threshold * 0.5; }
        collides(other: GlobeItem) {
            const minDist = (this.radius + other.radius) * this.hM;
            return this.v3.distanceTo(other.v3) < minDist;
        }
    }

    const getClusteredAirports = (
        globeAirports: any[],
        threshold: number,
        forcedSet: Set<string>,
        hM: number,
        stepsIata: string[][],
        forcedCities: CityResponse[] = []
    ): GlobeItem[] => {
        // 2. Spatial Grid Class
        class SpatialGrid {
            grid: Map<string, GlobeItem[]>;
            size: number;
            constructor(size: number) {
                this.grid = new Map();
                this.size = size;
            }
            insert(it: GlobeItem) {
                const gx = Math.floor(it.v3.x / this.size);
                const gy = Math.floor(it.v3.y / this.size);
                const gz = Math.floor(it.v3.z / this.size);
                const k = `${gx},${gy},${gz}`;
                if (!this.grid.has(k)) this.grid.set(k, []);
                this.grid.get(k)!.push(it);
            }
            getNeighbors(it: GlobeItem) {
                const res: GlobeItem[] = [];
                const gx = Math.floor(it.v3.x / this.size);
                const gy = Math.floor(it.v3.y / this.size);
                const gz = Math.floor(it.v3.z / this.size);
                for (let x = gx - 1; x <= gx + 1; x++) {
                    for (let y = gy - 1; y <= gy + 1; y++) {
                        for (let z = gz - 1; z <= gz + 1; z++) {
                            const n = this.grid.get(`${x},${y},${z}`);
                            if (n) res.push(...n);
                        }
                    }
                }
                return res;
            }
        }

        const cityAirportIatas = new Set(forcedCities.flatMap(c => c.airports.map(a => a.iata_code)));

        let items = globeAirports
            .filter(a => !cityAirportIatas.has(a.i))
            .sort((a, b) => (a.i || '').localeCompare(b.i || ''))
            .map(a => {
                const sIdx = stepsIata.findIndex(step => step.includes(a.i));
                return new GlobeItem({
                    iata: a.i, lat: a.la, lon: a.lo, name: a.n, city: a.ci, country: a.c,
                    v3: latLonToVector3(a.la, a.lo),
                    stepIdx: sIdx !== -1 ? sIdx : undefined
                }, forcedSet, threshold, hM);
            });

        // Add forced cities to the items list
        const cityItems = forcedCities.map(city => {
            const id = getEntityId(city);
            return new GlobeItem({
                id,
                name: city.name,
                city: city.name,
                lat: city.location.coordinates[1]!,
                lon: city.location.coordinates[0]!,
                country: city.country,
                v3: latLonToVector3(city.location.coordinates[1]!, city.location.coordinates[0]!),
                isCity: true,
                airports: city.airports.map(a => ({ iata: a.iata_code, lat: a.location.coordinates[1], lon: a.location.coordinates[0], name: a.name, city: a.city, country: a.country }))
            }, forcedSet, threshold, hM);
        });

        items = [...items, ...cityItems];

        const assigned = new Set<string>();
        const resultItems: GlobeItem[] = [];
        const mergeGrid = new SpatialGrid(threshold * 1.5 * hM);
        items.forEach(it => { if (!it.isSpecial) mergeGrid.insert(it); });

        items.forEach(it => {
            if (assigned.has(it.id)) return;
            if (it.isSpecial) {
                resultItems.push(it);
                assigned.add(it.id);
                return;
            }
            const clusterMembers: any[] = [{ iata: it.iata, lat: it.lat, lon: it.lon, name: it.name, city: it.city }];
            assigned.add(it.id);
            const neighbors = mergeGrid.getNeighbors(it);
            for (const nb of neighbors) {
                if (!nb.isSpecial && !assigned.has(nb.id) && it.collides(nb)) {
                    clusterMembers.push({ iata: nb.iata, lat: nb.lat, lon: nb.lon, name: nb.name, city: nb.city });
                    assigned.add(nb.id);
                }
            }
            if (clusterMembers.length > 1) {
                const avgLat = clusterMembers.reduce((s, a) => s + a.lat, 0) / clusterMembers.length;
                const avgLon = clusterMembers.reduce((s, a) => s + a.lon, 0) / clusterMembers.length;
                resultItems.push(new GlobeItem({
                    isCluster: true, airports: clusterMembers, lat: avgLat, lon: avgLon, v3: latLonToVector3(avgLat, avgLon)
                }, forcedSet, threshold, hM));
            } else resultItems.push(it);
        });

        items = resultItems;

        // Repulsion Pass
        const vRep = new THREE.Vector3();
        for (let iter = 0; iter < 4; iter++) {
            const grid = new SpatialGrid(threshold * 1.5 * hM);
            items.forEach(it => grid.insert(it));
            for (let i = 0; i < items.length; i++) {
                const a = items[i];
                if (!a) continue;
                const neighbors = grid.getNeighbors(a);
                for (const b of neighbors) {
                    if (a === b || a.id < b.id) continue;
                    const minDist = (a.radius + b.radius) * hM;
                    const d = a.v3.distanceTo(b.v3);
                    if (d < minDist) {
                        const diff = vRep.subVectors(a.v3, b.v3);
                        if (d < 0.0001) diff.set(Math.sin(a.lat), Math.cos(a.lat), Math.sin(a.lon));
                        diff.normalize();
                        const push = minDist - d;
                        if (a.isSpecial && b.isSpecial) {
                            a.v3.addScaledVector(diff, push * 0.5).normalize();
                            b.v3.addScaledVector(diff, -push * 0.5).normalize();
                        } else if (a.isSpecial) b.v3.addScaledVector(diff, -push).normalize();
                        else if (b.isSpecial) a.v3.addScaledVector(diff, push).normalize();
                        else {
                            a.v3.addScaledVector(diff, push * 0.5).normalize();
                            b.v3.addScaledVector(diff, -push * 0.5).normalize();
                        }
                    }
                }
            }
        }
        return items;
    };

    // Update refs for the animation loop to prevent stale closures
    const selectedAirportsSetRef = useRef<Set<string>>(new Set());
    const layoversSetRef = useRef<Set<string>>(new Set());
    const interactiveRef = useRef(interactive);

    const getThemeColorString = (varName: string, defaultVal: string): string => {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || defaultVal;
    };

    const getClusterTexture = (count: number) => {
        if (clusterTextureCache.current[count]) return clusterTextureCache.current[count];

        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const brandColor = getThemeColorString('--color-brand', '#4f46e5');

        // Background circle
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.fillStyle = brandColor;
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count.toString(), size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;
        clusterTextureCache.current[count] = texture;
        return texture;
    };

    const scaleTextureCache = useRef<Record<number, THREE.CanvasTexture>>({});

    const getScaleTexture = (index: number) => {
        if (scaleTextureCache.current[index]) return scaleTextureCache.current[index];

        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // White bold text with a strong shadow for visibility on any background color
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.fillText(index.toString(), size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;
        scaleTextureCache.current[index] = texture;
        return texture;
    };

    const getCountryLabelTexture = (name: string) => {
        const padding = 16;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.font = '500 28px "Inter", sans-serif';
        const metrics = ctx.measureText(name);
        const textWidth = metrics.width;

        canvas.width = textWidth + padding * 2;
        canvas.height = 60;

        const ctx2 = canvas.getContext('2d')!;
        ctx2.clearRect(0, 0, canvas.width, canvas.height);

        // Text styling: slightly soft edges to look like paint/print
        ctx2.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx2.font = '500 28px "Inter", sans-serif';
        ctx2.textAlign = 'center';
        ctx2.textBaseline = 'middle';

        // Subtle drop shadow replaces the blocky background
        ctx2.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx2.shadowBlur = 4;
        ctx2.fillText(name, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 4;
        return texture;
    };

    const trailTextureRef = useRef<THREE.Texture | null>(null);
    const getTrailTexture = () => {
        if (trailTextureRef.current) return trailTextureRef.current;
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        const texture = new THREE.CanvasTexture(canvas);
        trailTextureRef.current = texture;
        return texture;
    };

    useEffect(() => {
        activeOriginsRef.current = originsIata;
        activeDestsRef.current = destinationsIata;
        onSelectRef.current = onAirportSelect;
        onAirportClickRef.current = onAirportClick;
        selectedAirportsRef.current = selectedAirports;
        hoveredEntityRef.current = hoveredEntity;
        const set = new Set(selectedAirports);
        const hoveredIata = hoveredEntity && isAirport(hoveredEntity) ? hoveredEntity.iata_code : null;
        if (hoveredIata) set.add(hoveredIata);
        selectedAirportsSetRef.current = set;
    }, [originsIata, destinationsIata, onAirportSelect, onAirportClick, selectedAirports, hoveredEntity]);

    useEffect(() => {
        interactiveRef.current = interactive;
        if (rendererRef.current && !isUserInteractingRef.current) {
            rendererRef.current.domElement.style.cursor = interactive ? "grab" : "default";
        }
    }, [interactive]);

    // Reusable objects for performance (prevents Garbage Collection lag)
    const _vec1 = new THREE.Vector3();
    const _vec2 = new THREE.Vector3();
    const _vec3 = new THREE.Vector3();
    const _camNorm = new THREE.Vector3();

    const generateFuzzyPoints = (points: THREE.Vector3[], hOff: number, rOff: number, freq: number, phase: number) => {
        return points.map((p, i) => {
            const normal = p.clone().normalize();
            const tangent = i < points.length - 1
                ? points[i + 1]!.clone().sub(p).normalize()
                : p.clone().sub(points[Math.max(0, i - 1)]!).normalize();
            const right = new THREE.Vector3().crossVectors(normal, tangent).normalize();

            const jitterScale = 0.5 + 0.5 * Math.sin(i * freq + phase);
            const res = p.clone();
            res.addScaledVector(normal, hOff * jitterScale);
            res.addScaledVector(right, rOff * (Math.cos(i * freq + phase)));
            return res;
        });
    };

    const cloudsRef = useRef<THREE.Mesh | null>(null);

    // Helper to allow vertex alpha in basic lines using the color attribute
    const patchStelaMaterial = (mat: THREE.LineBasicMaterial) => {
        mat.transparent = true;
        if ((mat as any)._isStelaPatched) return;
        (mat as any)._isStelaPatched = true;
        mat.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <color_fragment>',
                'diffuseColor.a *= vColor.r; '
            );
        };
    };

    // Helper to recursively dispose of Three.js objects
    const disposeObject = (obj: THREE.Object3D) => {
        obj.traverse((child) => {
            if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Sprite || child instanceof THREE.Points) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                        if (m.map) m.map.dispose();
                        m.dispose();
                    });
                } else if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        });
    };

    const rebuildAmbientRoute = (p: any) => {
        const data = airportsDataRef.current;
        if (data.length < 2) return;

        // Pick random and ensure they are different
        let origin = data[Math.floor(Math.random() * data.length)];
        let dest = data[Math.floor(Math.random() * data.length)];
        let attempts = 0;
        while (origin === dest && attempts < 10) {
            dest = data[Math.floor(Math.random() * data.length)];
            attempts++;
        }

        if (!origin || !dest) return;

        const getPos = (iata: string, lat: number, lon: number) => {
            const mesh = airportsMap.current[iata];
            if (mesh) return mesh.position.clone();
            return latLonToVector3(Number(lat), Number(lon));
        };

        const start = getPos(origin.iata, origin.lat, origin.lon);
        const end = getPos(dest.iata, dest.lat, dest.lon);
        const dist = start.distanceTo(end);

        // Sampling
        const samples = Math.max(200, Math.floor(dist * 600));
        const cruiseAltitude = (dist * 0.016);
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const pt = new THREE.Vector3().copy(start).lerp(end, t).normalize();
            const altitude = 1.002 + (Math.sin(Math.PI * t) * cruiseAltitude);
            pt.multiplyScalar(altitude);
            points.push(pt);
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const spacedPoints = curve.getSpacedPoints(samples);

        // Update plane object
        p.curve = curve;
        p.points = spacedPoints;
        p.totalLength = curve.getLength();
        p.speed = (0.001 + Math.random() * 0.001) / (1 + dist * 2);
        p.progress = 0;
        // Absolute wait time grows less aggressively with distance
        const waitBase = 0.2 + Math.pow(Math.random(), 2) * 1.8;
        p.waitDuration = waitBase / (1 + dist * 1.2);

        // Update multiple jittered lines for a fuzzy cloud effect
        p.lines.forEach((line: THREE.Line, i: number) => {
            const h = (i === 0) ? 0 : (i === 1 ? 0.001 : -0.001);
            const r = (i === 0) ? 0 : (i === 1 ? 0.001 : -0.001);
            const fuzzyPoints = generateFuzzyPoints(spacedPoints, h, r, 0.4, i);
            line.geometry.dispose();
            line.geometry = new THREE.BufferGeometry().setFromPoints(fuzzyPoints);
            line.geometry.computeBoundingSphere(); // Stability fix
            const colorArr = new Float32Array(spacedPoints.length * 3).fill(1);
            line.geometry.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
            patchStelaMaterial(line.material as THREE.LineBasicMaterial);
            const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
            if (posAttr) posAttr.setUsage(THREE.DynamicDrawUsage);
            line.geometry.setDrawRange(0, 0);
        });
    };

    const rebuildItineraryRoute = (p: any, layers: string[][]) => {
        if (layers.length < 2) return;

        let startIata: string;
        let endIata: string;
        let nextLayerIdx: number;

        // Determine next leg
        const isFinished = p.currentLayerIndex === undefined || p.currentLayerIndex >= layers.length - 1;

        if (isFinished) {
            // Clear persistent trails when restarting the whole journey
            if (p.persistentGroup) p.persistentGroup.clear();
            p.currentPersistentLine = null;

            // Start over from a random origin
            const origins = layers[0] || [];
            if (origins.length === 0) return;
            startIata = origins[Math.floor(Math.random() * origins.length)]!;

            const nextLayer = layers[1] || [];
            if (nextLayer.length === 0) return;
            endIata = nextLayer[Math.floor(Math.random() * nextLayer.length)]!;
            nextLayerIdx = 1;
        } else {
            // Continue from where it arrived
            startIata = p.arrivalIata || (layers[p.currentLayerIndex!] ? layers[p.currentLayerIndex!]![0]! : "");
            if (!startIata) {
                // Safety fallback if something went wrong with the chain
                p.currentLayerIndex = undefined;
                rebuildItineraryRoute(p, layers);
                return;
            }
            nextLayerIdx = p.currentLayerIndex! + 1;

            const nextLayer = layers[nextLayerIdx] || [];
            if (nextLayer.length === 0) {
                // Should not happen with valid layers, but safety reset
                p.currentLayerIndex = undefined;
                rebuildItineraryRoute(p, layers);
                return;
            }
            endIata = nextLayer[Math.floor(Math.random() * nextLayer.length)]!;
        }

        const origin = airportsDataRef.current.find(a => a.iata === startIata);
        const dest = airportsDataRef.current.find(a => a.iata === endIata);
        if (!origin || !dest) return;

        const getPos = (iata: string, lat: number, lon: number) => {
            const mesh = airportsMap.current[iata];
            if (mesh) return mesh.position.clone();
            return latLonToVector3(Number(lat), Number(lon));
        };

        const start = getPos(origin.iata, origin.lat, origin.lon);
        const end = getPos(dest.iata, dest.lat, dest.lon);
        const dist = start.distanceTo(end);

        const samples = Math.max(250, Math.floor(dist * 600));
        const cruiseAltitude = (dist * 0.016);
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const pt = new THREE.Vector3().copy(start).lerp(end, t).normalize();
            const altitude = 1.002 + (Math.sin(Math.PI * t) * cruiseAltitude);
            pt.multiplyScalar(altitude);
            points.push(pt);
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const spacedPoints = curve.getSpacedPoints(samples);

        p.curve = curve;
        p.points = spacedPoints;
        p.totalLength = curve.getLength();
        const baseSpeed = 0.002;
        p.speed = baseSpeed / (1 + dist * 2);
        p.progress = 0;

        // Fixed wait at stopovers (escalas), random only when the ship finishes its trip and restarts
        const isScale = nextLayerIdx < layers.length - 1;
        const waitBase = isScale ? 0.4 : (0.15 + Math.pow(Math.random(), 2) * 1.5);
        p.waitDuration = waitBase / (1 + dist * 1.2);

        // Save state for next leg
        p.currentLayerIndex = nextLayerIdx;
        p.arrivalIata = endIata;

        // Update multiple jittered lines for a fuzzy cloud effect
        p.lines.forEach((line: THREE.Line, i: number) => {
            const h = (i === 0) ? 0 : (i === 1 ? 0.001 : -0.001);
            const r = (i === 0) ? 0 : (i === 1 ? 0.001 : -0.001);
            const fuzzyPoints = generateFuzzyPoints(spacedPoints, h, r, 0.4, i);
            line.geometry.dispose();
            line.geometry = new THREE.BufferGeometry().setFromPoints(fuzzyPoints);
            line.geometry.computeBoundingSphere();
            const colorArr = new Float32Array(spacedPoints.length * 3).fill(1);
            line.geometry.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
            patchStelaMaterial(line.material as THREE.LineBasicMaterial);
            const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
            if (posAttr) posAttr.setUsage(THREE.DynamicDrawUsage);
            line.geometry.setDrawRange(0, 0);
        });

        // Handle persistent dashed trail for multi-leg routes
        if (layers.length > 2 && p.persistentGroup) {
            const brandColorHex = getThemeColorHex('--color-brand', 0x4f46e5);
            const dashMat = new THREE.LineDashedMaterial({
                color: brandColorHex,
                dashSize: 0.004,
                gapSize: 0.003,
                transparent: true,
                opacity: 0.35,
                depthWrite: false
            });
            const dashGeo = new THREE.BufferGeometry().setFromPoints(spacedPoints);
            const dashLine = new THREE.Line(dashGeo, dashMat);
            dashLine.computeLineDistances();
            dashLine.geometry.setDrawRange(0, 0);
            dashLine.renderOrder = 15;
            p.persistentGroup.add(dashLine);
            p.currentPersistentLine = dashLine;
        } else {
            p.currentPersistentLine = null;
        }
    };

    // Notify parent when globe is fully ready (geo + airports loaded + initial move done)
    useEffect(() => {
        if (geoReady && isLoaded && initialTransitionDone && onReady) onReady();
    }, [geoReady, isLoaded, initialTransitionDone, onReady]);

    // Load Airplane Model
    useEffect(() => {
        const loader = new GLTFLoader();
        loader.load(airplaneModelUrl, (gltf) => {
            const model = gltf.scene;
            // Center and scale the model so it fits the globe animations
            model.scale.setScalar(0.001); // Initial scale, will be refined in arc creation
            airplaneModelRef.current = model;
            setModelLoaded(true);
        }, undefined, (err) => {
            console.error("Error loading airplane model:", err);
        });
    }, []);

    // 1. Initial 3D Setup (Runs ONLY once on mount)
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        let animationId: number;

        const width = mount.clientWidth;
        const height = mount.clientHeight;

        // Scene, Camera, Renderer
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
        const idealDist = calculateDistance(width, height);
        const defaultPos = latLonToVector3(0, 0, idealDist);
        camera.position.copy(defaultPos);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;
        homePositionRef.current.copy(defaultPos);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08; // Smoother, more "liquid" feel
        controls.minDistance = 1.25;
        controls.maxDistance = 6.25;
        controls.enablePan = false;
        controls.enableZoom = isMobileRef.current; // Handled manually on desktop for smooth stepped feeling
        controlsRef.current = controls;

        // Initialize target distance from camera's starting position
        targetZoomDistRef.current = camera.position.length();

        const onWheel = (e: WheelEvent) => {
            if (isMobileRef.current || !interactiveRef.current) return;
            e.preventDefault();

            const direction = e.deltaY > 0 ? 1 : -1;

            // Calculate current distance more accurately
            const currentDist = camera.position.length();

            // Ensure we jump from a base aligned to ZOOM_STEP
            let nextTarget = targetZoomDistRef.current;
            if (direction > 0) {
                // Zoom OUT
                nextTarget = Math.floor((targetZoomDistRef.current + 0.01) / ZOOM_STEP) * ZOOM_STEP + ZOOM_STEP;
            } else {
                // Zoom IN
                nextTarget = Math.ceil((targetZoomDistRef.current - 0.01) / ZOOM_STEP) * ZOOM_STEP - ZOOM_STEP;
            }

            // Clamp results
            nextTarget = Math.max(controls.minDistance, Math.min(controls.maxDistance, nextTarget));
            targetZoomDistRef.current = nextTarget;

            // --- ZOOM TOWARDS CURSOR LOGIC ---
            const startDir = camera.position.clone().normalize();
            let endDir = startDir.clone();

            const rect = mount.getBoundingClientRect();
            const mX = ((e.clientX - rect.left) / mount.clientWidth) * 2 - 1;
            const mY = -((e.clientY - rect.top) / mount.clientHeight) * 2 + 1;

            const wheelRaycaster = new THREE.Raycaster();
            wheelRaycaster.setFromCamera(new THREE.Vector2(mX, mY), camera);
            const hitPoint = new THREE.Vector3();
            const globeSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);

            if (wheelRaycaster.ray.intersectSphere(globeSphere, hitPoint)) {
                const targetDir = hitPoint.normalize();
                // Move the direction towards the cursor proportionally to the zoom step
                // The factor (currentDist - nextTarget) / currentDist perfectly approximates
                // the rotation needed to keep the point under the cursor on a sphere.
                const lerpFactor = (currentDist - nextTarget) / currentDist;
                endDir.lerp(targetDir, lerpFactor);
            }
            // ---------------------------------

            // Animate only the distance along the normalized direction vector to keep orientation stable
            const zoomProxy = {
                distance: currentDist,
                dirX: startDir.x,
                dirY: startDir.y,
                dirZ: startDir.z
            };
            if (zoomAnimationRef.current) zoomAnimationRef.current.kill();

            zoomAnimationRef.current = gsap.to(zoomProxy, {
                distance: nextTarget,
                dirX: endDir.x,
                dirY: endDir.y,
                dirZ: endDir.z,
                duration: 0.8,
                ease: "power2.out",
                overwrite: "auto",
                onUpdate: () => {
                    if (!cameraRef.current || !controlsRef.current) return;
                    const currentDir = new THREE.Vector3(zoomProxy.dirX, zoomProxy.dirY, zoomProxy.dirZ).normalize();
                    cameraRef.current.position.copy(currentDir.multiplyScalar(zoomProxy.distance));
                    controlsRef.current.update();
                }
            });
        };

        renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

        const hideContextMenu = () => {
            setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
        };
        const onControlsChange = () => {
            if (camera.position.length() !== 0) {
                const camDist = camera.position.length();
                // Discrete snapshots for clustering (0.25 units) for maximum performance
                const steppedDist = Math.round(camDist / ZOOM_STEP) * ZOOM_STEP;

                // Original formula: tuned to range [0.012, 0.045] over dist [1.25, 6.25]
                const rawThreshold = (steppedDist - 1.25) * 0.007 + 0.012;
                const nextThreshold = Math.max(0.012, Math.min(0.055, rawThreshold));

                // 2. Eagerly update clustering if we cross a 0.25 step boundary
                // Using steppedDist here reduces rebuild frequency significantly (Lagfix)
                if (Math.abs(steppedDist - lastClusteredDistRef.current) >= ZOOM_STEP) {
                    lastClusteredDistRef.current = steppedDist;
                    setClusterThreshold(nextThreshold);
                }

                // 3. Final debounced update for safety
                if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
                zoomDistRef.current = camDist;
                zoomTimeoutRef.current = setTimeout(() => {
                    setClusterThreshold(prev => {
                        if (Math.abs(prev - nextThreshold) < 0.001) return prev;
                        return nextThreshold;
                    });
                }, 80);
            }
        };
        controls.addEventListener('change', onControlsChange);

        // Kill any ongoing camera animations when the user starts manual interaction
        controls.addEventListener('start', () => {
            isUserInteractingRef.current = true;
            if (interactiveRef.current) {
                renderer.domElement.style.cursor = "grabbing";
            }
            if (cameraRef.current) gsap.killTweensOf(cameraRef.current.position);
            if (zoomAnimationRef.current) zoomAnimationRef.current.kill();
            setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
        });

        controls.addEventListener('end', () => {
            isUserInteractingRef.current = false;
            // Capture the exact distance user ended at for future stepped increments
            targetZoomDistRef.current = camera.position.length();

            if (interactiveRef.current) {
                renderer.domElement.style.cursor = "grab";
            } else {
                renderer.domElement.style.cursor = "default";
            }
        });

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.4)); // Lower ambient for better sun contrast
        const sunLight = new THREE.PointLight(0xffffff, 2, 5000); // Very strong solar light
        scene.add(sunLight);

        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin("Anonymous");

        // Starfield
        const starGroup = starGroupRef.current;
        scene.add(starGroup);

        const starGeometry = new THREE.BufferGeometry();
        const starVertices = [];
        for (let i = 0; i < 5000; i++) {
            starVertices.push((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000);
        }
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.8, sizeAttenuation: true }));
        starGroup.add(stars);

        // Shooting Stars & Meteorites Group
        scene.add(shootingStarGroupRef.current);

        // Stylized Sun (Orbits Earth independently)
        const sunGroup = new THREE.Group();
        sunRef.current = sunGroup;
        scene.add(sunGroup);

        const sunMesh = new THREE.Mesh(
            new THREE.SphereGeometry(15, 32, 32),
            new THREE.MeshBasicMaterial({
                map: loader.load("https://threejs.org/examples/textures/lava/lavatile.jpg"),
            })
        );
        sunMesh.name = "sunBody";
        sunGroup.add(sunMesh);

        // Sun Glow Effect
        const sunGlow = new THREE.Mesh(
            new THREE.SphereGeometry(22, 32, 32),
            new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                transparent: true,
                opacity: 0.3,
                side: THREE.BackSide
            })
        );
        sunGroup.add(sunGlow);

        // Reset Solar Group for geocentric planets
        const solarGroup = solarGroupRef.current;
        scene.add(solarGroup);

        const planetData = [
            { name: "Mercury", dist: 400, size: 0.8, color: 0x999999, speed: 0.004 },
            { name: "Venus", dist: 550, size: 1.8, color: 0xe3bb76, speed: 0.003 },
            { name: "Mars", dist: 700, size: 1.2, color: 0xef5d49, speed: 0.002 },
            { name: "Jupiter", dist: 1000, size: 6.0, color: 0xeb9350, speed: 0.001 },
            { name: "Saturn", dist: 1300, size: 5.0, color: 0xeed096, speed: 0.0008, hasRings: true },
            { name: "Uranus", dist: 1600, size: 3.5, color: 0x93b8d4, speed: 0.0006 },
            { name: "Neptune", dist: 1800, size: 3.4, color: 0x3d5ef9, speed: 0.0005 }
        ];

        planetData.forEach(data => {
            const planetMesh = new THREE.Mesh(
                new THREE.SphereGeometry(data.size, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: data.color,
                    roughness: 0.7,
                    metalness: 0.2
                })
            );

            if (data.hasRings) {
                const ringGeo = new THREE.RingGeometry(data.size * 1.4, data.size * 2.2, 32);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: data.color,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.4
                });
                const rings = new THREE.Mesh(ringGeo, ringMat);
                rings.rotation.x = Math.PI / 2.5;
                planetMesh.add(rings);
            }

            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * 0.2; // Keep them near the ecliptic plane
            planetMesh.position.set(
                data.dist * Math.cos(theta),
                data.dist * Math.sin(phi),
                data.dist * Math.sin(theta)
            );

            solarGroup.add(planetMesh);
            planetsRef.current.push({
                mesh: planetMesh,
                distance: data.dist,
                speed: data.speed,
                theta: theta
            });
        });

        // Initialize sun position
        sunGroup.position.set(1200, 0, 0);
        let sunTheta = 0;

        // Earth — visible immediately at the correct camera position set by IP geo
        const earthGroup = earthGroupRef.current;
        scene.add(earthGroup);
        earthGroup.add(arcsGroupRef.current);
        earthGroup.add(fadingOutGroupRef.current);
        earthGroup.add(fadingOutLabelsRef.current);
        earthGroup.add(airportGroupRef.current);
        earthGroup.add(labelGroupRef.current);
        earthGroup.add(countryLabelsGroupRef.current);
        earthGroup.scale.set(1, 1, 1);
        earthGroup.rotation.y = 0;

        // Country land borders (no coastlines)
        const borderMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.06,
            depthWrite: false,
        });
        fetch('/ne_110m_borders_land.geojson')
            .then(r => r.json())
            .then((geojson: any) => {
                geojson.features.forEach((feature: any) => {
                    const geom = feature.geometry;
                    if (!geom) return;
                    // LineString → one ring; MultiLineString → array of rings
                    const lines: [number, number][][] =
                        geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
                    lines.forEach(line => {
                        const points = line.map(([lon, lat]: [number, number]) =>
                            latLonToVector3(lat, lon, 1.001)
                        );
                        const geo = new THREE.BufferGeometry().setFromPoints(points);
                        earthGroup.add(new THREE.Line(geo, borderMaterial));
                    });
                });
            })
            .catch(() => { /* borders are cosmetic, fail silently */ });

        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
        // loader was declared above for the galaxy to solve scope issues

        // Stylized Moon (Close Earth satellite)
        const moonGroup = new THREE.Group();
        scene.add(moonGroup);
        const moon = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 32, 32),
            new THREE.MeshStandardMaterial({
                map: loader.load("https://threejs.org/examples/textures/planets/moon_1024.jpg"),
                roughness: 1,
                metalness: 0
            })
        );
        moon.position.set(10, 0, 0); // Moved farther than camera maxDistance (6.25) to avoid clipping and occultation
        moonGroup.add(moon);
        moonRef.current = moon;
        let moonTheta = Math.random() * Math.PI * 2;

        const earth = new THREE.Mesh(
            new THREE.SphereGeometry(1, 64, 64),
            new THREE.MeshPhongMaterial({
                map: loader.load(new URL(`../assets/world.2004${currentMonth}.3x5400x2700.jpg`, import.meta.url).href),
                bumpMap: loader.load("https://threejs.org/examples/textures/planets/earth_normal_2048.jpg"),
                bumpScale: 0.05,
                specularMap: loader.load("https://threejs.org/examples/textures/planets/earth_specular_2048.jpg"),
                specular: new THREE.Color('grey')
            })
        );
        earthGroup.add(earth);

        const clouds = new THREE.Mesh(
            new THREE.SphereGeometry(1.01, 64, 64),
            new THREE.MeshPhongMaterial({
                map: loader.load("https://threejs.org/examples/textures/planets/earth_clouds_1024.png"),
                transparent: true, opacity: 0.4, depthWrite: false
            })
        );
        cloudsRef.current = clouds;
        earthGroup.add(clouds);

        earthGroup.add(new THREE.Mesh(
            new THREE.SphereGeometry(1.02, 64, 64),
            new THREE.MeshPhongMaterial({ color: 0x4477ff, transparent: true, opacity: 0.25, side: THREE.BackSide, blending: THREE.AdditiveBlending })
        ));

        earthGroup.add(new THREE.Mesh(
            new THREE.SphereGeometry(1.002, 64, 64),
            new THREE.MeshPhongMaterial({ color: 0x4477ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false })
        ));

        // Initial airports loading is now handled in a separate useEffect

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        let mouseDownPos = new THREE.Vector2();
        renderer.domElement.addEventListener("mousedown", (e) => {
            mouseDownPos.set(e.clientX, e.clientY);
        });

        const onClick = (e: MouseEvent) => {
            if (!interactiveRef.current) return;
            const dist = Math.sqrt(Math.pow(e.clientX - mouseDownPos.x, 2) + Math.pow(e.clientY - mouseDownPos.y, 2));
            if (dist > 5) return;

            setContextMenu(prev => ({ ...prev, visible: false }));
            if (!cameraRef.current || !mountRef.current) return;
            const rect = mountRef.current.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / mountRef.current.clientWidth) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / mountRef.current.clientHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, cameraRef.current);
            const intersects = raycaster.intersectObjects(airportGroupRef.current.children);

            if (intersects[0]) {
                const item = intersects[0].object.userData;
                const pos = intersects[0].object.position.clone();
                if (item.isCluster) {
                    setContextMenu({
                        visible: true,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        worldPos: pos,
                        airport: null,
                        clusterAirports: item.airports,
                        city: null
                    });
                } else if (item.isCity) {
                    setContextMenu({
                        visible: true,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        worldPos: pos,
                        airport: null,
                        clusterAirports: null,
                        city: item
                    });
                } else {
                    const a = item as AirportData;
                    if (onSelectRef.current) {
                        onSelectRef.current(toAirportResponse(a));
                    } else {
                        onAirportClickRef.current?.(toAirportResponse(a));
                    }
                    setContextMenu(prev => ({ ...prev, visible: false }));
                }
            } else {
                if (!onSelectRef.current) {
                    onAirportClickRef.current?.(null);
                }
                setContextMenu(prev => ({ ...prev, visible: false }));
            }
        };

        const onContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            if (!interactiveRef.current) return;
            if (!cameraRef.current || !mountRef.current) return;
            const rect = mountRef.current.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / mountRef.current.clientWidth) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / mountRef.current.clientHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, cameraRef.current);
            const intersects = raycaster.intersectObjects(airportGroupRef.current.children);
            if (intersects[0]) {
                const item = intersects[0].object.userData;
                const pos = intersects[0].object.position.clone();
                if (item.isCluster) {
                    setContextMenu({
                        visible: true,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        worldPos: pos,
                        airport: null,
                        clusterAirports: item.airports,
                        city: null
                    });
                } else if (item.isCity) {
                    setContextMenu({
                        visible: true,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        worldPos: pos,
                        airport: null,
                        clusterAirports: null,
                        city: item
                    });
                } else {
                    const a = item as AirportData;
                    setContextMenu({
                        visible: true,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        worldPos: pos,
                        airport: a,
                        clusterAirports: null,
                        city: null
                    });
                }
            } else {
                setContextMenu(prev => ({ ...prev, visible: false }));
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!cameraRef.current || !mountRef.current) return;
            const rect = mountRef.current.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / mountRef.current.clientWidth) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / mountRef.current.clientHeight) * 2 + 1;
            mousePosRef.current.copy(mouse);

            if (isUserInteractingRef.current) {
                renderer.domElement.style.cursor = "grabbing";
                if (popupRef.current) popupRef.current.style.display = "none";
                return;
            }

            raycaster.setFromCamera(mouse, cameraRef.current);
            const intersects = raycaster.intersectObjects(airportGroupRef.current.children);

            if (intersects.length > 0 && intersects[0]?.object?.userData) {
                const item = intersects[0].object.userData;
                const isSpecial = item.isSpecial;

                if (interactiveRef.current || isSpecial) {
                    renderer.domElement.style.cursor = "pointer";
                    if (popupRef.current) {
                        let x = e.clientX - rect.left + 10;
                        let y = e.clientY - rect.top + 10;
                        const popupWidth = popupRef.current.offsetWidth || 200;
                        const popupHeight = popupRef.current.offsetHeight || 40;

                        if (x + popupWidth > rect.width - 10) {
                            x = e.clientX - rect.left - popupWidth - 10;
                        }
                        if (y + popupHeight > rect.height - 10) {
                            y = e.clientY - rect.top - popupHeight - 10;
                        }

                        popupRef.current.style.left = x + "px";
                        popupRef.current.style.top = y + "px";
                        if (item.isCluster) {
                            popupRef.current.innerHTML = `
                                <div class="flex flex-col gap-1 min-w-[140px]">
                                    <div class="text-[10px] text-white/50 font-bold uppercase tracking-wider">${t("globe.airportZone")}</div>
                                    <div class="flex items-center gap-2">
                                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                                        <span class="text-xs font-bold">${t("globe.locations", { count: item.airports.length })}</span>
                                    </div>
                                    <div class="text-[9px] text-white/40 italic">${t("globe.clickForList")}</div>
                                </div>
                            `;
                        } else if (item.isCity) {
                            popupRef.current.innerHTML = `
                                <div class="flex flex-col gap-1.5 min-w-[160px]">
                                    <div class="text-[10px] text-white/50 font-bold uppercase tracking-wider">${t("globe.city")}</div>
                                    <div class="flex items-center gap-2">
                                        <div class="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]"></div>
                                        <span class="text-sm font-bold tracking-tight">${item.name}</span>
                                    </div>
                                    ${item.country ? `<div class="text-[10px] text-white/60 font-medium flex items-center gap-1.5 opacity-80">
                                        <span>${item.country}</span>
                                    </div>` : ''}
                                    <div class="h-px bg-white/10 my-0.5"></div>
                                    <div class="flex flex-col gap-1">
                                        <div class="text-[9px] text-white/40 font-bold uppercase tracking-tighter">${t("globe.linkedAirports")}</div>
                                        <div class="flex flex-wrap gap-1">
                                            ${item.airports.map((a: any) => `<span class="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-black tracking-tighter text-indigo-200">${a.iata}</span>`).join('')}
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else {
                            const a = item as AirportData;
                            const displayName = a.name || a.city || t("globe.unknownLocation");
                            popupRef.current.innerHTML = `
                                <div class="flex flex-col gap-1 min-w-[140px]">
                                    <div class="text-[10px] text-white/50 font-bold uppercase tracking-wider">${a.iata || 'N/A'}</div>
                                    <div class="flex items-center gap-2">
                                        <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                                        <span class="text-xs font-bold">${displayName}</span>
                                    </div>
                                    ${a.country ? `<div class="text-[9px] text-white/40 font-medium">${a.country}</div>` : ''}
                                </div>
                            `;
                        }
                        popupRef.current.style.display = "block";
                    }
                } else {
                    renderer.domElement.style.cursor = "default";
                    if (popupRef.current) popupRef.current.style.display = "none";
                }
            } else {
                if (interactiveRef.current) {
                    renderer.domElement.style.cursor = "grab";
                } else {
                    renderer.domElement.style.cursor = "default";
                }
                if (popupRef.current) popupRef.current.style.display = "none";
            }
        };

        const onMouseLeave = () => {
            mousePosRef.current.set(-999, -999);
            renderer.domElement.style.cursor = "default";
            if (popupRef.current) popupRef.current.style.display = "none";
        };

        renderer.domElement.addEventListener("click", onClick);
        renderer.domElement.addEventListener("contextmenu", onContextMenu);
        renderer.domElement.addEventListener("mousemove", onMouseMove);
        renderer.domElement.addEventListener("mouseleave", onMouseLeave);

        const animate = () => {
            animationId = requestAnimationFrame(animate);
            if (controlsRef.current?.enabled) controlsRef.current.update();
            if (cloudsRef.current) cloudsRef.current.rotation.y += 0.00015;
            starGroupRef.current.rotation.y += 0.0001;

            if (cameraRef.current) {
                const cam = cameraRef.current;
                const now = Date.now();

                // Detect movement (with a small margin to avoid floating point jitter)
                const moveDistSq = cam.position.distanceToSquared(lastCamPosRef.current);
                const rotDiff = 1 - cam.quaternion.dot(lastCamQuatRef.current);

                if (moveDistSq > 0.00001 || rotDiff > 0.00001) {
                    lastMoveTimeRef.current = now;
                    lastCamPosRef.current.copy(cam.position);
                    lastCamQuatRef.current.copy(cam.quaternion);
                }

                const isMoving = (now - lastMoveTimeRef.current) < 150; // 150ms margin

                // Notify parent about movement state
                if (onMovementChangeRef.current) {
                    onMovementChangeRef.current(isMoving, isUserInteractingRef.current);
                }

                const camDist = cam.position.length();
                const zoomFactor = Math.max(0, Math.min(1, (3.5 - camDist) / 2.4));

                // Start appearing slightly later (with more zoom)
                const globalZoomFade = Math.max(0, Math.min(1, (2.8 - camDist) / 1.0));

                raycaster.setFromCamera(mousePosRef.current, cam);

                if (controlsRef.current) {
                    // Precise 1:1 dragging: rotation angle must scale with the distance to the surface (camDist - 1)
                    const fovRad = THREE.MathUtils.degToRad(cam.fov);
                    const speed = ((camDist - 1) * Math.tan(fovRad / 2)) / Math.PI;
                    controlsRef.current.rotateSpeed = speed;
                }

                _camNorm.copy(cam.position).normalize();
                const activeOrigins = activeOriginsRef.current;
                const activeDests = activeDestsRef.current;
                const selSet = selectedAirportsSetRef.current;
                const layoversSet = layoversSetRef.current;

                const distFactor = camDist / 3.2;
                // Linear scaling ensures constant screen size (Perspective projection offset)
                const scaleFactor = distFactor;
                const proximityBase = 0.03 * Math.pow(distFactor, 2.2);

                const isMobile = isMobileRef.current;
                const hitboxMultiplier = isMobile ? 2.5 : 1.0;
                const cityHitboxExpansion = 1.5; // Extra boost for city hitboxes
                const invHitboxMultiplier = 1 / hitboxMultiplier;

                const baseScale = 2.0 * scaleFactor;
                const specialScale = 22 * scaleFactor;
                const specialClusterScale = 6 * scaleFactor;
                const clusterHoverScale = 4.5 * scaleFactor;
                const airportHoverScale = 18 * scaleFactor;
                const labelRefScale = 0.026 * scaleFactor;
                airportGroupRef.current.children.forEach(child => {
                    const mesh = child as THREE.Mesh;
                    const item = mesh.userData;
                    const visual = mesh.userData.visualMesh as THREE.Mesh | undefined;
                    const mat = (visual ? visual.material : mesh.material) as THREE.MeshBasicMaterial;

                    // Handle cluster or single airport 
                    // (Optimization: avoid .some if not special)
                    let isSpecial = false;
                    if (item.isCluster) {
                        for (let i = 0; i < item.airports.length; i++) {
                            const iata = item.airports[i].iata;
                            if (activeOrigins.includes(iata) || activeDests.includes(iata) || selSet.has(iata)) {
                                isSpecial = true;
                                break;
                            }
                        }
                    } else if (item.isCity) {
                        isSpecial = item.isSpecial; // Cities are only rendered if special/forced
                    } else {
                        const allSteps = (stepsIataRef.current || []).flat();
                        isSpecial = activeOrigins.includes(item.iata) || activeDests.includes(item.iata) || selSet.has(item.iata) || allSteps.includes(item.iata);
                    }

                    let targetOpacity = 0;
                    let targetScale = baseScale;
                    let hoverFactor = 0;

                    _vec1.copy(mesh.position);
                    const dot = _camNorm.dot(_vec1);

                    // Compute hover factor if special (always responsive) or regular (only if interactive)
                    if (dot >= 0.1 && (isSpecial || interactiveRef.current)) {
                        if (isMobile) {
                            hoverFactor = Math.pow(Math.max(0, (dot - 0.90) / 0.10), 1.5);
                        } else {
                            const distToRay = raycaster.ray.distanceSqToPoint(_vec1);
                            if (distToRay < proximityBase) {
                                hoverFactor = 1 - (distToRay / proximityBase);
                            }
                        }
                    }

                    if (isSpecial) {
                        targetOpacity = 1;
                        // Special items: Larger base + extra growth on hover
                        const specialBase = item.isCluster ? specialClusterScale : specialScale;
                        targetScale = specialBase * (1 + hoverFactor * 0.12); // subtle growth
                    } else if (interactiveRef.current) {
                        // Regular items: Dynamic reveal based on proximity
                        targetOpacity = hoverFactor;
                        const sizeMult = 0.5 + hoverFactor * 0.5;
                        targetScale = (item.isCluster ? clusterHoverScale : airportHoverScale) * sizeMult;
                    }

                    // Apply to Mesh (Hitbox is the parent)
                    // We apply the 'hitboxMultiplier' to the parent but the inverse to the visual child
                    // so things still FEEL correct but interact from further out.
                    const expansion = item.isCity ? cityHitboxExpansion : 1.0;
                    const finalHitboxScale = targetScale * hitboxMultiplier * expansion;

                    // Opacity continues to fade smoothly
                    if (Math.abs(mat.opacity - targetOpacity) > 0.001) {
                        mat.opacity += (targetOpacity - mat.opacity) * 0.06;
                    }

                    // Scale changes are now interpolated for a smooth "size fade" effect
                    if (Math.abs(mesh.scale.x - finalHitboxScale) > 0.001) {
                        mesh.scale.setScalar(mesh.scale.x + (finalHitboxScale - mesh.scale.x) * 0.08);
                    }

                    // Always enforce visual scale compensation every frame to prevent 'stuck' large sizes on mobile
                    if (visual) {
                        visual.scale.setScalar(invHitboxMultiplier / expansion);
                    }

                    if (item.isCluster) {
                        mat.opacity = (DEBUG_HITBOXES && interactiveRef.current) ? 0.3 : 0;
                        mat.wireframe = (DEBUG_HITBOXES && interactiveRef.current);
                    } else if (DEBUG_HITBOXES && interactiveRef.current) {
                        mat.opacity = Math.max(mat.opacity, 0.2);
                        mat.wireframe = true;
                    } else {
                        mat.wireframe = false;
                    }

                    // Integrated Cluster/Scale Label Positioning (3D Mesh)
                    if ((item.isCluster || item.stepIdx !== undefined) && mesh.userData.labelMesh) {
                        const label = mesh.userData.labelMesh as THREE.Sprite;

                        _vec1.copy(mesh.position);
                        const dot = _camNorm.dot(_vec1);

                        // Sync opacity with a slower factor
                        const labelTargetOpacity = dot < 0.2 ? 0 : targetOpacity;
                        if (Math.abs(label.material.opacity - labelTargetOpacity) > 0.001) {
                            label.material.opacity += (labelTargetOpacity - label.material.opacity) * 0.06;
                        }

                        // Determine visibility based on dot product (hemisphere) and opacity
                        const isVisible = label.material.opacity > 0.01;
                        if (label.visible !== isVisible) {
                            label.visible = isVisible;
                        }

                        // Sync cluster stems visibility and opacity
                        if (mesh.userData.stemMesh) {
                            const stems = mesh.userData.stemMesh as THREE.LineSegments;
                            const stemMat = stems.material as THREE.LineBasicMaterial;
                            if (Math.abs(stemMat.opacity - label.material.opacity * 0.5) > 0.001) {
                                stemMat.opacity = label.material.opacity * 0.5;
                            }
                            if (stems.visible !== isVisible) stems.visible = isVisible;
                        }

                        // Sync anchor points visibility and opacity
                        if (mesh.userData.anchorMesh) {
                            const anchors = mesh.userData.anchorMesh as THREE.Points;
                            const anchorMat = anchors.material as THREE.PointsMaterial;
                            if (Math.abs(anchorMat.opacity - label.material.opacity * 0.7) > 0.001) {
                                anchorMat.opacity = label.material.opacity * 0.7;
                            }
                            if (anchors.visible !== isVisible) anchors.visible = isVisible;
                        }

                        // Scale effect for the label (relative to mesh scale which is already distance-aware)
                        // Use base scale (without hitbox boost) for visual consistency
                        const logicalScale = mesh.scale.x / hitboxMultiplier;
                        const labelScale = labelRefScale * (0.5 + 0.5 * (logicalScale / (35 * scaleFactor)));
                        if (Math.abs(label.scale.x - (labelScale)) > 0.0001) {
                            label.scale.setScalar(labelScale);
                        }
                    }
                });

                // --- CROSSFADE: Gracefully Fade Out Old State ---
                [fadingOutGroupRef.current, fadingOutLabelsRef.current].forEach(group => {
                    for (let i = group.children.length - 1; i >= 0; i--) {
                        const child = group.children[i] as any;
                        let mat = child.material;
                        // For clusters/stems, we might have nested materials or different structures
                        if (!mat && child.userData?.visualMesh) mat = child.userData.visualMesh.material;

                        if (mat) {
                            mat.opacity *= 0.85; // Faster decay for crossfade
                            if (mat.opacity < 0.005) {
                                group.remove(child);
                                // Optional: Recursive disposal if this was a heavy object
                                // However, we usually dispose them in the clustering useEffect
                            }
                        } else {
                            // If no material found, just remove it
                            group.remove(child);
                        }
                    }
                });

                // --- Update country labels hover ---
                countryLabelsGroupRef.current.children.forEach(child => {
                    const mesh = child as THREE.Mesh;
                    const mat = mesh.material as THREE.MeshBasicMaterial;
                    _vec1.copy(mesh.position);
                    const dot = _camNorm.dot(_vec1);

                    let targetOpacity = 0;
                    const customScale = mesh.userData.customScale || 1;

                    if (interactiveRef.current && dot >= 0.1) {
                        if (isMobileRef.current) {
                            // Mobile: Show based on camera looking towards it, with a generous angle 
                            let factor = Math.pow(Math.max(0, (dot - 0.90) / 0.10), 1.5);
                            if (factor > 0) {
                                targetOpacity = 0.4 * factor * globalZoomFade;
                            }
                        } else {
                            // Desktop: Show based on cursor hover distance
                            const distToRay = raycaster.ray.distanceSqToPoint(_vec1);
                            const countryThreshold = proximityBase * 4.0 * Math.min(1.5, customScale);
                            if (distToRay < countryThreshold) {
                                targetOpacity = 0.4 * globalZoomFade;
                            }
                        }
                    }

                    if (Math.abs(mat.opacity - targetOpacity) > 0.001) {
                        mat.opacity += (targetOpacity - mat.opacity) * 0.1;
                    }
                    mesh.visible = mat.opacity > 0.01;

                    if (mesh.visible) {
                        // Adaptive zoom: smaller countries shrink more when zooming out
                        const adaptiveZoom = customScale < 0.7 ? (0.3 + 0.7 * zoomFactor) : (0.5 + 0.5 * zoomFactor);
                        const s = 0.032 * customScale * adaptiveZoom;
                        const texture = mat.map!;
                        const aspect = (texture.image as any).width / (texture.image as any).height;
                        mesh.scale.set(s * aspect, s, 1);
                    }
                });
            }

            planesRef.current.forEach(p => {
                p.progress += p.speed;
                // Total cycle includes flight (1.0) and random wait time
                const loopCycle = 1.0 + (p.waitDuration || 0.15);
                if (p.progress > loopCycle) {
                    if (p.isAmbient) {
                        rebuildAmbientRoute(p);
                    } else {
                        const layers = [activeOriginsRef.current, ...stepsIataRef.current, activeDestsRef.current];
                        rebuildItineraryRoute(p, layers);
                    }
                }

                // Hide planes during waiting or initial stagger period
                const totalPoints = p.points.length;

                // --- Sync Logic: Vanish and Appear together ---
                // Start and End transition zones (proportional to path)
                const totalLen = (p as any).totalLength || 0.1;
                const fadeZone = Math.max(0.08, Math.min(0.25, 0.12 / totalLen));

                // Dynamic density-aware trail and tail offset calculation
                const pointsPerUnit = totalPoints / totalLen;
                const tailOffset = Math.floor(0.008 * pointsPerUnit);

                // Proportional trail length: grows with distance but at a decreasing rate 
                // Increased multiplier and minimums to ensure visibility on short flights
                const baseTrailLength = Math.max(tailOffset + 32, Math.floor(Math.sqrt(totalPoints) * 3.4));
                let currentTrailLength = baseTrailLength;

                // Synchronized disappearance: the trail shrinks into the plane as it lands
                if (p.progress > 1.0 - fadeZone) {
                    const landingFactor = Math.max(0, (1.0 - p.progress) / fadeZone);
                    currentTrailLength = baseTrailLength * landingFactor;
                }

                // Allow progress to go slightly beyond 1.0 for the wait cycle, but visual lifecycle ends at 1.0
                if (p.progress < 0 || p.progress > loopCycle) {
                    p.mesh.visible = false;
                    p.lineGroup.visible = false;
                    return;
                }

                // Head index (where the plane is) clamped to [0, totalPoints-1]
                const headProgress = Math.min(1.0, p.progress);
                const exactHeadIdx = headProgress * (totalPoints - 1);
                const baseIdx = Math.floor(exactHeadIdx);
                const pt1 = p.points[baseIdx];
                const pt2 = p.points[Math.min(baseIdx + 1, totalPoints - 1)];

                if (pt1 && pt2) {
                    // Head interpolation
                    const headInterp = exactHeadIdx - baseIdx;
                    _vec1.copy(pt1).lerp(pt2, headInterp);
                    p.mesh.position.copy(_vec1);

                    // Orient the plane
                    const lookIdx = Math.min(baseIdx + 2, totalPoints - 1);
                    const lookPoint = p.points[lookIdx];
                    if (lookPoint && headProgress < 1.0) {
                        p.mesh.up.copy(p.mesh.position).normalize();
                        p.mesh.lookAt(lookPoint);
                    }

                    // Update all fuzzy lines in the group
                    const TAIL_OFFSET = tailOffset; // Shift trail head to the airplane's tail
                    p.lines.forEach(line => {
                        const exactTailIdx = Math.max(0, p.progress * (totalPoints - 1) - currentTrailLength);
                        const startIdx = Math.floor(exactTailIdx);
                        const drawStart = Math.max(0, Math.min(startIdx, totalPoints - 1));
                        const drawEnd = Math.max(0, Math.floor(exactHeadIdx) - TAIL_OFFSET);
                        const count = Math.max(0, drawEnd - drawStart + 1);
                        line.geometry.setDrawRange(drawStart, count);

                        // Relative Segment Gradient: Tail (0) to Head (1)
                        const colorAttr = line.geometry.getAttribute('color') as THREE.BufferAttribute;
                        if (colorAttr && count > 0) {
                            const colors = colorAttr.array as Float32Array;
                            const range = Math.max(1, currentTrailLength);
                            // Only update indices that are actually in the buffer
                            const sJ = drawStart;
                            const eJ = Math.min(drawEnd, totalPoints - 1);

                            for (let j = sJ; j <= eJ; j++) {
                                // Progress relative to the current tail-head range (clamped to 0..1)
                                const headPos = p.progress * (totalPoints - 1) - TAIL_OFFSET;
                                const segmentProgress = Math.max(0, Math.min(1, (j - (headPos - currentTrailLength)) / range));

                                const alpha = Math.pow(segmentProgress, 0.8);
                                colors[j * 3] = alpha;
                                colors[j * 3 + 1] = alpha;
                                colors[j * 3 + 2] = alpha;
                            }
                            colorAttr.needsUpdate = true;
                        }
                    });

                    // Update persistent dashed trail
                    if (p.currentPersistentLine) {
                        const drawEnd = Math.max(0, Math.floor(exactHeadIdx) - TAIL_OFFSET);
                        p.currentPersistentLine.geometry.setDrawRange(0, drawEnd + 1);
                    }

                    // Unified Lifecycle Opacity (Temporal)
                    let unifiedOpacity = 1.0;
                    if (p.progress < fadeZone) {
                        unifiedOpacity = p.progress / fadeZone;
                    } else if (p.progress > 1.0 - fadeZone) {
                        unifiedOpacity = Math.max(0, (1.0 - p.progress) / fadeZone);
                    }

                    // Plane Mesh: Lands and disappears together with its trail head at 1.0
                    p.mesh.visible = unifiedOpacity > 0.01 && p.progress <= 1.0;
                    if (p.mesh.visible) {
                        p.mesh.traverse((child) => {
                            if (child instanceof THREE.Mesh) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(m => {
                                        m.opacity = unifiedOpacity;
                                        m.transparent = true;
                                        m.depthWrite = true;
                                    });
                                } else if (child.material) {
                                    child.material.opacity = unifiedOpacity;
                                    child.material.transparent = true;
                                    child.material.depthWrite = true;
                                }
                            }
                        });
                    }

                    // Trail Line: Global lifecycle synced PERFECLTY with airplane
                    p.lineGroup.visible = p.progress <= 1.0 && unifiedOpacity > 0.01;
                    if (p.lineGroup.visible) {
                        p.lines.forEach((line, i) => {
                            if (line.material instanceof THREE.LineBasicMaterial) {
                                // Sync material opacity with aircraft unified Lifecycle
                                // This maintains the exact same fade in/out temporal curve
                                line.material.opacity = (i === 0 ? 0.9 : 0.3) * unifiedOpacity;
                                line.material.transparent = true;
                            }
                        });
                    }

                    // Persistent trail visibility: persists during wait cycles until the whole journey cycle resets
                    if (p.persistentGroup) {
                        // Dash trail stays visible once it appears, until the plane restarts its journey
                        p.persistentGroup.visible = p.progress >= 0 && (p.progress <= 1.0 ? unifiedOpacity > 0.01 : true);
                    }
                }
            });

            const updateLabel = (id: string | undefined, labelEl: HTMLElement | null) => {
                const mesh = id ? airportsMap.current[id] : null;
                if (mesh && labelEl && cameraRef.current && mountRef.current) {
                    mesh.getWorldPosition(_vec1);
                    _vec2.copy(cameraRef.current.position).normalize();
                    if (_vec2.dot(_vec1.normalize()) < 0.2) {
                        if (labelEl.style.opacity !== "0") {
                            labelEl.style.opacity = "0";
                            labelEl.style.pointerEvents = "none";
                        }
                        return;
                    }
                    _vec1.copy(mesh.position).project(cameraRef.current);
                    labelEl.style.display = "flex";
                    labelEl.style.opacity = "1";
                    labelEl.style.pointerEvents = "none";
                    labelEl.style.left = `${(_vec1.x * 0.5 + 0.5) * mountRef.current.clientWidth}px`;
                    labelEl.style.top = `${(-_vec1.y * 0.5 + 0.5) * mountRef.current.clientHeight}px`;
                } else if (labelEl) {
                    if (labelEl.style.opacity !== "0") {
                        labelEl.style.opacity = "0";
                        labelEl.style.pointerEvents = "none";
                    }
                }
            };
            activeOriginsEntitiesRef.current.forEach((origin, idx) => {
                updateLabel(getEntityId(origin), originLabelRefs.current[idx] || null);
            });
            activeDestsEntitiesRef.current.forEach((dest, idx) => {
                updateLabel(getEntityId(dest), destLabelRefs.current[idx] || null);
            });
            updateLabel(hoveredEntity ? getEntityId(hoveredEntity) : undefined, hoverLabelRef.current);

            // Integrated Cluster labels into the airport group loop above for performance

            // contextMenu update positioning (sticky to globe)
            const cm = contextMenuRefData.current;
            if (cm.visible && cm.worldPos && contextMenuContainerRef.current && cameraRef.current && mountRef.current) {
                _vec1.copy(cm.worldPos);
                const dot = _camNorm.dot(_vec1.normalize());
                if (dot < 0.1) {
                    if (contextMenuContainerRef.current.style.display !== "none")
                        contextMenuContainerRef.current.style.display = "none";
                } else {
                    if (contextMenuContainerRef.current.style.display !== "block")
                        contextMenuContainerRef.current.style.display = "block";
                    _vec1.copy(cm.worldPos).project(cameraRef.current);
                    const menu = contextMenuContainerRef.current;
                    const containerWidth = mountRef.current.clientWidth;
                    const containerHeight = mountRef.current.clientHeight;
                    const menuWidth = menu.offsetWidth;
                    const menuHeight = menu.offsetHeight;

                    let x = (_vec1.x * 0.5 + 0.5) * containerWidth;
                    let y = (-_vec1.y * 0.5 + 0.5) * containerHeight;

                    // Intelligent positioning: if it overflows right, move it left by its width
                    if (x + menuWidth > containerWidth - 10) {
                        x -= menuWidth;
                    }
                    // If it overflows bottom, move it up by its height
                    if (y + menuHeight > containerHeight - 10) {
                        y -= menuHeight;
                    }

                    // Final clamping to ensure it's never off-screen
                    x = Math.max(10, Math.min(x, containerWidth - menuWidth - 10));
                    y = Math.max(10, Math.min(y, containerHeight - menuHeight - 10));

                    menu.style.left = `${x}px`;
                    menu.style.top = `${y}px`;
                }
            }

            // --- Update Solar System ---
            // The Moon orbits the Earth closely but outside the camera range
            if (moonRef.current) {
                moonTheta += 0.0005; // Cinematic slow orbit
                const moonDist = 10.0;
                moonRef.current.position.set(
                    moonDist * Math.cos(moonTheta),
                    moonDist * Math.sin(moonTheta) * 0.1, // Slight tilt
                    moonDist * Math.sin(moonTheta)
                );
                moonRef.current.lookAt(0, 0, 0); // Acoplamiento de marea: siempre mira a la Tierra
            }

            // The Sun orbits the Earth
            if (sunRef.current) {
                sunTheta += 0.00005; // Very slow solar progression
                const sunDist = 1200;
                sunRef.current.position.set(
                    sunDist * Math.cos(sunTheta),
                    0,
                    sunDist * Math.sin(sunTheta)
                );
                // Update sun light to follow the Sun
                sunLight.position.copy(sunRef.current.position);

                // Rotate the sun's surface independently
                const sunBody = sunRef.current.getObjectByName("sunBody");
                if (sunBody) sunBody.rotation.y += 0.001;
            }

            // Planets orbit the Earth directly (geocentric)
            planetsRef.current.forEach(p => {
                p.theta += p.speed * 0.02; // Minimal planetary movement
                p.mesh.position.set(
                    p.distance * Math.cos(p.theta),
                    p.mesh.position.y, // Maintain its slight ecliptic tilt
                    p.distance * Math.sin(p.theta)
                );
                p.mesh.rotation.y += 0.005; // Self-rotation stays consistent
            });

            // --- Update Shooting Stars and Meteorites ---
            if (Math.random() < 0.015) { // Spawn chance per frame
                const isMeteor = Math.random() < 0.2; // 20% chance it's a meteorite

                // Random spawn point on a large sphere
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const radius = 400 + Math.random() * 200;
                const startPos = new THREE.Vector3(
                    radius * Math.sin(phi) * Math.cos(theta),
                    radius * Math.sin(phi) * Math.sin(theta),
                    radius * Math.cos(phi)
                );

                // Target: somewhere near the origin but with some random offset
                const targetPos = new THREE.Vector3(
                    (Math.random() - 0.5) * 100,
                    (Math.random() - 0.5) * 100,
                    (Math.random() - 0.5) * 100
                );

                const direction = targetPos.clone().sub(startPos).normalize();
                const speed = isMeteor ? 1.5 + Math.random() * 1.5 : 4.0 + Math.random() * 4.0;
                const velocity = direction.multiplyScalar(speed);

                let mesh: THREE.Line | THREE.Group;
                if (isMeteor) {
                    // Meteorite visual: A group with a core and a bright trail
                    const group = new THREE.Group();

                    // Core
                    const coreGeo = new THREE.SphereGeometry(0.5 + Math.random(), 8, 8);
                    const coreMat = new THREE.MeshBasicMaterial({
                        color: 0xffaa00,
                        transparent: true,
                        opacity: 0.9
                    });
                    const core = new THREE.Mesh(coreGeo, coreMat);
                    group.add(core);

                    // Glow/Fire Trail (using a line for simplicity but could be more complex)
                    const trailPoints = [new THREE.Vector3(0, 0, 0), direction.clone().multiplyScalar(-15)];
                    const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
                    const trailMat = new THREE.LineBasicMaterial({
                        color: 0xff4400,
                        transparent: true,
                        opacity: 0.6,
                        linewidth: 2
                    });
                    const trail = new THREE.Line(trailGeo, trailMat);
                    group.add(trail);

                    mesh = group;
                } else {
                    // Shooting star visual: A simple bright line
                    const points = [new THREE.Vector3(0, 0, 0), direction.clone().multiplyScalar(-10)];
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const material = new THREE.LineBasicMaterial({
                        color: 0x88ccff,
                        transparent: true,
                        opacity: 0.8
                    });
                    mesh = new THREE.Line(geometry, material);
                }

                // Pre-store materials for fast opacity updates in animate loop
                const mats: THREE.Material[] = [];
                mesh.traverse(c => {
                    if ((c as any).material) {
                        const m = (c as any).material as THREE.Material;
                        m.transparent = true;
                        m.userData.baseOpacity = m.opacity;
                        mats.push(m);
                    }
                });
                mesh.userData.materials = mats;

                mesh.position.copy(startPos);
                shootingStarGroupRef.current.add(mesh);
                shootingStarsRef.current.push({
                    mesh,
                    velocity,
                    life: 0,
                    maxLife: isMeteor ? 120 + Math.random() * 100 : 40 + Math.random() * 30,
                    isMeteor
                });
            }

            // Update existing shooting stars
            for (let i = shootingStarsRef.current.length - 1; i >= 0; i--) {
                const s = shootingStarsRef.current[i];
                if (!s) continue;

                s.life++;
                s.mesh.position.add(s.velocity);

                const alpha = 1 - (s.life / s.maxLife);
                if (Array.isArray(s.mesh.userData.materials)) {
                    s.mesh.userData.materials.forEach((m: THREE.Material) => {
                        m.opacity = (m.userData.baseOpacity || 1) * alpha;
                    });
                } else if (s.mesh instanceof THREE.Line) {
                    (s.mesh.material as THREE.LineBasicMaterial).opacity = 0.8 * alpha;
                }

                if (s.life >= s.maxLife) {
                    shootingStarGroupRef.current.remove(s.mesh);
                    if (s.mesh instanceof THREE.Line) {
                        s.mesh.geometry.dispose();
                        (s.mesh.material as THREE.Material).dispose();
                    } else {
                        s.mesh.traverse(child => {
                            if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
                                child.geometry.dispose();
                                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                                else child.material.dispose();
                            }
                        });
                    }
                    shootingStarsRef.current.splice(i, 1);
                }
            }

            renderer.render(scene, camera);
        };
        animationId = requestAnimationFrame(animate);



        const onResize = () => {
            const w = mount.clientWidth;
            const h = mount.clientHeight;
            if (!w || !h || !rendererRef.current || !cameraRef.current) return;

            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };

        const resizeObserver = new ResizeObserver(() => {
            onResize();
        });
        resizeObserver.observe(mount);

        return () => {
            cancelAnimationFrame(animationId);
            resizeObserver.disconnect();
            renderer.domElement.removeEventListener("click", onClick);
            renderer.domElement.removeEventListener("contextmenu", onContextMenu);
            renderer.domElement.removeEventListener("mousemove", onMouseMove);
            renderer.domElement.removeEventListener("mouseleave", onMouseLeave);

            renderer.domElement.removeEventListener('wheel', onWheel);
            controls.removeEventListener('change', onControlsChange);
            controls.dispose();
            if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);

            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
            renderer.dispose();
            rendererRef.current = null;
            cameraRef.current = null;
            sceneRef.current = null;
            controlsRef.current = null;

            airportGroupRef.current.children.forEach(c => disposeObject(c));
            airportGroupRef.current.clear();
            labelGroupRef.current.children.forEach(c => disposeObject(c));
            labelGroupRef.current.clear();
            countryLabelsGroupRef.current.children.forEach(c => disposeObject(c));
            countryLabelsGroupRef.current.clear();
            starGroupRef.current.children.forEach(c => disposeObject(c));
            starGroupRef.current.clear();
            shootingStarGroupRef.current.children.forEach(c => disposeObject(c));
            shootingStarGroupRef.current.clear();
            shootingStarsRef.current = [];
            solarGroupRef.current.children.forEach(c => disposeObject(c));
            solarGroupRef.current.clear();
            if (moonRef.current) disposeObject(moonRef.current);
            planetsRef.current = [];
            arcsGroupRef.current.children.forEach(c => disposeObject(c));
            arcsGroupRef.current.clear();
            earthGroupRef.current.children.forEach(c => disposeObject(c));
            earthGroupRef.current.clear();
        };
    }, []);

    // 1.5 Load Country Labels for hover interaction
    useEffect(() => {
        fetch('/country_labels.json')
            .then(res => res.json())
            .then(data => {
                countryLabelsGroupRef.current.clear();
                data.forEach((c: any) => {
                    const pos = latLonToVector3(c.lat, c.lon, 1.006);

                    // Use translated name if available
                    // TODO: Implement i18n
                    let displayName = c.name;
                    if (c.iso) {
                        displayName = t(`countries.${c.iso}`, { defaultValue: c.name });
                    }

                    const texture = getCountryLabelTexture(displayName);
                    if (texture) {
                        const material = new THREE.MeshBasicMaterial({
                            map: texture,
                            transparent: true,
                            opacity: 0,
                            depthTest: true,
                            depthWrite: false,
                        });
                        const geometry = new THREE.PlaneGeometry(1, 1);
                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.position.copy(pos);

                        // Orient mesh to face outward AND stay "straight" (North-South)
                        const normal = pos.clone().normalize();
                        let worldUp = new THREE.Vector3(0, 1, 0);
                        // Handle poles case
                        if (Math.abs(normal.dot(worldUp)) > 0.99) worldUp.set(0, 0, 1);

                        const right = new THREE.Vector3().crossVectors(worldUp, normal).normalize();
                        const labelUp = new THREE.Vector3().crossVectors(normal, right).normalize();

                        const matrix = new THREE.Matrix4().makeBasis(right, labelUp, normal);
                        mesh.quaternion.setFromRotationMatrix(matrix);

                        const aspect = (texture.image as any).width / (texture.image as any).height;
                        const baseScale = 0.035 * (c.scale || 1);
                        mesh.scale.set(baseScale * aspect, baseScale, 1);
                        mesh.userData = { customScale: c.scale || 1 };
                        mesh.visible = false;
                        countryLabelsGroupRef.current.add(mesh);
                    }
                });
            })
            .catch(err => console.error("Error loading country labels:", err));
    }, []);

    const selectedAirportsString = selectedAirports.join(',');

    // 2. Load and process airports from API (Hitbox-based Clustering)
    useEffect(() => {
        if (!isAirportsLoaded || !globeAirports) return;

        const hM = isMobileRef.current ? 1.4 : 1.0;
        const forcedSet = new Set([
            ...selectedAirports,
            ...originsIata,
            ...allStepsIata,
            ...destinationsIata,
            hoveredEntityId,
            ...origins.filter(isCity).map(getEntityId),
            ...destinations.filter(isCity).map(getEntityId)
        ].filter(Boolean) as string[]);

        // 1. Calculate items first for differential update logic
        const cacheKey = `${clusterThreshold.toFixed(4)}_${forcedEntitiesKey}`;
        let items: GlobeItem[] = clusteredDataCacheRef.current[cacheKey];
        if (!items) {
            const forcedCitiesRaw = [...origins, ...destinations].filter(isCity);
            if (hoveredEntity && isCity(hoveredEntity)) {
                forcedCitiesRaw.push(hoveredEntity);
            }
            // Deduplicate cities by ID to prevent multiple skylines at the same spot
            const forcedCities = Array.from(new Map(forcedCitiesRaw.map(c => [getEntityId(c), c])).values());
            items = getClusteredAirports(globeAirports!, clusterThreshold, forcedSet, hM, stepsIata, forcedCities);
            clusteredDataCacheRef.current[cacheKey] = items;
        }

        const newItemIds = new Set(items.map(it => it.id));

        // 2. Map existing objects for reuse
        const existingMeshes = new Map<string, THREE.Mesh>();
        airportGroupRef.current.children.forEach(c => {
            const mesh = (c as THREE.Mesh);
            if (mesh.userData.id) existingMeshes.set(mesh.userData.id, mesh);
        });

        // 3. Identification pass: Move leavers to fade out, keep stayers
        for (let i = airportGroupRef.current.children.length - 1; i >= 0; i--) {
            const mesh = airportGroupRef.current.children[i] as THREE.Mesh;
            const id = mesh.userData.id;
            if (!newItemIds.has(id)) {
                // Leaver: gracefully fade out
                mesh.userData.isFadingOut = true;
                if (mesh.userData.visualMesh) (mesh.userData.visualMesh.material as THREE.Material).transparent = true;
                fadingOutGroupRef.current.add(mesh);

                // Also move its labels if any
                if (mesh.userData.labelMesh) fadingOutLabelsRef.current.add(mesh.userData.labelMesh);
                if (mesh.userData.stemMesh) fadingOutLabelsRef.current.add(mesh.userData.stemMesh);
                if (mesh.userData.anchorMesh) fadingOutLabelsRef.current.add(mesh.userData.anchorMesh);
            }
        }

        // --- Important: Re-initialize airportsMap to fresh state for the current pass ---
        airportsMap.current = {};

        // 4. Build or Update Scene: Use camera-aware scaling to prevent "always-big" markers
        const camDist = cameraRef.current ? cameraRef.current.position.length() : 3.2;
        const sFact = camDist / 3.2;
        const hitboxMult = isMobileRef.current ? 2.5 : 1.0;
        const invHitboxMult = 1 / hitboxMult;

        items.forEach(item => {
            const isOrigin = item.isCity ? origins.some(o => isCity(o) && getEntityId(o) === item.id) : originsIata.includes(item.iata);
            const isDest = item.isCity ? destinations.some(d => isCity(d) && getEntityId(d) === item.id) : destinationsIata.includes(item.iata);
            const stepIdx = item.isCity ? -1 : stepsIata.findIndex(step => step.includes(item.iata));
            const isStep = stepIdx !== -1;
            const isSelected = item.isCity ? (hoveredEntityId === item.id) : (selectedAirports.includes(item.iata) || (hoveredEntity && isAirport(hoveredEntity) && hoveredEntity.iata_code === item.iata));
            const isSpecial = isOrigin || isDest || isStep || isSelected;

            let meshColor = getThemeColorHex('--color-brand', 0x4f46e5);
            if (isOrigin || isDest || isStep) {
                const originColor = getThemeColorHex('--color-origin', 0x0891b2);
                const destColor = getThemeColorHex('--color-destination', 0xc026d3);
                if (isOrigin) meshColor = originColor;
                else if (isDest) meshColor = destColor;
                else {
                    const t = (stepIdx + 1) / (stepsIata.length + 1);
                    meshColor = new THREE.Color(originColor).lerp(new THREE.Color(destColor), t).getHex();
                }
            } else if (isSpecial) meshColor = 0x34d399; // Emerald 400 (Premium selection color)

            let mesh = existingMeshes.get(item.id);

            if (!mesh) {
                mesh = new THREE.Mesh(
                    item.isCluster ? sharedClusterGeo.current : (item.isCity ? sharedCityGeo.current : sharedAirportGeo.current),
                    new THREE.MeshBasicMaterial({
                        color: meshColor,
                        transparent: true,
                        opacity: 0,
                        depthWrite: false,
                    })
                );

                // Correct initial scale: use camDist to prevent popping
                const initialBaseScale = isSpecial ? (item.isCluster ? 7 : 22) : (item.isCluster ? 4 : 1.8);

                // Position hitboxes slightly above surface for better raycasting and to match visual altitude
                const altitudeOffset = item.isCluster ? 1.015 : 1.005;
                mesh.scale.setScalar(initialBaseScale * sFact * hitboxMult);
                mesh.position.copy(item.v3).multiplyScalar(altitudeOffset);
                mesh.userData = { ...item, isAirportObject: true, isSpecial, id: item.id };
                mesh.renderOrder = isSpecial ? 10 : 2;
                airportGroupRef.current.add(mesh);

                // Visual child
                let visualGeo: THREE.BufferGeometry = item.isCluster ? sharedClusterGeo.current : sharedAirportGeo.current;
                if (item.isCity) {
                    // Skyscraper visual: Match airport base width (0.0004) so they scale the same
                    visualGeo = new THREE.BoxGeometry(0.0004, 0.0004, 0.002);
                    visualGeo.translate(0, 0, 0.001);
                }

                const visual = new THREE.Mesh(
                    visualGeo,
                    new THREE.MeshBasicMaterial({
                        color: meshColor,
                        transparent: true,
                        opacity: isSpecial ? 1 : 0,
                        depthWrite: false,
                    })
                );
                visual.raycast = () => { }; // Disable individual raycasting on the visual mesh

                if (item.isCity) {
                    // Skyline: add secondary buildings around the main one sharing the same material
                    const b2Geo = new THREE.BoxGeometry(0.0004, 0.0004, 0.0016);
                    b2Geo.translate(0, 0, 0.0008);
                    const b2 = new THREE.Mesh(b2Geo, visual.material);
                    b2.raycast = () => { };
                    b2.position.set(0.0006, 0.0003, 0);
                    visual.add(b2);

                    const b3Geo = new THREE.BoxGeometry(0.00035, 0.00035, 0.0012);
                    b3Geo.translate(0, 0, 0.0006);
                    const b3 = new THREE.Mesh(b3Geo, visual.material);
                    b3.raycast = () => { };
                    b3.position.set(-0.0005, -0.0004, 0);
                    visual.add(b3);

                    const b4Geo = new THREE.BoxGeometry(0.0003, 0.0003, 0.0008);
                    b4Geo.translate(0, 0, 0.0004);
                    const b4 = new THREE.Mesh(b4Geo, visual.material);
                    b4.raycast = () => { };
                    b4.position.set(0.0002, -0.0007, 0);
                    visual.add(b4);

                    // Point skyline outwards from center
                    _vec1.copy(mesh.position).multiplyScalar(2);
                    visual.lookAt(_vec1);
                }
                visual.scale.setScalar(invHitboxMult);
                mesh.add(visual);
                mesh.userData.visualMesh = visual;

                // Handle Labels/Cluster visuals
                if (item.isCluster) {
                    const texture = getClusterTexture(item.airports.length);
                    if (texture) {
                        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
                        sprite.position.copy(item.v3).multiplyScalar(1.015);
                        sprite.renderOrder = 20;
                        sprite.scale.setScalar(0.012);
                        sprite.visible = false;
                        labelGroupRef.current.add(sprite);
                        mesh.userData.labelMesh = sprite;
                    }

                    const stemPoints: THREE.Vector3[] = [];
                    item.airports.forEach((a: any) => {
                        const targetPos = latLonToVector3(a.lat, a.lon, 1.001);
                        stemPoints.push(item.v3.clone().multiplyScalar(1.015));
                        stemPoints.push(targetPos);
                    });

                    if (stemPoints.length > 0) {
                        const stemGeo = new THREE.BufferGeometry().setFromPoints(stemPoints);
                        const stemMat = new THREE.LineBasicMaterial({ color: meshColor, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
                        const stems = new THREE.LineSegments(stemGeo, stemMat);
                        stems.renderOrder = 18;
                        stems.visible = false;
                        labelGroupRef.current.add(stems);
                        mesh.userData.stemMesh = stems;

                        const anchorGeo = new THREE.BufferGeometry().setFromPoints(stemPoints.filter((_, i) => i % 2 === 1));
                        const anchorMat = new THREE.PointsMaterial({ color: meshColor, size: 0.0015, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
                        const anchors = new THREE.Points(anchorGeo, anchorMat);
                        anchors.renderOrder = 19;
                        anchors.visible = false;
                        labelGroupRef.current.add(anchors);
                        mesh.userData.anchorMesh = anchors;
                    }
                } else if (item.stepIdx !== undefined) {
                    const texture = getScaleTexture(item.stepIdx + 1);
                    if (texture) {
                        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
                        sprite.position.copy(item.v3).multiplyScalar(1.015);
                        sprite.renderOrder = 20;
                        sprite.scale.setScalar(0.012);
                        sprite.visible = false;
                        labelGroupRef.current.add(sprite);
                        mesh.userData.labelMesh = sprite;
                    }
                }
            } else {
                // Reuse and update position/userData (Repulsion might have shifted it)
                const alt = item.isCluster ? 1.015 : 1.005;
                _vec1.copy(item.v3).multiplyScalar(alt);

                if (mesh.position.distanceTo(_vec1) > 0.0001) {
                    gsap.to(mesh.position, {
                        x: _vec1.x,
                        y: _vec1.y,
                        z: _vec1.z,
                        duration: 0.4,
                        ease: "power2.out"
                    });

                    if (mesh.userData.labelMesh) {
                        gsap.to(mesh.userData.labelMesh.position, {
                            x: item.v3.x * 1.015,
                            y: item.v3.y * 1.015,
                            z: item.v3.z * 1.015,
                            duration: 0.4,
                            ease: "power2.out"
                        });
                    }
                    if (mesh.userData.stemMesh) {
                        const stemPoints: THREE.Vector3[] = [];
                        item.airports.forEach((a: any) => {
                            const targetPos = latLonToVector3(a.lat, a.lon, 1.001);
                            stemPoints.push(item.v3.clone().multiplyScalar(1.015));
                            stemPoints.push(targetPos);
                        });
                        mesh.userData.stemMesh.geometry.dispose();
                        mesh.userData.stemMesh.geometry = new THREE.BufferGeometry().setFromPoints(stemPoints);
                    }
                }

                // Update properties
                mesh.userData = { ...mesh.userData, ...item, isAirportObject: true, isSpecial, id: item.id, isFadingOut: false };
                mesh.renderOrder = isSpecial ? 10 : 2;
                const mat = (mesh.userData.visualMesh ? (mesh.userData.visualMesh.material as THREE.MeshBasicMaterial) : (mesh.material as THREE.MeshBasicMaterial));
                if (mat.color.getHex() !== meshColor) mat.color.setHex(meshColor);
            }

            // Always update mapping
            if (item.isCluster) {
                item.airports.forEach((a: any) => {
                    if (a && a.iata) airportsMap.current[a.iata] = mesh!;
                });
            } else if (item.isCity) {
                airportsMap.current[item.id] = mesh!;
            } else {
                airportsMap.current[item.iata] = mesh!;
            }
        });

        const airDataMapped = globeAirports.map(a => ({ iata: a.i, lat: a.la, lon: a.lo, name: a.n, city: a.ci, v3: latLonToVector3(a.la, a.lo) }));
        airportsDataRef.current = airDataMapped;
        setIsLoaded(true);
    }, [isAirportsLoaded, globeAirports, clusterThreshold, forcedEntitiesKey]);

    // 2.5 Style Update Effect (Updates marker visual state WITHOUT rebuilding scene)
    useEffect(() => {
        if (!isLoaded) return;
        const brandColor = getThemeColorHex('--color-brand', 0x4f46e5);
        const originColor = getThemeColorHex('--color-origin', 0x0891b2);
        const destColor = getThemeColorHex('--color-destination', 0xc026d3);
        const layoverColor = 0x00ff00; // Consistent color for layovers

        const selSet = new Set(selectedAirports);
        const hoveredIata = hoveredEntity && isAirport(hoveredEntity) ? hoveredEntity.iata_code : null;
        if (hoveredIata) selSet.add(hoveredIata);

        airportGroupRef.current.children.forEach(child => {
            const mesh = child as THREE.Mesh;
            const item = mesh.userData;
            const visual = mesh.userData.visualMesh as THREE.Mesh;
            const mat = (visual ? visual.material : mesh.material) as THREE.MeshBasicMaterial;

            if (!item.isCluster) {
                const isOrigin = item.isCity ? origins.some(o => isCity(o) && getEntityId(o) === item.id) : originsIata.includes(item.iata);
                const isDest = item.isCity ? destinations.some(d => isCity(d) && getEntityId(d) === item.id) : destinationsIata.includes(item.iata);
                const stepIdx = item.isCity ? -1 : stepsIata.findIndex(step => step.includes(item.iata));
                const isStep = stepIdx !== -1;

                if (isOrigin || isDest || isStep) {
                    let meshColor = isOrigin ? originColor : (isDest ? destColor : brandColor);
                    if (isStep) {
                        const t = (stepIdx + 1) / (stepsIata.length + 1);
                        meshColor = new THREE.Color(originColor).lerp(new THREE.Color(destColor), t).getHex();
                    }
                    mat.color.setHex(meshColor);
                } else if (item.isCity) {
                    mat.color.setHex(brandColor);
                } else if (selSet.has(item.iata)) {
                    mat.color.setHex(0x34d399); // Emerald 400
                } else {
                    mat.color.setHex(brandColor);
                }
            } else {
                // Determine if cluster contains a special airport for color indication
                let hasOriginDestOrStep = false;
                let hasSelected = false;
                for (let i = 0; i < item.airports.length; i++) {
                    const iata = item.airports[i].iata;
                    if (originsIata.includes(iata) || destinationsIata.includes(iata) || allStepsIata.includes(iata)) {
                        hasOriginDestOrStep = true;
                    }
                    if (selSet.has(iata)) {
                        hasSelected = true;
                    }
                }

                // Clusters are indicator sprites, base mesh stays hidden unless debugging.
                mat.color.setHex(brandColor);
                mat.opacity = DEBUG_HITBOXES ? 0.3 : 0;
                mat.wireframe = DEBUG_HITBOXES;
            }
        });
    }, [isLoaded, originsIata, destinationsIata, selectedAirports.join(','), stepsIata, hoveredEntity && getEntityId(hoveredEntity)]);
    // 3. Update Interactive State
    useEffect(() => {
        if (controlsRef.current) controlsRef.current.enabled = interactive;
    }, [interactive]);

    // 3. Update Camera Horizontal Offset
    useEffect(() => {
        const camera = cameraRef.current;
        const mount = mountRef.current;
        if (!camera || !mount) return;

        gsap.to(currentOffsetRef.current, {
            val: horizontalOffset,
            duration: 0.8,
            ease: "power3.out",
            onUpdate: () => {
                const w = mount.clientWidth, h = mount.clientHeight;
                const offset = currentOffsetRef.current.val;
                if (offset !== 0) {
                    camera.setViewOffset(w, h, -offset, 0, w, h);
                } else {
                    camera.clearViewOffset();
                }
                camera.updateProjectionMatrix();
            }
        });
    }, [horizontalOffset]);

    // 4. Handle Resize
    useEffect(() => {
        const handleResize = () => {
            const mount = mountRef.current;
            const renderer = rendererRef.current;
            const camera = cameraRef.current;
            if (!mount || !renderer || !camera) return;
            const w = mount.clientWidth, h = mount.clientHeight;
            camera.aspect = w / h;
            const offset = currentOffsetRef.current.val;
            if (offset !== 0) camera.setViewOffset(w, h, -offset, 0, w, h);
            else camera.clearViewOffset();
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);

        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [horizontalOffset]);

    // 6. Handle itinerary planes creation (Flight path remains stable)
    useEffect(() => {
        if (!isLoaded || !sceneRef.current || !modelLoaded) return;

        // Stability check: Bail out if itinerary content hasn't changed
        // This prevents planes from restarting if the parent re-renders while moving/zooming the globe
        const currentKey = JSON.stringify(originsIata) + JSON.stringify(stepsIata) + JSON.stringify(destinationsIata);
        if (lastItineraryKeyRef.current === currentKey) return;
        lastItineraryKeyRef.current = currentKey;

        // Surgical clear: only remove itinerary planes
        planesRef.current = planesRef.current.filter(p => {
            if (!p.isAmbient) {
                if (p.mesh) {
                    arcsGroupRef.current.remove(p.mesh);
                    disposeObject(p.mesh);
                }
                if (p.lineGroup) {
                    arcsGroupRef.current.remove(p.lineGroup);
                    disposeObject(p.lineGroup);
                }
                if (p.persistentGroup) {
                    arcsGroupRef.current.remove(p.persistentGroup);
                    disposeObject(p.persistentGroup);
                }
                return false;
            }
            return true;
        });

        // Draw Arcs for consecutive legs: Origins -> Step 1 -> ... -> Destinations
        const representativeOrigins = origins.map(o => isCity(o) ? o.airports[0]?.iata_code : o.iata_code).filter(Boolean) as string[];
        const representativeDestinations = destinations.map(d => isCity(d) ? d.airports[0]?.iata_code : d.iata_code).filter(Boolean) as string[];
        const layers = [representativeOrigins, ...stepsIata, representativeDestinations];
        const brandColorHex = getThemeColorHex('--color-brand', 0x4f46e5);
        const brandColor = new THREE.Color(brandColorHex);

        // Instead of redundant planes per route, we use exactly one logical plane 
        // per starting origin entity (city or airport), capped at 3 to keep the map clean.
        const startingOrigins = layers[0] || [];
        const numPlanesToSpawn = Math.min(3, startingOrigins.length);

        for (let i = 0; i < numPlanesToSpawn; i++) {
            const startIata = startingOrigins[i % startingOrigins.length]!;
            const nextLayer = layers[1] || [];
            if (nextLayer.length === 0) continue;
            const endIata = nextLayer[Math.floor(Math.random() * nextLayer.length)];

            const origin = airportsDataRef.current.find(a => a.iata === startIata);
            const dest = airportsDataRef.current.find(a => a.iata === endIata);

            if (origin && dest) {
                const getPos = (iata: string, lat: number, lon: number) => {
                    const mesh = airportsMap.current[iata];
                    if (mesh) return mesh.position.clone();
                    return latLonToVector3(Number(lat), Number(lon));
                };

                const start = getPos(origin.iata, origin.lat, origin.lon);
                const end = getPos(dest.iata, dest.lat, dest.lon);
                const dist = start.distanceTo(end);
                const samples = Math.max(200, Math.floor(dist * 600));
                const cruiseAltitude = (dist * 0.016);
                const points: THREE.Vector3[] = [];

                for (let j = 0; j <= samples; j++) {
                    const t = j / samples;
                    const point = new THREE.Vector3().copy(start).lerp(end, t).normalize();
                    const altitude = 1.002 + (Math.sin(Math.PI * t) * cruiseAltitude);
                    point.multiplyScalar(altitude);
                    points.push(point);
                }

                const curve = new THREE.CatmullRomCurve3(points);
                const spacedPoints = curve.getSpacedPoints(samples);

                let planeMesh: THREE.Object3D;
                if (airplaneModelRef.current) {
                    const group = new THREE.Group();
                    const model = airplaneModelRef.current.clone();
                    model.scale.setScalar(0.025);
                    model.rotateY(-Math.PI / 2);
                    group.add(model);
                    planeMesh = group;

                    model.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material = child.material.map(m => {
                                        const mc = m.clone();
                                        mc.transparent = true;
                                        mc.opacity = 1;
                                        mc.depthWrite = true;
                                        if ('emissive' in mc) {
                                            (mc as any).emissive = brandColor;
                                            (mc as any).emissiveIntensity = 2;
                                        }
                                        return mc;
                                    });
                                } else {
                                    child.material = child.material.clone();
                                    child.material.transparent = true;
                                    child.material.opacity = 1;
                                    child.material.depthWrite = true;
                                    if ('emissive' in child.material) {
                                        (child.material as any).emissive = brandColor;
                                        (child.material as any).emissiveIntensity = 2;
                                    }
                                }
                            }
                        }
                    });
                } else {
                    planeMesh = new THREE.Mesh(
                        new THREE.SphereGeometry(0.005, 12, 12),
                        new THREE.MeshStandardMaterial({
                            color: brandColor,
                            emissive: brandColor,
                            emissiveIntensity: 3,
                            transparent: true,
                            depthWrite: false
                        })
                    );
                }
                planeMesh.traverse(c => { c.renderOrder = 15; });

                const lineGroup = new THREE.Group();
                const lineList: THREE.Line[] = [];
                const lineInfo = [
                    { h: 0, r: 0, op: 0.9 },
                    { h: 0.001, r: 0.001, op: 0.3 },
                    { h: -0.001, r: -0.001, op: 0.3 }
                ];

                lineInfo.forEach((info, idx) => {
                    const fuzzyP = generateFuzzyPoints(spacedPoints, info.h, info.r, 0.4, idx);
                    const geo = new THREE.BufferGeometry().setFromPoints(fuzzyP);
                    if (geo.getAttribute('position')) (geo.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
                    geo.setDrawRange(0, 0);

                    const mat = new THREE.LineBasicMaterial({
                        color: brandColor,
                        transparent: true,
                        opacity: info.op,
                        depthWrite: false,
                        vertexColors: true
                    });
                    const l = new THREE.Line(geo, mat);
                    l.geometry.computeBoundingSphere();
                    l.renderOrder = 15;
                    const colorArr = new Float32Array(spacedPoints.length * 3).fill(1);
                    l.geometry.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
                    patchStelaMaterial(l.material as THREE.LineBasicMaterial);
                    lineGroup.add(l);
                    lineList.push(l);
                });
                lineGroup.renderOrder = 15;
                arcsGroupRef.current.add(lineGroup);

                // Persistent trail group for multi-leg itineraries
                const persistentGroup = new THREE.Group();
                let currentPersistentLine: THREE.Line | null = null;
                if (layers.length > 2) {
                    const dashMat = new THREE.LineDashedMaterial({
                        color: brandColor,
                        dashSize: 0.004,
                        gapSize: 0.003,
                        transparent: true,
                        opacity: 0.35,
                        depthWrite: true
                    });
                    const dashGeo = new THREE.BufferGeometry().setFromPoints(spacedPoints);
                    const dashLine = new THREE.Line(dashGeo, dashMat);
                    dashLine.computeLineDistances();
                    dashLine.geometry.setDrawRange(0, 0);
                    dashLine.renderOrder = 15;
                    persistentGroup.add(dashLine);
                    currentPersistentLine = dashLine;
                }
                persistentGroup.renderOrder = 15;
                arcsGroupRef.current.add(lineGroup);
                arcsGroupRef.current.add(persistentGroup);

                planeMesh.renderOrder = 15;

                planesRef.current.push({
                    mesh: planeMesh,
                    curve,
                    points: spacedPoints,
                    lineGroup,
                    lines: lineList,
                    progress: -Math.random() * 0.5,
                    speed: (0.002) / (1 + dist * 2),
                    totalLength: curve.getLength(),
                    // Use fixed wait if first leg is a scale (multi-leg itinerary)
                    waitDuration: (layers.length > 2 ? 0.4 : (0.15 + Math.pow(Math.random(), 2) * 1.5)) / (1 + dist * 1.2),
                    currentLayerIndex: 1, // Next layer to visit
                    arrivalIata: endIata,
                    persistentGroup,
                    currentPersistentLine
                });
                arcsGroupRef.current.add(planeMesh);
            }
        }
    }, [isLoaded, originsIata, stepsIata, destinationsIata, modelLoaded]);

    const ambientStartedRef = useRef(false);
    // 6.5 Handle ambient planes creation (Only runs once)
    useEffect(() => {
        if (!isLoaded || !sceneRef.current || !modelLoaded || ambientStartedRef.current) return;
        ambientStartedRef.current = true;

        const airData = airportsDataRef.current;
        if (airData.length >= 2) {
            const ambientCount = 6;
            for (let i = 0; i < ambientCount; i++) {
                let origin = airData[Math.floor(Math.random() * airData.length)];
                let dest = airData[Math.floor(Math.random() * airData.length)];
                if (!origin || !dest || origin === dest) continue;

                const getPos = (iata: string, lat: number, lon: number) => {
                    const mesh = airportsMap.current[iata];
                    if (mesh) return mesh.position.clone();
                    return latLonToVector3(Number(lat), Number(lon));
                };

                const start = getPos(origin.iata, origin.lat, origin.lon);
                const endPos = getPos(dest.iata, dest.lat, dest.lon);
                const dist = start.distanceTo(endPos);
                const samples = Math.max(200, Math.floor(dist * 600));
                const cruiseAltitude = (dist * 0.016);
                const points: THREE.Vector3[] = [];

                for (let j = 0; j <= samples; j++) {
                    const t = j / samples;
                    const point = new THREE.Vector3().copy(start).lerp(endPos, t).normalize();
                    const altitude = 1.002 + (Math.sin(Math.PI * t) * cruiseAltitude);
                    point.multiplyScalar(altitude);
                    points.push(point);
                }

                const curve = new THREE.CatmullRomCurve3(points);
                const spacedPoints = curve.getSpacedPoints(samples);

                let planeMesh: THREE.Object3D;
                if (airplaneModelRef.current) {
                    const group = new THREE.Group();
                    const model = airplaneModelRef.current.clone();
                    model.scale.setScalar(0.025);
                    model.rotateY(-Math.PI / 2);
                    group.add(model);
                    planeMesh = group;

                    model.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material = child.material.map((m: any) => {
                                        const mc = m.clone();
                                        mc.transparent = true;
                                        mc.opacity = 1;
                                        mc.depthWrite = true;
                                        if ('emissive' in mc) {
                                            (mc as any).emissive = new THREE.Color(0xffffff);
                                            (mc as any).emissiveIntensity = 2;
                                        }
                                        return mc;
                                    });
                                } else {
                                    child.material = child.material.clone();
                                    child.material.transparent = true;
                                    child.material.opacity = 1;
                                    child.material.depthWrite = true;
                                    if ('emissive' in child.material) {
                                        (child.material as any).emissive = new THREE.Color(0xffffff);
                                        (child.material as any).emissiveIntensity = 2;
                                    }
                                }
                            }
                        }
                    });
                } else {
                    planeMesh = new THREE.Mesh(
                        new THREE.SphereGeometry(0.005),
                        new THREE.MeshBasicMaterial({
                            color: 0xffffff,
                            transparent: true,
                            depthWrite: true
                        })
                    );
                }
                planeMesh.traverse(c => { c.renderOrder = 15; });

                const lineGroup = new THREE.Group();
                const lineList: THREE.Line[] = [];
                const lineMats = [
                    { h: 0, r: 0, op: 0.4 },
                    { h: 0.001, r: 0.001, op: 0.15 },
                    { h: -0.001, r: -0.001, op: 0.15 }
                ];
                lineMats.forEach((mInfo, i) => {
                    const fuzzyP = generateFuzzyPoints(spacedPoints, mInfo.h, mInfo.r, 0.4, i);
                    const mat = new THREE.LineBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: mInfo.op,
                        depthWrite: false,
                        vertexColors: true
                    });
                    const trailLine = new THREE.Line(
                        new THREE.BufferGeometry().setFromPoints(fuzzyP),
                        mat
                    );
                    trailLine.renderOrder = 15;
                    const colorArr = new Float32Array(spacedPoints.length * 3).fill(1);
                    trailLine.geometry.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
                    patchStelaMaterial(mat);
                    lineGroup.add(trailLine);
                    lineList.push(trailLine);
                });

                lineGroup.renderOrder = 15;
                planeMesh.renderOrder = 15;

                const speed = (0.001 + Math.random() * 0.001) / (1 + dist * 2);

                planesRef.current.push({
                    mesh: planeMesh,
                    curve: curve,
                    points: spacedPoints,
                    lineGroup: lineGroup,
                    lines: lineList,
                    progress: -Math.random() * 0.8, // Slightly more staggered start
                    speed: speed,
                    totalLength: curve.getLength(),
                    isAmbient: true,
                    waitDuration: (0.2 + Math.pow(Math.random(), 2) * 1.6) / (1 + dist * 1.2)
                });
                arcsGroupRef.current.add(lineGroup);
                arcsGroupRef.current.add(planeMesh);
            }
        }
    }, [isLoaded, modelLoaded]);

    // 7. Handle camera positioning (Direct Action Driven)
    const lastPropsRef = useRef({ originsIata, destinationsIata, focusIata, interactive, selectedAirports: [] as string[], debouncedHoveredIata: null as string | null });

    useEffect(() => {
        if (!isLoaded || !cameraRef.current) return;

        const prev = lastPropsRef.current;
        const current = { originsIata, destinationsIata, focusIata, interactive, selectedAirports, debouncedHoveredIata };
        lastPropsRef.current = current;

        // Determine if we should trigger a camera movement based on what changed
        let autoTarget: { type: 'focus' | 'route' | 'single' | 'home'; iata?: string } | null = null;

        const originsChanged = JSON.stringify(current.originsIata) !== JSON.stringify(prev.originsIata);
        const destsChanged = JSON.stringify(current.destinationsIata) !== JSON.stringify(prev.destinationsIata);
        const focusChanged = current.focusIata !== prev.focusIata;
        const selectedChanged = JSON.stringify(current.selectedAirports) !== JSON.stringify(prev.selectedAirports);
        const interactiveChanged = current.interactive !== prev.interactive;
        const hoveredChanged = debouncedHoveredIata !== prev.debouncedHoveredIata;

        const allActiveIatas = [...new Set([
            ...current.originsIata,
            ...allStepsIata,
            ...current.destinationsIata,
            ...current.selectedAirports,
            debouncedHoveredIata
        ])].filter(Boolean) as string[];

        // Default "itinerary" target based on current state.
        // Focus (inspection) takes priority over the route framing.
        const getAutoTarget = (): { type: 'focus' | 'route' | 'single' | 'home'; iata?: string } => {
            if (current.focusIata) return { type: 'focus', iata: current.focusIata };
            if (allActiveIatas.length >= 2) return { type: 'route' };
            if (allActiveIatas.length === 1) return { type: 'single', iata: allActiveIatas[0] };
            return { type: 'home' };
        };

        if (originsChanged || destsChanged || selectedChanged || focusChanged || hoveredChanged) {
            // Route, selection, focus, or debounced hover was modified
            autoTarget = getAutoTarget();
        } else if (interactiveChanged && !current.interactive) {
            // Map mode deactivated -> View current route or home
            autoTarget = getAutoTarget();
        } else if (!initialTransitionDone && geoReady && isLoaded) {
            // First time both geo and data are ready -> trigger initial placement
            autoTarget = getAutoTarget();
        }

        if (!autoTarget || !geoReady) return;

        const activeAirports = allActiveIatas
            .map(iata => airportsDataRef.current.find(a => a.iata === iata))
            .filter(Boolean) as AirportData[];

        if ((autoTarget.type === 'focus' || autoTarget.type === 'single') && autoTarget.iata) {
            const iata = autoTarget.iata;
            const airport = airportsDataRef.current.find(a => a.iata === iata);
            if (airport) {
                const mesh = airportsMap.current[iata];
                const targetPoint = mesh ? mesh.position.clone() : latLonToVector3(Number(airport.lat), Number(airport.lon));
                const targetPos = targetPoint.clone().normalize().multiplyScalar(1.5);
                gsap.to(cameraRef.current.position, {
                    x: targetPos.x, y: targetPos.y, z: targetPos.z,
                    duration: 1.5, ease: "power2.inOut", overwrite: "auto",
                    onUpdate: () => {
                        cameraRef.current?.lookAt(0, 0, 0);
                        if (cameraRef.current) targetZoomDistRef.current = cameraRef.current.position.length();
                    },
                    onComplete: () => {
                        if (!initialTransitionDone) setInitialTransitionDone(true);
                    }
                });
            }
        } else if (autoTarget.type === 'route' && activeAirports.length >= 2) {
            // Find two furthest airports in the selection to define the span
            let maxD = -1;
            let pair = [activeAirports[0]!, activeAirports[1]!];

            for (let i = 0; i < activeAirports.length; i++) {
                const a1 = activeAirports[i];
                if (!a1) continue;
                const m1 = airportsMap.current[a1.iata];
                const p1 = m1 ? m1.position.clone() : latLonToVector3(a1.lat, a1.lon);
                for (let j = i + 1; j < activeAirports.length; j++) {
                    const a2 = activeAirports[j];
                    if (!a2) continue;
                    const m2 = airportsMap.current[a2.iata];
                    const p2 = m2 ? m2.position.clone() : latLonToVector3(a2.lat, a2.lon);
                    const d = p1.distanceTo(p2);
                    if (d > maxD) {
                        maxD = d;
                        pair = [a1, a2];
                    }
                }
            }

            const mStart = airportsMap.current[pair[0]!.iata];
            const start = mStart ? mStart.position.clone() : latLonToVector3(Number(pair[0]!.lat), Number(pair[0]!.lon));
            const mEnd = airportsMap.current[pair[1]!.iata];
            const end = mEnd ? mEnd.position.clone() : latLonToVector3(Number(pair[1]!.lat), Number(pair[1]!.lon));
            const routeDist = start.distanceTo(end);

            // Refined distance: balanced for both close and transcontinental flights
            const cameraDistance = 1.75 + (routeDist * 0.58);

            // Centroid of ALL active points for precise framing
            const midPos = new THREE.Vector3();
            activeAirports.forEach(a => {
                const m = airportsMap.current[a.iata];
                midPos.add(m ? m.position.clone() : latLonToVector3(a.lat, a.lon));
            });
            midPos.divideScalar(activeAirports.length).normalize();

            // Calculate local arc normal for the "furthest" pair to keep tilt consistent
            let arcNormal = start.clone().cross(end).normalize();
            if (arcNormal.lengthSq() < 0.1) {
                arcNormal = Math.abs(midPos.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
            }
            if (arcNormal.y > 0 || (Math.abs(arcNormal.y) < 0.001 && arcNormal.x > 0)) {
                arcNormal.multiplyScalar(-1);
            }

            // Subtle tilt: reduced from 0.20 to 0.08 to keep airports centered enough on closer zoom
            const tiltedPos = midPos.clone().lerp(arcNormal, 0.08).normalize();
            const targetPos = tiltedPos.multiplyScalar(cameraDistance);

            gsap.to(cameraRef.current.position, {
                x: targetPos.x, y: targetPos.y, z: targetPos.z,
                duration: 1.8, ease: "power3.inOut", overwrite: "auto",
                onUpdate: () => {
                    cameraRef.current?.lookAt(0, 0, 0);
                    if (cameraRef.current) targetZoomDistRef.current = cameraRef.current.position.length();
                },
                onComplete: () => {
                    if (!initialTransitionDone) setInitialTransitionDone(true);
                }
            });
        } else if (autoTarget.type === 'home' && geoReady) {
            gsap.to(cameraRef.current.position, {
                x: homePositionRef.current.x, y: homePositionRef.current.y, z: homePositionRef.current.z,
                duration: 1.5, ease: "power2.inOut", overwrite: "auto",
                onUpdate: () => {
                    cameraRef.current?.lookAt(0, 0, 0);
                    if (cameraRef.current) targetZoomDistRef.current = cameraRef.current.position.length();
                },
                onComplete: () => {
                    if (!initialTransitionDone) setInitialTransitionDone(true);
                }
            });
        }
    }, [isLoaded, originsIata, destinationsIata, focusIata, interactive, geoReady, selectedAirports, allStepsIata, debouncedHoveredIata]);
    // Effect to update camera home position when user location context yields data
    useEffect(() => {
        if (location && cameraRef.current && mountRef.current) {
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;
            const dist = calculateDistance(width, height);
            const pos = latLonToVector3(location.latitude, location.longitude, dist);

            // We no longer snap cameraRef.current.position directly to allow GSAP to animate it smoothly
            // on the camera effect that depends on geoReady
            if (controlsRef.current) controlsRef.current.update();
            homePositionRef.current.copy(pos);
            setGeoReady(true);
        } else if (!isLocLoading && cameraRef.current) {
            // Fallback: if loc failed but loading is over, show globe at default
            setGeoReady(true);
        }
    }, [location, isLocLoading]);

    return (
        <div className='w-full h-full relative overflow-hidden bg-black flex items-center justify-center'>
            <div
                ref={mountRef}
                className={`w-full h-full absolute inset-0 transition-opacity duration-700 z-base ${geoReady ? 'opacity-100' : 'opacity-0'}`}
            />
            <div
                ref={popupRef}
                className="pointer-events-none absolute z-popover hidden rounded-xl border border-white/20 bg-black/90 p-3 text-xs text-white backdrop-blur-xl transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
            />


            {/* Origin Tags */}
            {origins.map((origin, idx) => (
                <div
                    key={`origin-${getEntityId(origin)}`}
                    ref={el => { originLabelRefs.current[idx] = el; }}
                    className="pointer-events-none absolute z-overlay hidden -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col items-center transition-opacity duration-300"
                >
                    <div className="bg-origin/10 backdrop-blur-md border border-origin/40 px-3 py-1 rounded-full text-[10px] font-bold text-origin shadow-[0_4px_12px_rgba(0,0,0,0.5)] whitespace-nowrap">
                        {isAirport(origin) ? `${origin.city || origin.name} (${origin.iata_code})` : origin.name}
                    </div>
                    <div className="w-px h-6 bg-linear-to-b from-origin/40 to-transparent" />
                </div>
            ))}

            {/* Destination Tags */}
            {destinations.map((dest, idx) => (
                <div
                    key={`dest-${getEntityId(dest)}`}
                    ref={el => { destLabelRefs.current[idx] = el; }}
                    className="pointer-events-none absolute z-overlay hidden -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col items-center transition-opacity duration-300"
                >
                    <div className="bg-destination/10 backdrop-blur-md border border-destination/40 px-3 py-1 rounded-full text-[10px] font-bold text-destination shadow-[0_4px_12px_rgba(0,0,0,0.5)] whitespace-nowrap">
                        {isAirport(dest) ? `${dest.city || dest.name} (${dest.iata_code})` : dest.name}
                    </div>
                    <div className="w-px h-6 bg-linear-to-b from-destination/40 to-transparent" />
                </div>
            ))}

            {/* Hover Tag */}
            {hoveredEntity && isAirport(hoveredEntity) &&
                !originsIata.includes(hoveredEntity.iata_code) &&
                !destinationsIata.includes(hoveredEntity.iata_code) &&
                !allStepsIata.includes(hoveredEntity.iata_code) && (
                    <div
                        ref={hoverLabelRef}
                        className="pointer-events-none absolute z-overlay hidden -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col items-center transition-opacity duration-300"
                    >
                        <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/40 px-3 py-1 rounded-full text-[10px] font-bold text-emerald-400 shadow-[0_4px_12px_rgba(0,0,0,0.5)] whitespace-nowrap">
                            {hoveredEntity.city || hoveredEntity.name} ({hoveredEntity.iata_code})
                        </div>
                        <div className="w-px h-6 bg-linear-to-b from-emerald-500/40 to-transparent" />
                    </div>
                )}

            {!isLoaded && (
                <div className="z-content text-white animate-pulse font-medium">
                    {t("globe.loading")}
                </div>
            )}

            {/* Context Menu / Cluster Picker */}
            {contextMenu.visible && (contextMenu.airport || contextMenu.clusterAirports || contextMenu.city) && (
                <div
                    ref={contextMenuContainerRef}
                    className="absolute z-popover min-w-48 bg-main/90 backdrop-blur-3xl border border-line rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.clusterAirports ? (
                        <div className="flex flex-col w-64">
                            <div className="px-4 py-3 border-b border-line bg-surface/30">
                                <div className="text-[10px] text-content-muted font-bold uppercase tracking-wider mb-0.5">{t("globe.airportsInZone")}</div>
                                <div className="text-content text-xs font-semibold">
                                    {t("globe.found", { count: contextMenu.clusterAirports.length })}
                                </div>
                            </div>
                            <div className="relative max-h-57.5 overflow-y-auto p-1.5 flex flex-col gap-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {contextMenu.clusterAirports.map(a => (
                                    <div key={a.iata} className="group/item flex flex-col gap-1 p-2 rounded-xl hover:bg-surface/50 border border-transparent hover:border-line/50 transition-all">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onSelectRef.current) {
                                                    onSelectRef.current(toAirportResponse(a));
                                                } else {
                                                    onAirportClickRef.current?.(toAirportResponse(a));
                                                }
                                                setContextMenu(prev => ({ ...prev, visible: false }));
                                            }}
                                            className="flex flex-col items-start min-w-0 px-1 cursor-pointer hover:opacity-80 transition-opacity w-full text-left"
                                        >
                                            <span className="text-[11px] font-bold text-content truncate w-full">{a.city || a.name} ({a.iata})</span>
                                            <span className="text-[9px] text-content-muted">{a.name}</span>
                                        </button>
                                        {!onSelectRef.current && (
                                            <div className="flex gap-1 mt-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSetOrigin?.(toAirportResponse(a));
                                                        setContextMenu(prev => ({ ...prev, visible: false }));
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-origin/10 text-origin text-[9px] font-bold hover:bg-origin/20 transition-all cursor-pointer"
                                                >
                                                    <PlaneTakeoff size={10} />
                                                    {t("common.origin")}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSetDestination?.(toAirportResponse(a));
                                                        setContextMenu(prev => ({ ...prev, visible: false }));
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-destination/10 text-destination text-[9px] font-bold hover:bg-destination/20 transition-all cursor-pointer"
                                                >
                                                    <PlaneLanding size={10} />
                                                    {t("common.destination")}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {/* Subtle fade to indicate more content */}
                                {contextMenu.clusterAirports.length > 3 && (
                                    <div className="sticky bottom-0 left-0 right-0 h-8 bg-linear-to-t from-main/90 to-transparent pointer-events-none -mt-8" />
                                )}
                            </div>
                        </div>
                    ) : contextMenu.city ? (
                        <div className="flex flex-col w-52">
                            <div className="px-4 py-3 border-b border-line bg-surface/30">
                                <div className="text-[10px] text-content-muted font-bold uppercase tracking-wider mb-0.5">{t("globe.city")}</div>
                                <div className="text-content text-sm font-semibold truncate">
                                    {contextMenu.city.name}
                                </div>
                            </div>
                            <div className="p-1.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // We need to find the actual entity in origins/destinations to remove it correctly
                                        const entity = origins.find(o => getEntityId(o) === contextMenu.city.id) ||
                                            destinations.find(d => getEntityId(d) === contextMenu.city.id);

                                        if (entity) {
                                            onRemoveEntity?.(entity);
                                        } else {
                                            // Fallback if it was just a hover-selected city from search
                                            // creating a dummy entity to match ID
                                            onRemoveEntity?.({ name: contextMenu.city.name, id: contextMenu.city.id } as any);
                                        }
                                        setContextMenu(prev => ({ ...prev, visible: false }));
                                    }}
                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-all cursor-pointer group"
                                >
                                    <X size={14} className="text-red-500/70 group-hover:text-red-500 transition-colors" />
                                    <span>{t("globe.deselectCity")}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-3 border-b border-line bg-surface/30">
                                <div className="text-[10px] text-content-muted font-bold uppercase tracking-wider mb-0.5">{t("common.airport")}</div>
                                <div className="text-content text-sm font-semibold truncate max-w-45">
                                    {contextMenu.airport!.city || contextMenu.airport!.name} ({contextMenu.airport!.iata})
                                </div>
                            </div>

                            <div className="p-1.5 flex flex-col gap-0.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const a = contextMenu.airport!;
                                        onSetOrigin?.(toAirportResponse(a));
                                        setContextMenu(prev => ({ ...prev, visible: false }));
                                    }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-content hover:bg-origin/20 hover:text-origin transition-all cursor-pointer group"
                                >
                                    <PlaneTakeoff size={14} className="text-content-muted group-hover:text-origin transition-colors" />
                                    <span>{t("globe.setAsOrigin")}</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const a = contextMenu.airport!;
                                        onSetDestination?.(toAirportResponse(a));
                                        setContextMenu(prev => ({ ...prev, visible: false }));
                                    }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-content hover:bg-destination/20 hover:text-destination transition-all cursor-pointer group"
                                >
                                    <PlaneLanding size={14} className="text-content-muted group-hover:text-destination transition-colors" />
                                    <span>{t("globe.setAsDestination")}</span>
                                </button>
                            </div>
                        </>
                    )}

                    <button
                        onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                        className="absolute top-2 right-2 p-1 text-content-muted hover:text-content transition-colors cursor-pointer"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}

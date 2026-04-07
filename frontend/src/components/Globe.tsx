import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { gsap } from "gsap";
import { PlaneTakeoff, PlaneLanding, X } from "lucide-react";
import { useGetGlobeAirports } from "@/api/generated/airports/airports";
import { COUNTRY_NAMES } from "@/constants/countries";
import type { Layover } from "./search/ManualSearchForm";
import type { AirportResponse } from "@/api/generated/model";

interface AirportData {
    iata: string;
    lat: number;
    lon: number;
    name: string;
    city: string;
}

interface GlobeProps {
    onAirportSelect?: (airport: AirportResponse) => void;
    selectedAirports: string[];
    origin: AirportResponse | null;
    destination: AirportResponse | null;
    interactive?: boolean;
    horizontalOffset?: number;
    onReady?: () => void;
    onSetOrigin?: (airport: AirportResponse) => void;
    onSetDestination?: (airport: AirportResponse) => void;
    onAirportClick?: (airport: AirportResponse | null) => void;
    onMovementChange?: (isMoving: boolean, isUserInteracting: boolean) => void;
    focusIata?: string;
    layovers?: Layover[];
}

export default function Globe({
    onAirportSelect,
    selectedAirports,
    origin,
    destination,
    interactive = false,
    horizontalOffset = 0,
    onReady,
    onSetOrigin,
    onSetDestination,
    onAirportClick,
    onMovementChange,
    focusIata,
    layovers = []
}: GlobeProps) {
    const originIata = origin?.iata_code;
    const destinationIata = destination?.iata_code;

    const toAirportResponse = (ad: AirportData): AirportResponse => ({
        iata_code: ad.iata,
        name: ad.name,
        city: ad.city,
        location: {
            coordinates: [ad.lon, ad.lat],
            type: "Point"
        }
    } as AirportResponse);
    const mountRef = useRef<HTMLDivElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);
    const originLabelRef = useRef<HTMLDivElement | null>(null);
    const destLabelRef = useRef<HTMLDivElement | null>(null);
    const contextMenuContainerRef = useRef<HTMLDivElement | null>(null);
    const labelGroupRef = useRef<THREE.Group>(new THREE.Group());
    const clusterTextureCache = useRef<Record<number, THREE.CanvasTexture>>({});
    const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const airplaneModelRef = useRef<THREE.Group | null>(null);
    const airportsDataRef = useRef<AirportData[]>([]);
    const airportsMap = useRef<Record<string, THREE.Mesh>>({});
    const sharedAirportGeo = useRef(new THREE.SphereGeometry(0.0004, 12, 12));
    const sharedClusterGeo = useRef(new THREE.SphereGeometry(0.002, 12, 12));
    const arcsGroupRef = useRef<THREE.Group>(new THREE.Group());
    const planesRef = useRef<{ mesh: THREE.Object3D; curve: THREE.Curve<THREE.Vector3>; points: THREE.Vector3[]; line: THREE.Line; progress: number; speed: number }[]>([]);

    const sceneRef = useRef<THREE.Scene | null>(null);
    const earthGroupRef = useRef<THREE.Group>(new THREE.Group());
    const countryLabelsGroupRef = useRef<THREE.Group>(new THREE.Group());
    const airportGroupRef = useRef<THREE.Group>(new THREE.Group());
    const starGroupRef = useRef<THREE.Group>(new THREE.Group());
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const activeOriginRef = useRef<string | undefined>(originIata);
    const activeDestRef = useRef<string | undefined>(destinationIata);
    const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2(-999, -999));
    const onSelectRef = useRef(onAirportSelect);
    const selectedAirportsRef = useRef(selectedAirports);
    const currentOffsetRef = useRef({ val: horizontalOffset });
    const homePositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 3.2));
    const onAirportClickRef = useRef(onAirportClick);
    const onMovementChangeRef = useRef(onMovementChange);
    useEffect(() => { onMovementChangeRef.current = onMovementChange; }, [onMovementChange]);
    const lastCamPosRef = useRef(new THREE.Vector3());

    // Stable key for airports that must NOT be clustered (sorted to ignore order in swaps)
    const forcedAirportsKey = useMemo(() => {
        const layoverIatas = layovers.map(l => l.airport?.iata_code).filter(Boolean) as string[];
        return [originIata, destinationIata, ...selectedAirports, ...layoverIatas]
            .filter(Boolean)
            .sort()
            .join(',');
    }, [originIata, destinationIata, selectedAirports, layovers]);
    const lastCamQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
    const lastMoveTimeRef = useRef(0);
    const isUserInteractingRef = useRef(false);

    // Dynamic distance calculation based on aspect ratio to fit globe on mobile
    const calculateDistance = (w: number, h: number) => {
        const aspect = w / h;
        const ZOOM_STEP = 0.25;
        if (aspect < 1) {
            const raw = 1.8 / (aspect * 0.4142);
            return Math.round(raw / ZOOM_STEP) * ZOOM_STEP;
        }
        return 3.25; // Multiple of 0.25
    };

    const [isLoaded, setIsLoaded] = useState(false);
    const [geoReady, setGeoReady] = useState(false);
    const [clusterThreshold, setClusterThreshold] = useState(0.025);
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        worldPos: THREE.Vector3 | null;
        airport: AirportData | null;
        clusterAirports: AirportData[] | null;
    }>({ visible: false, x: 0, y: 0, worldPos: null, airport: null, clusterAirports: null });
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

    const latLonToVector3 = (lat: number, lon: number, radius: number = 1) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        return new THREE.Vector3(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    };

    const getThemeColorHex = (varName: string, defaultHex: number): number => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        if (!value) return defaultHex;
        return parseInt(value.replace('#', '0x'), 16);
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

    useEffect(() => {
        activeOriginRef.current = originIata;
        activeDestRef.current = destinationIata;
        onSelectRef.current = onAirportSelect;
        onAirportClickRef.current = onAirportClick;
        selectedAirportsRef.current = selectedAirports;
        selectedAirportsSetRef.current = new Set(selectedAirports);
        const layoverIatas = (layovers || []).map(l => l.airport?.iata_code).filter(Boolean) as string[];
        layoversSetRef.current = new Set(layoverIatas);
    }, [originIata, destinationIata, onAirportSelect, onAirportClick, selectedAirports, layovers]);

    useEffect(() => {
        interactiveRef.current = interactive;
    }, [interactive]);

    // Reusable objects for performance (prevents Garbage Collection lag)
    const _vec1 = new THREE.Vector3();
    const _vec2 = new THREE.Vector3();
    const _camNorm = new THREE.Vector3();

    // Refs for objects that need persistence and access in multiple effects
    const cloudsRef = useRef<THREE.Mesh | null>(null);

    // Notify parent when globe is fully ready (geo + airports loaded)
    useEffect(() => {
        if (geoReady && isLoaded && onReady) onReady();
    }, [geoReady, isLoaded, onReady]);

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

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        // Default: Greenwich meridian. IP geo will override this asynchronously if available.
        const idealDist = calculateDistance(width, height);
        const defaultPos = latLonToVector3(0, 0, idealDist);
        camera.position.copy(defaultPos);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;
        homePositionRef.current.copy(defaultPos);

        // Fire IP geolocation fetch — camera positioned before globe renders
        fetch("https://get.geojs.io/v1/ip/geo.json")
            .then(r => r.json())
            .then(data => {
                if (data?.latitude && data?.longitude && cameraRef.current) {
                    const dist = calculateDistance(mountRef.current?.clientWidth || width, mountRef.current?.clientHeight || height);
                    const pos = latLonToVector3(Number(data.latitude), Number(data.longitude), dist);
                    cameraRef.current.position.copy(pos);
                    cameraRef.current.lookAt(0, 0, 0);
                    if (controlsRef.current) controlsRef.current.update();
                    homePositionRef.current.copy(pos);
                }
            })
            .catch(() => { /* silent fail, camera stays at Greenwich default */ })
            .finally(() => { setGeoReady(true); });

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.03;
        controls.minDistance = 1.25; // Aligned to 0.25 step
        controls.maxDistance = 6.25; // Aligned to 0.25 step
        controls.enablePan = false;
        controlsRef.current = controls;

        const hideContextMenu = () => {
            setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
        };
        const onControlsChange = () => {
            if (camera.position.length() !== 0) {
                const ZOOM_STEP = 0.25;
                const dist = camera.position.length();
                // Snap distance to step for deterministic threshold calculation
                const steppedDist = Math.round(dist / ZOOM_STEP) * ZOOM_STEP;
                // Snapped threshold calculation for categorical zoom "notches"
                // Formula tuned to range [0.012, 0.045] over dist [1.25, 6.25]
                // With greedy clustering, we need higher thresholds to perceive grouping.
                const rawThreshold = (steppedDist - 1.25) * 0.007 + 0.012;
                const nextThreshold = Math.max(0.012, Math.min(0.045, rawThreshold));

                // Debounce threshold update to avoid lag during zoom
                if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
                zoomTimeoutRef.current = setTimeout(() => {
                    setClusterThreshold(prev => {
                        if (Math.abs(prev - nextThreshold) < 0.001) return prev;
                        return nextThreshold;
                    });
                }, 50);
            }
        };
        controls.addEventListener('change', onControlsChange);

        // Kill any ongoing camera animations when the user starts manual interaction
        controls.addEventListener('start', () => {
            isUserInteractingRef.current = true;
            if (cameraRef.current) gsap.killTweensOf(cameraRef.current.position);
        });

        controls.addEventListener('end', () => {
            isUserInteractingRef.current = false;
        });

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(5, 3, 5);
        scene.add(pointLight);

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

        // Earth — visible immediately at the correct camera position set by IP geo
        const earthGroup = earthGroupRef.current;
        scene.add(earthGroup);
        earthGroup.add(arcsGroupRef.current);
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
        const loader = new THREE.TextureLoader();

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
                        clusterAirports: item.airports
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
                        clusterAirports: item.airports
                    });
                } else {
                    const a = item as AirportData;
                    setContextMenu({
                        visible: true,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        worldPos: pos,
                        airport: a,
                        clusterAirports: null
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

            raycaster.setFromCamera(mouse, cameraRef.current);
            const intersects = raycaster.intersectObjects(airportGroupRef.current.children);
            if (intersects.length > 0 && intersects[0]?.object?.userData) {
                renderer.domElement.style.cursor = "pointer";
                if (popupRef.current) {
                    const item = intersects[0].object.userData;
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
                        popupRef.current.innerHTML = `<b>${item.airports.length} aeropuertos</b> en esta zona`;
                    } else {
                        const a = item as AirportData;
                        const displayName = a.name || a.city || "Ubicación desconocida";
                        popupRef.current.innerHTML = `<b>${displayName}</b> (${a.iata || 'N/A'})`;
                    }
                    popupRef.current.style.display = "block";
                }
            } else {
                renderer.domElement.style.cursor = "default";
                if (popupRef.current) popupRef.current.style.display = "none";
            }
        };

        const onMouseLeave = () => {
            mousePosRef.current.set(-999, -999);
            renderer.domElement.style.cursor = "default";
            if (popupRef.current) popupRef.current.style.display = "none";
        };

        renderer.domElement.addEventListener("click", onClick);
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
                    // Slower, more deliberate rotation speed
                    controlsRef.current.rotateSpeed = 0.4 - (0.32 * zoomFactor);
                }

                _camNorm.copy(cam.position).normalize();
                const activeOrigin = activeOriginRef.current;
                const activeDest = activeDestRef.current;
                const selSet = selectedAirportsSetRef.current;
                const layoversSet = layoversSetRef.current;

                const distFactor = camDist / 3.2;
                // Linear scaling ensures constant screen size (Perspective projection offset)
                const scaleFactor = distFactor;
                const proximityBase = 0.03 * Math.pow(distFactor, 2.2);

                const baseScale = 1.5 * scaleFactor;
                const specialScale = 35 * scaleFactor;
                const specialClusterScale = 8 * scaleFactor; // Balanced for 5x geometry
                const clusterHoverScale = 6 * scaleFactor;   // Balanced for 5x geometry
                const airportHoverScale = 28 * scaleFactor;
                const labelRefScale = 0.045 * scaleFactor;

                airportGroupRef.current.children.forEach(child => {
                    const mesh = child as THREE.Mesh;
                    const item = mesh.userData;
                    const mat = mesh.material as THREE.MeshBasicMaterial;

                    // Handle cluster or single airport 
                    // (Optimization: avoid .some if not special)
                    let isSpecial = false;
                    if (item.isCluster) {
                        for (let i = 0; i < item.airports.length; i++) {
                            const iata = item.airports[i].iata;
                            if (iata === activeOrigin || iata === activeDest || selSet.has(iata) || layoversSet.has(iata)) {
                                isSpecial = true;
                                break;
                            }
                        }
                    } else {
                        isSpecial = item.iata === activeOrigin || item.iata === activeDest || selSet.has(item.iata) || layoversSet.has(item.iata);
                    }

                    let targetOpacity = 0;
                    let targetScale = baseScale;

                    if (isSpecial) {
                        targetOpacity = 1;
                        const s = item.isCluster ? specialClusterScale : specialScale;
                        targetScale = s * Math.max(0.5, globalZoomFade);
                    } else if (interactiveRef.current) {
                        _vec1.copy(mesh.position);
                        const dot = _camNorm.dot(_vec1);

                        if (dot >= 0.1) {
                            let factor = 0;
                            if (isMobileRef.current) {
                                // Slightly wider angle for mobile to make targeting easier
                                factor = Math.pow(Math.max(0, (dot - 0.94) / 0.06), 1.5);
                            } else if (!isMoving) {
                                const distToRay = raycaster.ray.distanceSqToPoint(_vec1);
                                if (distToRay < proximityBase) {
                                    factor = 1 - (distToRay / proximityBase);
                                }
                            }

                            if (factor > 0) {
                                // Slightly more gradual ramp
                                targetOpacity = Math.min(1, factor * 2.5) * globalZoomFade;
                                const hS = item.isCluster ? clusterHoverScale : airportHoverScale;
                                targetScale = (baseScale + (hS - baseScale) * factor) * Math.max(0.5, globalZoomFade);
                            } else {
                                targetOpacity = 0;
                                targetScale = baseScale;
                            }
                        }
                    }

                    // Apply to Mesh (only if not a cluster)
                    if (!item.isCluster) {
                        if (Math.abs(mat.opacity - targetOpacity) > 0.001 || Math.abs(mesh.scale.x - targetScale) > 0.001) {
                            mat.opacity += (targetOpacity - mat.opacity) * 0.06; // Slower temporal fade
                            const nextScale = mesh.scale.x + (targetScale - mesh.scale.x) * 0.06;
                            mesh.scale.setScalar(nextScale);
                        }
                    } else {
                        // For clusters, mesh is invisible. 
                        // Keep a moderate scale for raycasting, but avoid "enlarged" hitboxes
                        mat.opacity = 0;
                        const clusterHitScale = targetScale;
                        if (Math.abs(mesh.scale.x - clusterHitScale) > 0.01) {
                            mesh.scale.setScalar(mesh.scale.x + (clusterHitScale - mesh.scale.x) * 0.06);
                        }
                    }

                    // Integrated Cluster Label Positioning (3D Mesh)
                    if (item.isCluster && mesh.userData.labelMesh) {
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

                        // Scale effect for the label (relative to mesh scale which is already distance-aware)
                        const labelScale = labelRefScale * (0.5 + 0.5 * (mesh.scale.x / (35 * scaleFactor)));
                        if (Math.abs(label.scale.x - (labelScale)) > 0.0001) {
                            label.scale.setScalar(labelScale);
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
                            // Mobile: Show based on camera looking towards it, exactly like airports
                            let factor = Math.pow(Math.max(0, (dot - 0.94) / 0.06), 1.5);
                            if (factor > 0) {
                                targetOpacity = 0.4 * factor * globalZoomFade;
                            }
                        } else if (!isMoving) {
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
                if (p.progress > 1) {
                    p.progress = 0;
                    const posAttr = p.line.geometry.getAttribute('position') as THREE.BufferAttribute;
                    if (posAttr) {
                        p.points.forEach((pt, i) => posAttr.setXYZ(i, pt.x, pt.y, pt.z));
                        posAttr.needsUpdate = true;
                    }
                }
                const points = p.points;
                const exactIdx = p.progress * (points.length - 1);
                const baseIdx = Math.floor(exactIdx);
                const pt1 = points[baseIdx], pt2 = points[Math.min(baseIdx + 1, points.length - 1)];
                if (pt1 && pt2) {
                    _vec1.copy(pt1).lerp(pt2, exactIdx - baseIdx);
                    p.mesh.position.copy(_vec1);

                    const positionAttr = p.line.geometry.getAttribute('position') as THREE.BufferAttribute;
                    if (positionAttr) {
                        const nextIdx = Math.min(baseIdx + 1, points.length - 1);
                        const lastIdx = (p as any)._lastTipIdx;
                        if (lastIdx !== undefined && points[lastIdx]) {
                            const orig = points[lastIdx];
                            positionAttr.setXYZ(lastIdx, orig.x, orig.y, orig.z);
                        }
                        positionAttr.setXYZ(nextIdx, _vec1.x, _vec1.y, _vec1.z);
                        positionAttr.needsUpdate = true;
                        (p as any)._lastTipIdx = nextIdx;
                        p.line.geometry.setDrawRange(0, nextIdx + 1);
                    }
                    const lookPoint = points[Math.min(baseIdx + 2, points.length - 1)];
                    if (lookPoint) p.mesh.lookAt(lookPoint);
                }
            });

            const updateLabel = (iata: string | undefined, labelEl: HTMLElement | null) => {
                const mesh = iata ? airportsMap.current[iata] : null;
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
                    labelEl.style.pointerEvents = "auto";
                    labelEl.style.left = `${(_vec1.x * 0.5 + 0.5) * mountRef.current.clientWidth}px`;
                    labelEl.style.top = `${(-_vec1.y * 0.5 + 0.5) * mountRef.current.clientHeight}px`;
                } else if (labelEl) {
                    if (labelEl.style.opacity !== "0") {
                        labelEl.style.opacity = "0";
                        labelEl.style.pointerEvents = "none";
                    }
                }
            };
            updateLabel(activeOriginRef.current, originLabelRef.current);
            updateLabel(activeDestRef.current, destLabelRef.current);

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

            renderer.render(scene, camera);
        };
        animationId = requestAnimationFrame(animate);

        renderer.domElement.addEventListener("click", onClick);
        renderer.domElement.addEventListener("contextmenu", onContextMenu);
        renderer.domElement.addEventListener("mousemove", onMouseMove);
        renderer.domElement.addEventListener("mouseleave", onMouseLeave);

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

            controls.removeEventListener('change', onControlsChange);
            controls.dispose();
            if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);

            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
            renderer.dispose();
            rendererRef.current = null;
            cameraRef.current = null;
            sceneRef.current = null;
            controlsRef.current = null;

            earthGroupRef.current.clear();
            airportGroupRef.current.clear();
            labelGroupRef.current.clear();
            countryLabelsGroupRef.current.clear();
            starGroupRef.current.clear();
            arcsGroupRef.current.clear();
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
                        const names = COUNTRY_NAMES[c.iso];
                        if (names) {
                            displayName = names[1] || names[0];
                        }
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

        airportGroupRef.current.clear();
        airportsMap.current = {};

        const hM = isMobileRef.current ? 1.5 : 1.0;
        const forcedSet = new Set([...selectedAirports, originIata, destinationIata].filter(Boolean) as string[]);
        const threshold = clusterThreshold;

        // 1. OOP Entity Class
        class GlobeItem {
            v3: THREE.Vector3;
            iata: string;
            name: string;
            city: string;
            lat: number;
            lon: number;
            airports: any[];
            isSpecial: boolean;
            isCluster: boolean;
            id: string;

            constructor(data: any) {
                this.v3 = data.v3.clone();
                this.iata = data.iata || '';
                this.name = data.name || '';
                this.city = data.city || '';
                this.lat = data.lat;
                this.lon = data.lon;
                this.airports = data.airports || [];
                this.isSpecial = forcedSet.has(this.iata);
                this.isCluster = !!data.isCluster;
                // Deterministic ID: for clusters, join sorted IATAs
                if (this.isCluster) {
                    const sortedIatas = [...this.airports].map(a => a.iata).sort();
                    this.id = `c-${sortedIatas.join('-')}`;
                } else {
                    this.id = this.iata;
                }
            }

            get radius() {
                return threshold * 0.5;
            }

            collides(other: GlobeItem) {
                const minDist = (this.radius + other.radius) * hM;
                return this.v3.distanceTo(other.v3) < minDist;
            }
        }

        // 2. Spatial Grid Class for O(N) Complexity
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

        // Processing Pipeline (Stable sort for determinism)
        let items = [...globeAirports]
            .sort((a, b) => a.i.localeCompare(b.i))
            .map(a => new GlobeItem({
                iata: a.i, lat: a.la, lon: a.lo, name: a.n, city: a.ci, v3: latLonToVector3(a.la, a.lo)
            }));

        // 2b. Leader-based Clustering Pass (O(N) with Grid)
        // Prevents Transitive "Super-clusters" by ensuring each leader only picks its immediate neighbors.
        // This creates an organic mesh of clusters instead of long chains.
        const assigned = new Set<string>();
        const resultItems: GlobeItem[] = [];

        // Pre-insert non-special items into grid for fast neighborhood search
        const mergeGrid = new SpatialGrid(threshold * 1.5 * hM);
        items.forEach(it => { if (!it.isSpecial) mergeGrid.insert(it); });

        // Process items carefully: special airports first to ensure they aren't swallowed
        // We look at airports in a deterministic order
        items.forEach(it => {
            if (assigned.has(it.id)) return;

            // 1. Handle special airports (origin, dest, selected) -> they remain as single points
            if (it.isSpecial) {
                resultItems.push(it);
                assigned.add(it.id);
                return;
            }

            // 2. Start a new cluster centered at 'it'
            const clusterMembers: any[] = [{ iata: it.iata, lat: it.lat, lon: it.lon, name: it.name, city: it.city }];
            assigned.add(it.id);

            // 3. Absorb immediate unassigned neighbors within threshold radius
            const neighbors = mergeGrid.getNeighbors(it);
            for (const nb of neighbors) {
                if (!nb.isSpecial && !assigned.has(nb.id) && it.collides(nb)) {
                    clusterMembers.push({ iata: nb.iata, lat: nb.lat, lon: nb.lon, name: nb.name, city: nb.city });
                    assigned.add(nb.id);
                }
            }

            // 4. Finalize cluster or single item
            if (clusterMembers.length > 1) {
                const avgLat = clusterMembers.reduce((s, a) => s + a.lat, 0) / clusterMembers.length;
                const avgLon = clusterMembers.reduce((s, a) => s + a.lon, 0) / clusterMembers.length;
                resultItems.push(new GlobeItem({
                    isCluster: true,
                    airports: clusterMembers,
                    lat: avgLat,
                    lon: avgLon,
                    v3: latLonToVector3(avgLat, avgLon)
                }));
            } else {
                resultItems.push(it);
            }
        });

        items = resultItems;

        // 2c. Repulsion Pass (O(N) with Grid)
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
                        // Deterministic jitter based on coordinates instead of Math.random()
                        if (d < 0.0001) {
                            const jitterX = Math.sin(a.lat * 123.456 + a.lon * 456.789);
                            const jitterY = Math.cos(a.lat * 456.789 + a.lon * 123.456);
                            const jitterZ = Math.sin(a.lat * 321.654 + a.lon * 654.321);
                            diff.set(jitterX, jitterY, jitterZ);
                        }
                        diff.normalize();
                        const push = minDist - d;
                        if (a.isSpecial && b.isSpecial) {
                            const p2 = push * 0.5;
                            a.v3.addScaledVector(diff, p2).normalize();
                            b.v3.addScaledVector(diff, -p2).normalize();
                        } else if (a.isSpecial) {
                            b.v3.addScaledVector(diff, -push).normalize();
                        } else if (b.isSpecial) {
                            a.v3.addScaledVector(diff, push).normalize();
                        } else {
                            const p2 = push * 0.5;
                            a.v3.addScaledVector(diff, p2).normalize();
                            b.v3.addScaledVector(diff, -p2).normalize();
                        }
                    }
                }
            }
        }

        labelGroupRef.current.clear();

        // 3. Build Scene
        items.forEach(item => {
            const isOriginDest = item.iata === originIata || item.iata === destinationIata;
            const meshColor = isOriginDest
                ? getThemeColorHex(item.iata === originIata ? '--color-origin' : '--color-destination', 0x0891b2)
                : (item.isSpecial ? 0x00ff00 : getThemeColorHex('--color-brand', 0x4f46e5));

            const meshOpacity = (item.isSpecial || isOriginDest) ? 1 : 0.4;
            const baseScale = isOriginDest ? 35 : (item.isSpecial ? 28 : (item.isCluster ? 2.4 : 1.6));

            const mesh = new THREE.Mesh(
                item.isCluster ? sharedClusterGeo.current : sharedAirportGeo.current,
                new THREE.MeshBasicMaterial({
                    color: meshColor,
                    transparent: true,
                    opacity: item.isCluster ? 0 : meshOpacity,
                    depthWrite: false,
                })
            );
            mesh.position.copy(item.v3);
            mesh.scale.setScalar(baseScale);
            mesh.userData = { ...item }; // Plain object for userData
            mesh.renderOrder = isOriginDest ? 10 : (item.isSpecial ? 5 : 1);
            airportGroupRef.current.add(mesh);

            if (item.isCluster) {
                const texture = getClusterTexture(item.airports.length);
                if (texture) {
                    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false }));
                    sprite.position.copy(item.v3).multiplyScalar(1.002);
                    sprite.scale.setScalar(0.016);
                    sprite.visible = false;
                    labelGroupRef.current.add(sprite);
                    mesh.userData.labelMesh = sprite;
                }
                item.airports.forEach((a: any) => {
                    if (a && a.iata) airportsMap.current[a.iata] = mesh;
                });
            } else {
                airportsMap.current[item.iata] = mesh;
            }
        });

        airportsDataRef.current = globeAirports.map(a => ({ iata: a.i, lat: a.la, lon: a.lo, name: a.n, city: a.ci, v3: latLonToVector3(a.la, a.lo) }));
        setIsLoaded(true);
    }, [isAirportsLoaded, globeAirports, clusterThreshold, forcedAirportsKey]);

    // 2.5 Style Update Effect (Updates marker visual state WITHOUT rebuilding scene)
    useEffect(() => {
        if (!isLoaded) return;
        const brandColor = getThemeColorHex('--color-brand', 0x4f46e5);
        const originColor = getThemeColorHex('--color-origin', 0x0891b2);
        const destColor = getThemeColorHex('--color-destination', 0xc026d3);
        const layoverColor = 0x00ff00; // Consistent color for layovers

        const selSet = new Set(selectedAirports);
        const layoverSet = new Set(layovers.map(l => l.airport?.iata_code).filter(Boolean) as string[]);

        airportGroupRef.current.children.forEach(child => {
            const mesh = child as THREE.Mesh;
            const item = mesh.userData;
            const mat = mesh.material as THREE.MeshBasicMaterial;

            if (!item.isCluster) {
                if (item.iata === originIata || item.iata === destinationIata) {
                    mat.color.setHex(item.iata === originIata ? originColor : destColor);
                    mat.opacity = 1;
                    mesh.scale.setScalar(12);
                } else if (layoverSet.has(item.iata)) {
                    mat.color.setHex(layoverColor);
                    mat.opacity = 1;
                    mesh.scale.setScalar(10);
                } else if (selSet.has(item.iata)) {
                    mat.color.setHex(0x00ff00);
                    mat.opacity = 1;
                    mesh.scale.setScalar(8);
                } else {
                    mat.color.setHex(brandColor);
                }
            } else {
                // Determine if cluster contains a special airport
                let hasOriginOrDest = false;
                let hasLayover = false;
                let hasSelected = false;
                for (let i = 0; i < item.airports.length; i++) {
                    const iata = item.airports[i].iata;
                    if (iata === originIata || iata === destinationIata) {
                        hasOriginOrDest = true;
                    }
                    if (layoverSet.has(iata)) {
                        hasLayover = true;
                    }
                    if (selSet.has(iata)) {
                        hasSelected = true;
                    }
                }

                if (hasOriginOrDest) {
                    mat.color.setHex(brandColor);
                    mat.opacity = 0;
                    mesh.scale.setScalar(8); // Sync with specialClusterScale
                } else if (hasLayover) {
                    mat.color.setHex(brandColor);
                    mat.opacity = 0;
                    mesh.scale.setScalar(7);
                } else if (hasSelected) {
                    mat.color.setHex(brandColor);
                    mat.opacity = 0;
                    mesh.scale.setScalar(6); // Sync with clusterHoverScale
                } else {
                    mat.color.setHex(brandColor);
                    mat.opacity = 0;
                }
            }
        });
    }, [isLoaded, originIata, destinationIata, selectedAirports.join(','), layovers]);

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
    // 6. Handle arcs and planes creation (Flight path remains stable)
    useEffect(() => {
        if (!isLoaded || !sceneRef.current) return;

        // Clear previous arcs and planes
        while (arcsGroupRef.current.children.length > 0) {
            const child = arcsGroupRef.current.children[0];
            if (child) {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (child.material instanceof THREE.Material) {
                        child.material.dispose();
                    }
                }
                arcsGroupRef.current.remove(child);
            }
        }
        planesRef.current = [];

        // Draw Arcs for the full route sequence
        const routeAirports = [
            originIata,
            ...layovers.map(l => l.airport?.iata_code).filter(Boolean),
            destinationIata
        ].filter(Boolean) as string[];

        if (routeAirports.length >= 2) {
            for (let i = 0; i < routeAirports.length - 1; i++) {
                const startIata = routeAirports[i];
                const endIata = routeAirports[i + 1];

                const startAirport = airportsDataRef.current.find(a => a.iata === startIata);
                const endAirport = airportsDataRef.current.find(a => a.iata === endIata);

                if (startAirport && endAirport) {
                    const startV3 = latLonToVector3(Number(startAirport.lat), Number(startAirport.lon));
                    const endV3 = latLonToVector3(Number(endAirport.lat), Number(endAirport.lon));
                    const dist = startV3.distanceTo(endV3);
                    const samples = Math.max(120, Math.floor(dist * 250));
                    const points: THREE.Vector3[] = [];
                    const cruiseAltitude = 0.02 + (dist * 0.04);

                    for (let j = 0; j <= samples; j++) {
                        const t = j / samples;
                        const point = new THREE.Vector3().copy(startV3).lerp(endV3, t).normalize();
                        const altitudeFactor = Math.pow(Math.sin(Math.PI * t), 0.5);
                        const altitude = 1.005 + (altitudeFactor * cruiseAltitude);
                        point.multiplyScalar(altitude);
                        points.push(point);
                    }

                    const curve = new THREE.CatmullRomCurve3(points);
                    const spacedPoints = curve.getSpacedPoints(samples);

                    // Create arc line
                    const trailGeometry = new THREE.BufferGeometry().setFromPoints(spacedPoints);
                    const positionAttr = trailGeometry.getAttribute('position') as THREE.BufferAttribute;
                    if (positionAttr) positionAttr.setUsage(THREE.DynamicDrawUsage);
                    trailGeometry.setDrawRange(0, 0);

                    const trailMaterial = new THREE.LineBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0.9,
                        depthWrite: false
                    });
                    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
                    arcsGroupRef.current.add(trailLine);

                    // Create plane for this segment
                    const planeColor = getThemeColorHex('--color-origin', 0x0891b2);
                    const planeMesh = new THREE.Mesh(
                        new THREE.SphereGeometry(0.005, 12, 12),
                        new THREE.MeshStandardMaterial({
                            color: planeColor,
                            emissive: planeColor,
                            emissiveIntensity: 3
                        })
                    );
                    arcsGroupRef.current.add(planeMesh);

                    const baseSpeed = 0.002;
                    const realSpeed = baseSpeed / (1 + dist * 2);

                    planesRef.current.push({
                        mesh: planeMesh,
                        curve: curve,
                        points: spacedPoints,
                        line: trailLine,
                        progress: 0, // Stagger if desired, or keep at 0
                        speed: realSpeed
                    });
                }
            }
        }
    }, [isLoaded, originIata, destinationIata, layovers]);

    // 7. Handle camera positioning (Direct Action Driven)
    const lastPropsRef = useRef({ originIata, destinationIata, focusIata, interactive });

    useEffect(() => {
        if (!isLoaded || !cameraRef.current) return;

        const prev = lastPropsRef.current;
        const current = { originIata, destinationIata, focusIata, interactive };
        lastPropsRef.current = current;

        // Determine if we should trigger a camera movement based on what changed
        let shouldMove = false;
        let targetType: 'focus' | 'route' | 'single' | 'home' | null = null;
        let targetIata: string | undefined = undefined;

        const focusChanged = current.focusIata !== prev.focusIata;
        const originChanged = current.originIata !== prev.originIata;
        const destChanged = current.destinationIata !== prev.destinationIata;
        const interactiveChanged = current.interactive !== prev.interactive;

        const originSetOrChanged = originChanged && !!current.originIata;
        const destSetOrChanged = destChanged && !!current.destinationIata;

        if (originSetOrChanged || destSetOrChanged) {
            // Case A: Origin or Destination was explicitly SET or UPDATED
            // This takes top priority (e.g., when confirming an inspected airport)
            shouldMove = true;
            if (current.originIata && current.destinationIata) targetType = 'route';
            else {
                targetType = 'single';
                targetIata = current.originIata || current.destinationIata;
            }
        } else if (focusChanged && current.focusIata) {
            // Case B: A new airport was focused (inspected)
            shouldMove = true;
            targetType = 'focus';
            targetIata = current.focusIata;
        } else if (interactiveChanged && !current.interactive) {
            // Case C: Map was closed -> Return to route or home
            shouldMove = true;
            if (current.originIata && current.destinationIata) targetType = 'route';
            else if (current.originIata || current.destinationIata) {
                targetType = 'single';
                targetIata = current.originIata || current.destinationIata;
            } else targetType = 'home';
        } else {
            // Focus removed or irrelevant change -> Stay still
            shouldMove = false;
        }

        if (!shouldMove) return;

        if (targetType === 'focus' || targetType === 'single') {
            const iata = targetIata;
            const airport = iata ? airportsDataRef.current.find(a => a.iata === iata) : null;
            if (airport) {
                const targetPoint = latLonToVector3(Number(airport.lat), Number(airport.lon));
                const targetPos = targetPoint.clone().normalize().multiplyScalar(1.5);
                gsap.to(cameraRef.current.position, {
                    x: targetPos.x, y: targetPos.y, z: targetPos.z,
                    duration: 1.5, ease: "power2.inOut", overwrite: "auto",
                    onUpdate: () => { cameraRef.current?.lookAt(0, 0, 0); }
                });
            }
        } else if (targetType === 'route' && current.originIata && current.destinationIata) {
            const origin = airportsDataRef.current.find(a => a.iata === current.originIata);
            const dest = airportsDataRef.current.find(a => a.iata === current.destinationIata);
            if (origin && dest) {
                const start = latLonToVector3(Number(origin.lat), Number(origin.lon));
                const end = latLonToVector3(Number(dest.lat), Number(dest.lon));
                const routeDist = start.distanceTo(end);
                const cameraDistance = 2.2 + (routeDist * 0.8);
                const midPos = start.clone().lerp(end, 0.5).normalize();
                let arcNormal = start.clone().cross(end).normalize();
                if (arcNormal.lengthSq() < 0.1) {
                    arcNormal = Math.abs(midPos.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
                }
                if (arcNormal.y > 0 || (Math.abs(arcNormal.y) < 0.001 && arcNormal.x > 0)) {
                    arcNormal.multiplyScalar(-1);
                }
                const tiltedPos = midPos.clone().lerp(arcNormal, 0.20).normalize();
                const targetPos = tiltedPos.multiplyScalar(cameraDistance);
                gsap.to(cameraRef.current.position, {
                    x: targetPos.x, y: targetPos.y, z: targetPos.z,
                    duration: 1.8, ease: "power3.inOut", overwrite: "auto",
                    onUpdate: () => { cameraRef.current?.lookAt(0, 0, 0); }
                });
            }
        } else if (targetType === 'home' && !current.interactive && geoReady) {
            gsap.to(cameraRef.current.position, {
                x: homePositionRef.current.x, y: homePositionRef.current.y, z: homePositionRef.current.z,
                duration: 1.5, ease: "power2.inOut", overwrite: "auto",
                onUpdate: () => { cameraRef.current?.lookAt(0, 0, 0); }
            });
        }
    }, [isLoaded, originIata, destinationIata, focusIata, interactive, geoReady]);



    return (
        <div className='w-full h-full relative overflow-hidden bg-black flex items-center justify-center'>
            <div
                ref={mountRef}
                className={`w-full h-full absolute inset-0 transition-opacity duration-700 ${geoReady ? 'opacity-100' : 'opacity-0'}`}
            />
            <div
                ref={popupRef}
                className="pointer-events-none absolute z-50 hidden rounded-md border border-white/20 bg-black/80 p-2 text-xs text-white backdrop-blur-sm transition-all shadow-xl"
            />


            {/* Origin Tag */}
            <div
                ref={originLabelRef}
                className="pointer-events-none absolute z-40 hidden -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col items-center transition-opacity duration-300"
            >
                <div className="bg-origin/10 backdrop-blur-md border border-origin/40 px-3 py-1 rounded-full text-[10px] font-bold text-origin shadow-[0_4px_12px_rgba(0,0,0,0.5)] whitespace-nowrap">
                    {origin ? (origin.city || origin.name || origin.iata_code) : originIata}
                </div>
                <div className="w-px h-6 bg-linear-to-b from-origin/40 to-transparent" />
            </div>

            {/* Destination Tag */}
            <div
                ref={destLabelRef}
                className="pointer-events-none absolute z-40 hidden -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col items-center transition-opacity duration-300"
            >
                <div className="bg-destination/10 backdrop-blur-md border border-destination/40 px-3 py-1 rounded-full text-[10px] font-bold text-destination shadow-[0_4px_12px_rgba(0,0,0,0.5)] whitespace-nowrap">
                    {destination ? (destination.city || destination.name || destination.iata_code) : destinationIata}
                </div>
                <div className="w-px h-6 bg-linear-to-b from-destination/40 to-transparent" />
            </div>

            {!isLoaded && (
                <div className="z-10 text-white animate-pulse font-medium">
                    Cargando globo terráqueo...
                </div>
            )}

            {/* Context Menu / Cluster Picker */}
            {contextMenu.visible && (contextMenu.airport || contextMenu.clusterAirports) && (
                <div
                    ref={contextMenuContainerRef}
                    className="absolute z-100 min-w-48 bg-main/90 backdrop-blur-3xl border border-line rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.clusterAirports ? (
                        <div className="flex flex-col w-64">
                            <div className="px-4 py-3 border-b border-line bg-surface/30">
                                <div className="text-[10px] text-content-muted font-bold uppercase tracking-wider mb-0.5">Aeropuertos en zona</div>
                                <div className="text-content text-xs font-semibold">
                                    {contextMenu.clusterAirports.length} encontrados
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
                                            <span className="text-[11px] font-bold text-content truncate w-full">{a.city || a.name}</span>
                                            <span className="text-[9px] text-content-muted">{a.iata} - {a.name}</span>
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
                                                    Origen
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
                                                    Destino
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
                    ) : (
                        <>
                            <div className="px-4 py-3 border-b border-line bg-surface/30">
                                <div className="text-[10px] text-content-muted font-bold uppercase tracking-wider mb-0.5">Aeropuerto</div>
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
                                    <span>Definir como Origen</span>
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
                                    <span>Definir como Destino</span>
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

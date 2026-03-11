import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { gsap } from "gsap";
import { MapPin, PlaneTakeoff, PlaneLanding, Info, X } from "lucide-react";
import { useGetGlobeAirports } from "@/api/generated/airports/airports";
import type { GlobeAirportResponse } from "@/api/generated/model";

interface AirportData {
    iata: string;
    lat: number;
    lon: number;
    name: string;
    city: string;
}

interface GlobeProps {
    onAirportSelect?: (iata: string, display?: string) => void;
    originIata?: string;
    destinationIata?: string;
    layovers?: string[];
    interactive?: boolean;
    horizontalOffset?: number;
    onReady?: () => void;
    onSetOrigin?: (iata: string, display: string) => void;
    onSetDestination?: (iata: string, display: string) => void;
    onAirportClick?: (airport: AirportData | null) => void;
    onMovementChange?: (isMoving: boolean) => void;
}

export default function Globe({
    onAirportSelect,
    originIata,
    destinationIata,
    layovers = [],
    interactive = false,
    horizontalOffset = 0,
    onReady,
    onSetOrigin,
    onSetDestination,
    onAirportClick,
    onMovementChange
}: GlobeProps) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);
    const originLabelRef = useRef<HTMLDivElement | null>(null);
    const destLabelRef = useRef<HTMLDivElement | null>(null);
    const clusterLabelsContainerRef = useRef<HTMLDivElement | null>(null);
    const contextMenuContainerRef = useRef<HTMLDivElement | null>(null);
    const clusterLabelsMapRef = useRef<Record<string, HTMLDivElement>>({});

    const airplaneModelRef = useRef<THREE.Group | null>(null);
    const airportsDataRef = useRef<AirportData[]>([]);
    const airportsMap = useRef<Record<string, THREE.Mesh>>({});
    const arcsGroupRef = useRef<THREE.Group>(new THREE.Group());
    const planesRef = useRef<{ mesh: THREE.Object3D; curve: THREE.Curve<THREE.Vector3>; points: THREE.Vector3[]; line: THREE.Line; progress: number; speed: number }[]>([]);

    const sceneRef = useRef<THREE.Scene | null>(null);
    const earthGroupRef = useRef<THREE.Group>(new THREE.Group());
    const airportGroupRef = useRef<THREE.Group>(new THREE.Group());
    const starGroupRef = useRef<THREE.Group>(new THREE.Group());
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const activeOriginRef = useRef<string | undefined>(originIata);
    const activeDestRef = useRef<string | undefined>(destinationIata);
    const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2(-999, -999));
    const onSelectRef = useRef(onAirportSelect);
    const layoversRef = useRef(layovers);
    const currentOffsetRef = useRef({ val: horizontalOffset });
    const homePositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 3.2));
    const onAirportClickRef = useRef(onAirportClick);
    const onMovementChangeRef = useRef(onMovementChange);
    useEffect(() => { onMovementChangeRef.current = onMovementChange; }, [onMovementChange]);
    const lastCamPosRef = useRef(new THREE.Vector3());

    // Stable key for airports that must NOT be clustered (sorted to ignore order in swaps)
    const forcedAirportsKey = useMemo(() => {
        return [originIata, destinationIata, ...layovers]
            .filter(Boolean)
            .sort()
            .join(',');
    }, [originIata, destinationIata, layovers]);
    const lastCamQuatRef = useRef(new THREE.Quaternion());
    const lastMoveTimeRef = useRef(0);

    // Dynamic distance calculation based on aspect ratio to fit globe on mobile
    const calculateDistance = (w: number, h: number) => {
        const aspect = w / h;
        if (aspect < 1) {
            // Mobile portrait: increase distance to fit width
            return 1.8 / (aspect * 0.4142);
        }
        return 3.2; // Desktop / Landscape
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
    const layoversSetRef = useRef<Set<string>>(new Set());
    const interactiveRef = useRef(interactive);

    useEffect(() => {
        activeOriginRef.current = originIata;
        activeDestRef.current = destinationIata;
        onSelectRef.current = onAirportSelect;
        onAirportClickRef.current = onAirportClick;
        layoversRef.current = layovers;
        layoversSetRef.current = new Set(layovers);
    }, [originIata, destinationIata, onAirportSelect, onAirportClick, layovers]);

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
        controls.minDistance = 1.3;
        controls.maxDistance = 6;
        controls.enablePan = false;
        controlsRef.current = controls;

        const hideContextMenu = () => {
            setContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
        };

        const onControlsChange = () => {
            if (camera.position.length() !== 0) {
                const dist = camera.position.length();
                // Balanced threshold: active grouping but keeping major airports distinct at mid-zoom
                const rawThreshold = (dist - 1.1) * 0.028;
                const nextThreshold = Math.max(0.003, Math.min(0.08, rawThreshold));

                setClusterThreshold(prev => {
                    if (Math.abs(prev - nextThreshold) < 0.002) return prev;
                    return nextThreshold;
                });
            }
        };
        controls.addEventListener('change', onControlsChange);

        // Kill any ongoing camera animations when the user starts manual interaction
        controls.addEventListener('start', () => {
            if (cameraRef.current) gsap.killTweensOf(cameraRef.current.position);
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
                        const displayName = a.city || a.name || 'Unknown Location';
                        onSelectRef.current(a.iata, `${displayName} (${a.iata})`);
                    } else {
                        onAirportClickRef.current?.(a);
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
                    popupRef.current.style.left = (e.clientX - rect.left + 10) + "px";
                    popupRef.current.style.top = (e.clientY - rect.top + 10) + "px";

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
                    onMovementChangeRef.current(isMoving);
                }

                const camDist = cam.position.length();
                const zoomFactor = Math.max(0, Math.min(1, (3.5 - camDist) / 2.4));
                raycaster.setFromCamera(mousePosRef.current, cam);

                if (controlsRef.current) {
                    controlsRef.current.rotateSpeed = 0.8 - (0.65 * zoomFactor);
                }

                _camNorm.copy(cam.position).normalize();
                const activeOrigin = activeOriginRef.current;
                const activeDest = activeDestRef.current;
                const layoversSet = layoversSetRef.current;

                const proximityBase = 0.003 + (0.015 * (1 - zoomFactor));
                const baseScale = 0.15 + (0.85 * zoomFactor);

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
                            if (iata === activeOrigin || iata === activeDest || layoversSet.has(iata)) {
                                isSpecial = true;
                                break;
                            }
                        }
                    } else {
                        isSpecial = item.iata === activeOrigin || item.iata === activeDest || layoversSet.has(item.iata);
                    }

                    if (isSpecial) {
                        if (mat.opacity !== 1) mat.opacity = 1;
                        if (mesh.scale.x !== (item.isCluster ? 12 : 12)) mesh.scale.setScalar(item.isCluster ? 12 : 12);
                    } else {
                        let targetOpacity = 0;
                        let targetScale = baseScale;

                        if (interactiveRef.current && !isMoving) {
                            _vec1.copy(mesh.position);
                            const dot = _camNorm.dot(_vec1);
                            if (dot >= 0.1) {
                                let factor = 0;
                                if (isMobileRef.current) {
                                    factor = Math.pow(Math.max(0, (dot - 0.96) / 0.04), 1.5);
                                } else {
                                    const distToRay = raycaster.ray.distanceSqToPoint(_vec1);
                                    if (distToRay < proximityBase) {
                                        factor = 1 - (distToRay / proximityBase);
                                    }
                                }

                                if (factor > 0) {
                                    targetOpacity = Math.max(0.1, 0.8 * factor);
                                    targetScale = baseScale + ((item.isCluster ? 8 : 10) - baseScale) * factor;
                                } else {
                                    targetOpacity = Math.max(0.01, 0.15 * zoomFactor - 0.05);
                                    targetScale = baseScale;
                                }
                            }
                        }

                        if (!(mat.opacity < 0.005 && targetOpacity === 0 && Math.abs(mesh.scale.x - targetScale) < 0.005)) {
                            mat.opacity += (targetOpacity - mat.opacity) * 0.15;
                            if (mat.opacity < 0.001) mat.opacity = 0;
                            const nextScale = mesh.scale.x + (targetScale - mesh.scale.x) * 0.15;
                            mesh.scale.setScalar(nextScale);
                        }
                    }

                    // Integrated Cluster Label Positioning (Optimized)
                    if (item.isCluster && mountRef.current) {
                        const label = clusterLabelsMapRef.current[item.id];
                        if (label) {
                            _vec1.copy(mesh.position); // Earth at 0,0, world pos = local pos
                            const dot = _camNorm.dot(_vec1); // Both are radius 1, so this is the cosine
                            if (dot < 0.2) {
                                if (label.style.opacity !== "0") label.style.opacity = "0";
                            } else {
                                const isVisible = mesh.scale.x > 1.5;
                                if (isVisible) {
                                    _vec1.project(cam);
                                    label.style.opacity = "1";
                                    label.style.left = `${(_vec1.x * 0.5 + 0.5) * mountRef.current.clientWidth}px`;
                                    label.style.top = `${(-_vec1.y * 0.5 + 0.5) * mountRef.current.clientHeight}px`;
                                } else if (label.style.opacity !== "0") {
                                    label.style.opacity = "0";
                                }
                            }
                        }
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
                    contextMenuContainerRef.current.style.left = `${(_vec1.x * 0.5 + 0.5) * mountRef.current.clientWidth}px`;
                    contextMenuContainerRef.current.style.top = `${(-_vec1.y * 0.5 + 0.5) * mountRef.current.clientHeight}px`;
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

            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
            renderer.dispose();
            rendererRef.current = null;
            cameraRef.current = null;
            sceneRef.current = null;
            controlsRef.current = null;

            earthGroupRef.current.clear();
            airportGroupRef.current.clear();
            starGroupRef.current.clear();
            arcsGroupRef.current.clear();
        };
    }, []);

    const layoversString = layovers.join(',');

    // 2. Load and process airports from API (Optimized Clustering + O(N) Grid)
    useEffect(() => {
        if (!isAirportsLoaded || !globeAirports) return;

        airportGroupRef.current.clear();
        airportsMap.current = {};

        // 2a. Pre-calculate positions once (Avoid thousands of sin/cos calls in loops)
        const rawData = globeAirports.map(a => {
            const pos = latLonToVector3(a.la, a.lo);
            return {
                iata: a.i,
                lat: a.la,
                lon: a.lo,
                name: a.n,
                city: a.ci,
                v3: pos // Pre-calculated position
            };
        });

        const items: any[] = [];
        const threshold = clusterThreshold;

        // Force selected, origin, and destination as individuals ALWAYS
        const forcedSet = new Set([...layovers, originIata, destinationIata].filter(Boolean) as string[]);

        const toCluster: any[] = [];
        rawData.forEach(a => {
            if (forcedSet.has(a.iata)) {
                items.push(a);
            } else {
                toCluster.push(a);
            }
        });

        if (threshold <= 0) {
            // Fallback for extreme cases: no clustering
            toCluster.forEach(a => items.push(a));
        } else {
            // 2b. O(N) Spatial Grid Clustering
            const grid: Record<string, any[]> = {};
            const cellSize = threshold * 1.8; // Balanced cell size for more natural grouping

            toCluster.forEach(a => {
                const gx = Math.floor(a.v3.x / cellSize);
                const gy = Math.floor(a.v3.y / cellSize);
                const gz = Math.floor(a.v3.z / cellSize);
                const key = `${gx},${gy},${gz}`;
                if (!grid[key]) grid[key] = [];
                grid[key].push(a);
            });

            Object.values(grid).forEach(group => {
                if (group.length > 1) {
                    const avgLat = group.reduce((s, x) => s + (x.lat || 0), 0) / group.length;
                    const avgLon = group.reduce((s, x) => s + (x.lon || 0), 0) / group.length;
                    items.push({ isCluster: true, airports: group, lat: avgLat, lon: avgLon, id: `cluster-${group[0].iata}` });
                } else {
                    items.push(group[0]);
                }
            });
        }

        // Clean up previous cluster labels
        if (clusterLabelsContainerRef.current) {
            clusterLabelsContainerRef.current.innerHTML = "";
        }
        clusterLabelsMapRef.current = {};

        // 2c. Build Scene (Optimized)
        items.forEach(item => {
            const v3 = item.v3 || latLonToVector3(item.lat, item.lon);

            // Determine initial color/scale
            let meshColor = 0x4444ff;
            let meshOpacity = 0.4;
            let meshScale = 1;

            if (!item.isCluster) {
                if (item.iata === originIata || item.iata === destinationIata) {
                    meshColor = getThemeColorHex(
                        item.iata === originIata ? '--color-origin' : '--color-destination',
                        item.iata === originIata ? 0x0891b2 : 0xc026d3
                    );
                    meshOpacity = 1;
                    meshScale = 12;
                } else if (layoversSetRef.current.has(item.iata)) {
                    meshColor = 0xff8c00; // Orange color for layovers
                    meshOpacity = 1;
                    meshScale = 8;
                }
            } else {
                meshOpacity = 0.6;
            }

            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.0004, 12, 12),
                new THREE.MeshBasicMaterial({ color: meshColor, transparent: true, opacity: meshOpacity })
            );
            mesh.position.copy(v3);
            mesh.scale.setScalar(meshScale);
            mesh.userData = item;
            airportGroupRef.current.add(mesh);

            if (item.isCluster && clusterLabelsContainerRef.current) {
                const label = document.createElement("div");
                label.className = "absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none bg-brand text-[8px] font-bold text-white w-4 h-4 rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-opacity duration-300 opacity-0";
                label.innerText = item.airports.length.toString();
                clusterLabelsContainerRef.current.appendChild(label);
                clusterLabelsMapRef.current[item.id] = label;

                item.airports.forEach((a: any) => airportsMap.current[a.iata] = mesh);
            } else {
                airportsMap.current[item.iata] = mesh;
            }
        });

        airportsDataRef.current = rawData;
        setIsLoaded(true);
    }, [isAirportsLoaded, globeAirports, clusterThreshold, forcedAirportsKey]);

    // 2.5 Style Update Effect (Updates marker visual state WITHOUT rebuilding scene)
    useEffect(() => {
        if (!isLoaded) return;

        const originColor = getThemeColorHex('--color-origin', 0x0891b2);
        const destColor = getThemeColorHex('--color-destination', 0xc026d3);

        const selSet = new Set(layovers);

        airportGroupRef.current.children.forEach(child => {
            const mesh = child as THREE.Mesh;
            const item = mesh.userData;
            const mat = mesh.material as THREE.MeshBasicMaterial;

            if (!item.isCluster) {
                if (item.iata === originIata || item.iata === destinationIata) {
                    mat.color.setHex(item.iata === originIata ? originColor : destColor);
                    mat.opacity = 1;
                    mesh.scale.setScalar(12);
                } else if (selSet.has(item.iata)) {
                    mat.color.setHex(0xff8c00);
                    mat.opacity = 1;
                    mesh.scale.setScalar(8);
                } else {
                    mat.color.setHex(0x4444ff);
                }
            } else {
                // Determine if cluster contains a special airport
                let hasSpecial = false;
                for (let i = 0; i < item.airports.length; i++) {
                    const iata = item.airports[i].iata;
                    if (iata === originIata || iata === destinationIata || selSet.has(iata)) {
                        hasSpecial = true;
                        break;
                    }
                }

                if (hasSpecial) {
                    mat.color.setHex(0x4444ff); // Clusters stay blue but increase scale/opacity
                    mat.opacity = 1;
                    mesh.scale.setScalar(12);
                } else {
                    mat.color.setHex(0x4444ff);
                    mat.opacity = 0.6;
                }
            }
        });
    }, [isLoaded, originIata, destinationIata, layovers.join(',')]);

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
    // 5. Update airport markers (Marker styling only)
    useEffect(() => {
        if (!isLoaded) return;

        airportsDataRef.current.forEach(a => {
            const mesh = airportsMap.current[a.iata];
            if (!mesh) return;

            const material = mesh.material as THREE.MeshBasicMaterial;
            const isSelected = layovers.includes(a.iata);
            const isOrigin = a.iata === originIata;
            const isDestination = a.iata === destinationIata;

            if (isOrigin || isDestination) {
                const themeColor = getThemeColorHex(
                    isOrigin ? '--color-origin' : '--color-destination',
                    isOrigin ? 0x0891b2 : 0xc026d3
                );
                material.color.setHex(themeColor);
                material.opacity = 1;
                mesh.scale.set(12, 12, 12);
            } else if (isSelected) {
                material.color.setHex(0xff8c00);
                material.opacity = 1;
                mesh.scale.set(8, 8, 8);
            } else {
                material.color.setHex(0x4444ff);
                material.opacity = 0.4;
                mesh.scale.set(1, 1, 1);
            }
        });
    }, [isLoaded, originIata, destinationIata, layovers]);

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

        // Draw Arcs and Planes for the full route (Origin -> Layovers -> Destination)
        if (originIata && destinationIata) {
            // Build the sequence of IATAs
            const routeIatas = [originIata, ...(layovers || []), destinationIata].filter(Boolean);
            
            // Only proceed if we have at least 2 valid points
            if (routeIatas.length >= 2) {
                // Map to actual airport data
                const routeAirports = routeIatas
                    .map(iata => airportsDataRef.current.find(a => a.iata === iata))
                    .filter((a): a is AirportData => a !== undefined);

                // Draw a segment between each consecutive pair
                for (let j = 0; j < routeAirports.length - 1; j++) {
                    const currentAirport = routeAirports[j];
                    const nextAirport = routeAirports[j+1];
                    if (!currentAirport || !nextAirport) continue;
                    
                    const start = latLonToVector3(Number(currentAirport.lat), Number(currentAirport.lon));
                    const end = latLonToVector3(Number(nextAirport.lat), Number(nextAirport.lon));
                    const dist = start.distanceTo(end);
                    const samples = Math.max(120, Math.floor(dist * 250));
                    const points: THREE.Vector3[] = [];
                    const cruiseAltitude = 0.02 + (dist * 0.04);

                    for (let i = 0; i <= samples; i++) {
                        const t = i / samples;
                        const point = new THREE.Vector3().copy(start).lerp(end, t).normalize();
                        const altitudeFactor = Math.pow(Math.sin(Math.PI * t), 0.5);
                        const altitude = 1.005 + (altitudeFactor * cruiseAltitude);
                        point.multiplyScalar(altitude);
                        points.push(point);
                    }

                    const curve = new THREE.CatmullRomCurve3(points);
                    const spacedPoints = curve.getSpacedPoints(samples);
                    const pCount = 1;

                    for (let i = 0; i < pCount; i++) {
                        // Alternate colors or strictly use origin color for the trail
                        const planeColor = getThemeColorHex(j === 0 ? '--color-origin' : '--color-destination', j === 0 ? 0x0891b2 : 0xc026d3);
                        const planeMesh = new THREE.Mesh(
                            new THREE.SphereGeometry(0.005, 12, 12),
                            new THREE.MeshStandardMaterial({
                                color: planeColor,
                                emissive: planeColor,
                                emissiveIntensity: 3
                            })
                        );

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

                        const baseSpeed = 0.002;
                        const realSpeed = baseSpeed / (1 + dist * 2);

                        planesRef.current.push({
                            mesh: planeMesh,
                            curve: curve,
                            points: spacedPoints,
                            line: trailLine,
                            progress: i / pCount,
                            speed: realSpeed
                        });
                        arcsGroupRef.current.add(planeMesh);
                    }
                }
            }
        }
    }, [isLoaded, originIata, destinationIata, layovers]);

    // 7. Handle camera positioning (Reacts to selection AND to closing the map)
    useEffect(() => {
        if (!isLoaded || !cameraRef.current) return;

        if (originIata && destinationIata) {
            const origin = airportsDataRef.current.find(a => a.iata === originIata);
            const dest = airportsDataRef.current.find(a => a.iata === destinationIata);

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
                    x: targetPos.x,
                    y: targetPos.y,
                    z: targetPos.z,
                    duration: 1.8,
                    ease: "power3.inOut",
                    overwrite: "auto",
                    onUpdate: () => {
                        cameraRef.current?.lookAt(0, 0, 0);
                    }
                });
            }
        } else {
            const focusedIata = originIata || destinationIata;
            const focusedAirport = focusedIata ? airportsDataRef.current.find(a => a.iata === focusedIata) : null;

            if (focusedAirport) {
                const targetPoint = latLonToVector3(Number(focusedAirport.lat), Number(focusedAirport.lon));
                const targetPos = targetPoint.clone().normalize().multiplyScalar(1.5);

                gsap.to(cameraRef.current.position, {
                    x: targetPos.x,
                    y: targetPos.y,
                    z: targetPos.z,
                    duration: 1.5,
                    ease: "power2.inOut",
                    overwrite: "auto",
                    onUpdate: () => {
                        cameraRef.current?.lookAt(0, 0, 0);
                    }
                });
            } else if (!interactive && geoReady) {
                // If map is NOT interactive and nothing is selected, go back to home position
                gsap.to(cameraRef.current.position, {
                    x: homePositionRef.current.x,
                    y: homePositionRef.current.y,
                    z: homePositionRef.current.z,
                    duration: 1.5,
                    ease: "power2.inOut",
                    overwrite: "auto",
                    onUpdate: () => { cameraRef.current?.lookAt(0, 0, 0); }
                });
            }
        }
    }, [isLoaded, originIata, destinationIata, interactive, geoReady]);



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

            {/* Cluster Labels Container */}
            <div ref={clusterLabelsContainerRef} className="absolute inset-0 pointer-events-none z-30" />

            {/* Origin Tag */}
            <div
                ref={originLabelRef}
                className="pointer-events-none absolute z-40 hidden -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col items-center transition-opacity duration-300"
            >
                <div className="bg-origin/10 backdrop-blur-md border border-origin/40 px-3 py-1 rounded-full text-[10px] font-bold text-origin shadow-[0_4px_12px_rgba(0,0,0,0.5)] whitespace-nowrap">
                    {originIata}
                </div>
                <div className="w-px h-6 bg-linear-to-b from-origin/40 to-transparent" />
            </div>

            {/* Destination Tag */}
            <div
                ref={destLabelRef}
                className="pointer-events-none absolute z-40 hidden -translate-x-1/2 -translate-y-[calc(100%+12px)] flex-col items-center transition-opacity duration-300"
            >
                <div className="bg-destination/10 backdrop-blur-md border border-destination/40 px-3 py-1 rounded-full text-[10px] font-bold text-destination shadow-[0_4px_12px_rgba(0,0,0,0.5)] whitespace-nowrap">
                    {destinationIata}
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
                                                    const displayName = a.city || a.name || 'Unknown Location';
                                                    onSelectRef.current(a.iata, `${displayName} (${a.iata})`);
                                                } else {
                                                    onAirportClickRef.current?.(a);
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
                                                        onSetOrigin?.(a.iata, `${a.city || a.name} (${a.iata})`);
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
                                                        onSetDestination?.(a.iata, `${a.city || a.name} (${a.iata})`);
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
                                <div className="sticky bottom-0 left-0 right-0 h-8 bg-linear-to-t from-main/90 to-transparent pointer-events-none -mt-8" />
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
                                        onSetOrigin?.(a.iata, `${a.city || a.name} (${a.iata})`);
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
                                        onSetDestination?.(a.iata, `${a.city || a.name} (${a.iata})`);
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

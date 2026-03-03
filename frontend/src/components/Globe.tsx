import { useEffect, useRef } from "react";
import * as THREE from "three";
import Papa from "papaparse";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

interface GlobeProps {
    onAirportSelect: (iata: string) => void;
    selectedAirports: string[];
}

export default function Globe({ onAirportSelect, selectedAirports }: GlobeProps) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);

    const airportsMap = useRef<Record<string, THREE.Mesh>>({});

    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        let width = mount.clientWidth;
        let height = mount.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 0, 3);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = 1.3;
        controls.maxDistance = 5;

        // Light
        scene.add(new THREE.AmbientLight(0xffffff, 1));

        // Earth
        const earth = new THREE.Mesh(
            new THREE.SphereGeometry(1, 64, 64),
            new THREE.MeshPhongMaterial({
                map: new THREE.TextureLoader().load(
                    "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg"
                )
            })
        );
        scene.add(earth);

        // Airports
        const airportGroup = new THREE.Group();
        scene.add(airportGroup);
        
        Papa.parse("/airports_data.csv", {
            header: true,
            download: true,
            complete: (result: any) => {
                result.data.forEach((a: any) => {
                    const lat = Number(a.lat);
                    const lon = Number(a.lon);
                    
                    if (!isFinite(lat) || !isFinite(lon)) return;

                    const phi = (90 - lat) * (Math.PI / 180);
                    const theta = (lon + 180) * (Math.PI / 180);

                    const mesh = new THREE.Mesh(
                        new THREE.SphereGeometry(0.0025, 12, 12),
                        new THREE.MeshBasicMaterial({ color: 0xff6600 })
                    );

                    mesh.position.set(
                        -Math.sin(phi) * Math.cos(theta),
                        Math.cos(phi),
                        Math.sin(phi) * Math.sin(theta)
                    );

                    mesh.userData = a;
                    airportGroup.add(mesh);

                    if (a.iata) {
                        airportsMap.current[a.iata] = mesh;
                    }
                });
            }
        });

        // Raycaster
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onClick = (e: MouseEvent) => {
            if (!popupRef.current || !mount) return;

            // Recalculate rectangle of canvas if size changed
            const rect = mount.getBoundingClientRect();

            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            mouse.x = (x / mount.clientWidth) * 2 - 1;
            mouse.y = -(y / mount.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(airportGroup.children);

            if (intersects.length > 0) {
                const a = intersects[0].object.userData;
                popupRef.current.style.left = x + "px";
                popupRef.current.style.top = y + "px";
                popupRef.current.innerHTML = `<b>${a.name} (${a.iata})</b>`;
                popupRef.current.style.display = "block";

                if (a.iata) {
                    onAirportSelect(a.iata);
                }
            } else {
                popupRef.current.style.display = "none";
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!mount) return;

            const rect = mount.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            mouse.x = (x / mount.clientWidth) * 2 - 1;
            mouse.y = -(y / mount.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(airportGroup.children);

            if (intersects.length > 0) {
                renderer.domElement.style.cursor = "pointer";
            } else {
                renderer.domElement.style.cursor = "default";
            }
        };

        renderer.domElement.addEventListener("click", onClick);
        renderer.domElement.addEventListener("mousemove", onMouseMove);

        const handleResize = () => {
            if(!mount) return;

            const newWidth = mount.clientWidth;
            const newHeight = mount.clientHeight;

            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();

            renderer.setSize(newWidth, newHeight);
        }

        window.addEventListener("resize", handleResize);

        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener("resize", handleResize);
            renderer.domElement.removeEventListener("click", onClick);
            renderer.domElement.removeEventListener("mousemove", onMouseMove);

            if (mount && renderer.domElement) {
                mount.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    useEffect(() => {
        Object.keys(airportsMap.current).forEach(iata => {
            const mesh = airportsMap.current[iata];
            const material = mesh.material as THREE.MeshBasicMaterial;

            if (selectedAirports.includes(iata)) {
                material.color.setHex(0x00ff00);
                mesh.scale.set(2.5, 2.5, 2.5);
            } else {
                material.color.setHex(0xff6600);
                mesh.scale.set(1, 1, 1);
            }
        });
    }, [selectedAirports]);

  return (
    <div className='w-full h-[60vh] min-h-[400px] flex items-center justify-center bg-black'>
        <div ref={mountRef} className='w-full h-full relative' >
            <div
                ref={popupRef}
                style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 10,
                background: "white",
                color: "black",
                padding: "6px",
                borderRadius: "6px",
                border: "1px solid #555",
                display: "none",
                pointerEvents: "none"
                }}
            />
        </div>
    </div>
  );
}

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { PoseKeypoint } from '../types/assessment';

interface ThreeDVisualizationProps {
  landmarks: PoseKeypoint[];
  width: number;
  height: number;
}

const ThreeDVisualization: React.FC<ThreeDVisualizationProps> = ({
  landmarks,
  width,
  height
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const landmarkMeshesRef = useRef<THREE.Mesh[]>([]);
  const connectionLinesRef = useRef<THREE.LineSegments[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 5);
    scene.add(directionalLight);

    // Controls
    const controls = {
      mouseX: 0,
      mouseY: 0,
      isMouseDown: false
    };

    const handleMouseDown = (event: MouseEvent) => {
      controls.isMouseDown = true;
      controls.mouseX = event.clientX;
      controls.mouseY = event.clientY;
    };

    const handleMouseUp = () => {
      controls.isMouseDown = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!controls.isMouseDown) return;
      
      const deltaX = event.clientX - controls.mouseX;
      const deltaY = event.clientY - controls.mouseY;
      
      camera.position.x += deltaX * 0.01;
      camera.position.y -= deltaY * 0.01;
      camera.lookAt(0, 0, 0);
      
      controls.mouseX = event.clientX;
      controls.mouseY = event.clientY;
    };

    const handleWheel = (event: WheelEvent) => {
      const delta = event.deltaY * 0.01;
      camera.position.z += delta;
      camera.position.z = Math.max(1, Math.min(10, camera.position.z));
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('wheel', handleWheel);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height]);

  useEffect(() => {
    if (!sceneRef.current || !landmarks.length) return;

    const scene = sceneRef.current;

    // Clear existing meshes
    landmarkMeshesRef.current.forEach(mesh => scene.remove(mesh));
    connectionLinesRef.current.forEach(line => scene.remove(line));
    landmarkMeshesRef.current = [];
    connectionLinesRef.current = [];

    // Create landmark spheres in blue
    const landmarkGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const landmarkMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });

    landmarks.forEach((landmark, index) => {
      if (landmark.visibility > 0.5) {
        const mesh = new THREE.Mesh(landmarkGeometry, landmarkMaterial);
        mesh.position.set(
          (landmark.x - 0.5) * 4,
          -(landmark.y - 0.5) * 4,
          landmark.z * 2
        );
        scene.add(mesh);
        landmarkMeshesRef.current.push(mesh);
      }
    });

    // Create pose connections in blue
    const connections = [
      [11, 12], [11, 13], [12, 14], [13, 15], [14, 16], // Arms
      [11, 23], [12, 24], [23, 24], // Torso
      [23, 25], [24, 26], [25, 27], [26, 28], // Legs
      [27, 29], [28, 30], [29, 31], [30, 32], // Feet
      [15, 17], [16, 18], [17, 19], [18, 20], [19, 21], [20, 22] // Hands
    ];

    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end] && 
          landmarks[start].visibility > 0.5 && landmarks[end].visibility > 0.5) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(
            (landmarks[start].x - 0.5) * 4,
            -(landmarks[start].y - 0.5) * 4,
            landmarks[start].z * 2
          ),
          new THREE.Vector3(
            (landmarks[end].x - 0.5) * 4,
            -(landmarks[end].y - 0.5) * 4,
            landmarks[end].z * 2
          )
        ]);

        const material = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        connectionLinesRef.current.push(line);
      }
    });
  }, [landmarks]);

  return (
    <div className="relative">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded text-sm">
        <p className="font-semibold text-blue-300">3D Pose Visualization</p>
        <p className="text-xs text-gray-300">Mouse: Rotate • Scroll: Zoom</p>
        <p className="text-xs text-blue-300">Blue skeleton in 3D space</p>
      </div>
    </div>
  );
};

export default ThreeDVisualization;
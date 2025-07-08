import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { PoseKeypoint } from '../types/assessment';
import { Maximize2, Minimize2, RotateCcw, Eye, Settings } from 'lucide-react';

interface ThreeDVisualizationProps {
  landmarks: PoseKeypoint[];
  width?: number;
  height?: number;
  className?: string;
}

const ThreeDVisualization: React.FC<ThreeDVisualizationProps> = ({
  landmarks,
  width,
  height,
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const landmarkMeshesRef = useRef<THREE.Mesh[]>([]);
  const connectionLinesRef = useRef<THREE.Line[]>([]);
  const animationIdRef = useRef<number | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'skeleton' | 'points' | 'both'>('both');
  const [autoRotate, setAutoRotate] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  // Pose connections for MediaPipe
  const POSE_CONNECTIONS = [
    // Face
    [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
    // Arms
    [9, 10], [11, 12], [11, 13], [12, 14], [13, 15], [14, 16],
    [15, 17], [16, 18], [15, 19], [16, 20], [17, 19], [18, 20],
    [15, 21], [16, 22],
    // Torso
    [11, 23], [12, 24], [23, 24],
    // Legs
    [23, 25], [24, 26], [25, 27], [26, 28],
    // Feet
    [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
  ];

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = width || rect.width;
        const newHeight = height || rect.height;
        
        setDimensions({ width: newWidth, height: newHeight });
        
        if (rendererRef.current && cameraRef.current) {
          rendererRef.current.setSize(newWidth, newHeight);
          cameraRef.current.aspect = newWidth / newHeight;
          cameraRef.current.updateProjectionMatrix();
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width, height, isFullscreen]);

  useEffect(() => {
    if (!mountRef.current) return;

    initializeScene();
    startAnimation();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    updatePose();
  }, [landmarks, viewMode]);

  const initializeScene = () => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup with responsive aspect ratio
    const camera = new THREE.PerspectiveCamera(
      75, 
      dimensions.width / dimensions.height, 
      0.1, 
      1000
    );
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // Renderer setup with responsive sizing
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(dimensions.width, dimensions.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    
    mountRef.current.appendChild(renderer.domElement);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4080ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8040, 0.2);
    rimLight.position.set(0, -5, 5);
    scene.add(rimLight);

    // Add grid for reference
    const gridHelper = new THREE.GridHelper(4, 20, 0x444444, 0x222222);
    gridHelper.position.y = -1.5;
    scene.add(gridHelper);

    // Mouse controls
    setupMouseControls();
  };

  const setupMouseControls = () => {
    if (!rendererRef.current || !cameraRef.current) return;

    const canvas = rendererRef.current.domElement;
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

    const handleMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseUp = () => {
      isMouseDown = false;
      canvas.style.cursor = 'grab';
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown || !cameraRef.current) return;
      
      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;
      
      targetRotationY += deltaX * 0.01;
      targetRotationX += deltaY * 0.01;
      targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, targetRotationX));
      
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const handleWheel = (event: WheelEvent) => {
      if (!cameraRef.current) return;
      
      event.preventDefault();
      const delta = event.deltaY * 0.001;
      cameraRef.current.position.z += delta;
      cameraRef.current.position.z = Math.max(1, Math.min(10, cameraRef.current.position.z));
    };

    // Smooth camera rotation
    const updateCameraRotation = () => {
      if (!cameraRef.current) return;
      
      currentRotationX += (targetRotationX - currentRotationX) * 0.1;
      currentRotationY += (targetRotationY - currentRotationY) * 0.1;
      
      const radius = cameraRef.current.position.z;
      cameraRef.current.position.x = Math.sin(currentRotationY) * Math.cos(currentRotationX) * radius;
      cameraRef.current.position.y = Math.sin(currentRotationX) * radius;
      cameraRef.current.position.z = Math.cos(currentRotationY) * Math.cos(currentRotationX) * radius;
      cameraRef.current.lookAt(0, 0, 0);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.style.cursor = 'grab';

    // Store the update function for animation loop
    (canvas as any).updateCameraRotation = updateCameraRotation;
  };

  const updatePose = () => {
    if (!sceneRef.current || !landmarks.length) return;

    const scene = sceneRef.current;

    // Clear existing meshes and lines
    landmarkMeshesRef.current.forEach(mesh => scene.remove(mesh));
    connectionLinesRef.current.forEach(line => scene.remove(line));
    landmarkMeshesRef.current = [];
    connectionLinesRef.current = [];

    // Create landmark points
    if (viewMode === 'points' || viewMode === 'both') {
      createLandmarkPoints();
    }

    // Create skeleton connections
    if (viewMode === 'skeleton' || viewMode === 'both') {
      createSkeletonConnections();
    }
  };

  const createLandmarkPoints = () => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    
    landmarks.forEach((landmark, index) => {
      if (landmark.visibility > 0.5) {
        // Different colors for different body parts
        let color = 0x00ff00; // Default green
        
        if (index <= 10) color = 0xff6b6b; // Head - red
        else if (index <= 22) color = 0x4ecdc4; // Arms - cyan
        else if (index <= 24) color = 0xffe66d; // Torso - yellow
        else if (index <= 28) color = 0xa8e6cf; // Legs - light green
        else color = 0xffd93d; // Feet - gold

        // Create sphere with size based on confidence
        const radius = 0.02 + (landmark.visibility * 0.03);
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshPhongMaterial({ 
          color,
          transparent: true,
          opacity: 0.8 + (landmark.visibility * 0.2),
          shininess: 100
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          (landmark.x - 0.5) * 4,
          -(landmark.y - 0.5) * 4,
          landmark.z * 2
        );
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        scene.add(mesh);
        landmarkMeshesRef.current.push(mesh);

        // Add landmark index label
        if (landmark.visibility > 0.8) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = 64;
          canvas.height = 32;
          context.fillStyle = 'rgba(0, 0, 0, 0.8)';
          context.fillRect(0, 0, 64, 32);
          context.fillStyle = 'white';
          context.font = '16px Arial';
          context.textAlign = 'center';
          context.fillText(index.toString(), 32, 20);
          
          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.copy(mesh.position);
          sprite.position.y += 0.1;
          sprite.scale.set(0.2, 0.1, 1);
          
          scene.add(sprite);
          landmarkMeshesRef.current.push(sprite as any);
        }
      }
    });
  };

  const createSkeletonConnections = () => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const startLandmark = landmarks[startIdx];
      const endLandmark = landmarks[endIdx];
      
      if (startLandmark && endLandmark && 
          startLandmark.visibility > 0.5 && endLandmark.visibility > 0.5) {
        
        const startPos = new THREE.Vector3(
          (startLandmark.x - 0.5) * 4,
          -(startLandmark.y - 0.5) * 4,
          startLandmark.z * 2
        );
        
        const endPos = new THREE.Vector3(
          (endLandmark.x - 0.5) * 4,
          -(endLandmark.y - 0.5) * 4,
          endLandmark.z * 2
        );

        // Create tube geometry for better 3D appearance
        const direction = new THREE.Vector3().subVectors(endPos, startPos);
        const length = direction.length();
        
        const geometry = new THREE.CylinderGeometry(0.01, 0.01, length, 8);
        const material = new THREE.MeshPhongMaterial({ 
          color: 0x00aaff,
          transparent: true,
          opacity: 0.8,
          shininess: 50
        });
        
        const cylinder = new THREE.Mesh(geometry, material);
        
        // Position and orient the cylinder
        cylinder.position.copy(startPos).add(endPos).multiplyScalar(0.5);
        cylinder.lookAt(endPos);
        cylinder.rotateX(Math.PI / 2);
        
        cylinder.castShadow = true;
        cylinder.receiveShadow = true;
        
        scene.add(cylinder);
        connectionLinesRef.current.push(cylinder as any);
      }
    });
  };

  const startAnimation = () => {
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // Auto rotation
        if (autoRotate) {
          cameraRef.current.position.x = Math.sin(Date.now() * 0.001) * 3;
          cameraRef.current.position.z = Math.cos(Date.now() * 0.001) * 3;
          cameraRef.current.lookAt(0, 0, 0);
        } else {
          // Manual camera rotation
          const canvas = rendererRef.current.domElement;
          if ((canvas as any).updateCameraRotation) {
            (canvas as any).updateCameraRotation();
          }
        }
        
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  const cleanup = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    
    if (rendererRef.current && mountRef.current) {
      mountRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const resetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 3);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  const containerClasses = isFullscreen 
    ? 'fixed inset-0 z-50 bg-black'
    : `relative w-full h-full ${className}`;

  return (
    <div ref={containerRef} className={containerClasses}>
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        <div className="bg-black bg-opacity-70 text-white p-3 rounded-lg text-sm">
          <p className="font-semibold text-blue-300 mb-2">Enhanced 3D Pose Viewer</p>
          <div className="space-y-1 text-xs">
            <p><strong>Mouse:</strong> Drag to rotate • Scroll to zoom</p>
            <p><strong>Landmarks:</strong> {landmarks.filter(l => l.visibility > 0.5).length}/33</p>
            <p><strong>Mode:</strong> {viewMode}</p>
            <p><strong>Size:</strong> {dimensions.width}×{dimensions.height}</p>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          
          <button
            onClick={resetCamera}
            className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Reset Camera"
          >
            <RotateCcw size={16} />
          </button>
          
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2 rounded-lg transition-colors ${
              autoRotate ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
            } text-white`}
            title="Toggle Auto Rotate"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      {/* View Mode Controls */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-black bg-opacity-70 rounded-lg p-2">
          <div className="flex space-x-1">
            {(['skeleton', 'points', 'both'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div 
        ref={mountRef} 
        className="w-full h-full"
        style={{ 
          width: dimensions.width, 
          height: dimensions.height,
          minHeight: '300px'
        }}
      />

      {/* No pose data message */}
      {landmarks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="text-center text-white">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">No Pose Data</p>
            <p className="text-sm text-gray-300">Start pose detection to see 3D visualization</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDVisualization;
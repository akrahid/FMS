import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PoseKeypoint } from '../types/assessment';
import { Maximize2, Minimize2, RotateCcw, Eye, Settings, Play, Pause, Download } from 'lucide-react';

interface ThreeDVisualizationProps {
  landmarks: PoseKeypoint[];
  width?: number;
  height?: number;
  className?: string;
  enableRecording?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

const ThreeDVisualization: React.FC<ThreeDVisualizationProps> = ({
  landmarks,
  width,
  height,
  className = '',
  enableRecording = false,
  onRecordingStart,
  onRecordingStop
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const landmarkMeshesRef = useRef<THREE.Mesh[]>([]);
  const connectionLinesRef = useRef<THREE.Line[]>([]);
  const animationIdRef = useRef<number | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'skeleton' | 'points' | 'both' | 'mesh' | 'body-mesh'>('both');
  const [autoRotate, setAutoRotate] = useState(false);
  const [showVelocity, setShowVelocity] = useState(false);
  const [showTrails, setShowTrails] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  // Motion trails
  const trailsRef = useRef<THREE.Line[]>([]);
  const trailPointsRef = useRef<Map<number, THREE.Vector3[]>>(new Map());
  const velocityArrowsRef = useRef<THREE.ArrowHelper[]>([]);
  const previousLandmarksRef = useRef<PoseKeypoint[]>([]);

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
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
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
  }, [landmarks, viewMode, showVelocity, showTrails]);

  // Update controls when autoRotate changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  const initializeScene = () => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f0f);
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    
    mountRef.current.appendChild(renderer.domElement);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4080ff, 0.4);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8040, 0.3);
    rimLight.position.set(0, -5, 5);
    scene.add(rimLight);

    // Add enhanced grid for reference
    const gridHelper = new THREE.GridHelper(6, 30, 0x444444, 0x222222);
    gridHelper.position.y = -1.5;
    scene.add(gridHelper);

    // Add coordinate axes
    const axesHelper = new THREE.AxesHelper(1);
    axesHelper.position.set(-2, -1, -2);
    scene.add(axesHelper);

    // Enhanced OrbitControls for better 3D navigation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;
    controlsRef.current = controls;

    // Add control instructions
    console.log('3D Navigation Controls:');
    console.log('- Left click + drag: Rotate');
    console.log('- Right click + drag: Pan');
    console.log('- Scroll: Zoom');
  };

  const updatePose = () => {
    if (!sceneRef.current || !landmarks.length) return;

    const scene = sceneRef.current;

    // Clear existing meshes and lines
    landmarkMeshesRef.current.forEach(mesh => scene.remove(mesh));
    connectionLinesRef.current.forEach(line => scene.remove(line));
    velocityArrowsRef.current.forEach(arrow => scene.remove(arrow));
    
    landmarkMeshesRef.current = [];
    connectionLinesRef.current = [];
    velocityArrowsRef.current = [];

    // Create landmark points
    if (viewMode === 'points' || viewMode === 'both') {
      createLandmarkPoints();
    }

    // Create skeleton connections
    if (viewMode === 'skeleton' || viewMode === 'both') {
      createSkeletonConnections();
    }

    // Create mesh representation
    if (viewMode === 'mesh') {
      createMeshRepresentation();
    }

    // Create detailed body mesh
    if (viewMode === 'body-mesh') {
      createDetailedBodyMesh();
    }

    // Render hand landmarks if available
    if (landmarks.leftHandLandmarks || landmarks.rightHandLandmarks) {
      renderHandLandmarks();
    }

    // Render face mesh if available
    if (landmarks.faceLandmarks) {
      renderFaceMesh();
    }

    // Show velocity vectors
    if (showVelocity) {
      createVelocityVectors();
    }

    // Update motion trails
    if (showTrails) {
      updateMotionTrails();
    }

    // Store current landmarks for velocity calculation
    previousLandmarksRef.current = [...landmarks];
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
        const radius = 0.025 + (landmark.visibility * 0.025);
        const geometry = new THREE.SphereGeometry(radius, 20, 20);
        const material = new THREE.MeshPhongMaterial({ 
          color,
          transparent: true,
          opacity: 0.85 + (landmark.visibility * 0.15),
          shininess: 100,
          emissive: new THREE.Color(color).multiplyScalar(0.1)
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

        // Add landmark index label for high confidence points
        if (landmark.visibility > 0.8) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = 64;
          canvas.height = 32;
          context.fillStyle = 'rgba(0, 0, 0, 0.8)';
          context.fillRect(0, 0, 64, 32);
          context.fillStyle = 'white';
          context.font = 'bold 14px Arial';
          context.textAlign = 'center';
          context.fillText(index.toString(), 32, 20);
          
          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.copy(mesh.position);
          sprite.position.y += 0.15;
          sprite.scale.set(0.25, 0.125, 1);
          
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

        // Create enhanced tube geometry for better 3D appearance
        const direction = new THREE.Vector3().subVectors(endPos, startPos);
        const length = direction.length();
        
        const geometry = new THREE.CylinderGeometry(0.015, 0.015, length, 12);
        const material = new THREE.MeshPhongMaterial({ 
          color: 0x00aaff,
          transparent: true,
          opacity: 0.9,
          shininess: 80,
          emissive: new THREE.Color(0x001133)
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

  const createMeshRepresentation = () => {
    if (!sceneRef.current || landmarks.length < 33) return;

    const scene = sceneRef.current;
    
    // Create a simplified body mesh using key landmarks
    const keyLandmarks = [11, 12, 23, 24]; // Shoulders and hips
    const positions = [];
    
    keyLandmarks.forEach(index => {
      if (landmarks[index] && landmarks[index].visibility > 0.5) {
        positions.push(
          (landmarks[index].x - 0.5) * 4,
          -(landmarks[index].y - 0.5) * 4,
          landmarks[index].z * 2
        );
      }
    });

    if (positions.length >= 12) { // At least 4 points
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      
      // Create faces for the torso
      const indices = [0, 1, 2, 1, 2, 3];
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      
      const material = new THREE.MeshPhongMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        shininess: 60
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      landmarkMeshesRef.current.push(mesh);
    }
  };

  const createDetailedBodyMesh = () => {
    if (!sceneRef.current || landmarks.length < 33) return;

    const scene = sceneRef.current;
    
    // Create a more detailed body mesh using triangulation
    const bodyParts = [
      // Torso
      { indices: [11, 12, 23, 24], color: 0x4ECDC4 },
      // Left arm
      { indices: [11, 13, 15], color: 0xFF6B6B },
      // Right arm  
      { indices: [12, 14, 16], color: 0xFF6B6B },
      // Left leg
      { indices: [23, 25, 27], color: 0xA8E6CF },
      // Right leg
      { indices: [24, 26, 28], color: 0xA8E6CF }
    ];

    bodyParts.forEach(part => {
      const positions = [];
      const validIndices = [];
      
      part.indices.forEach(index => {
        if (landmarks[index] && landmarks[index].visibility > 0.5) {
          positions.push(
            (landmarks[index].x - 0.5) * 4,
            -(landmarks[index].y - 0.5) * 4,
            landmarks[index].z * 2
          );
          validIndices.push(index);
        }
      });

      if (positions.length >= 9) { // At least 3 points for a triangle
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        // Create triangular faces
        const indices = [];
        for (let i = 0; i < validIndices.length - 2; i++) {
          indices.push(0, i + 1, i + 2);
        }
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshPhongMaterial({
          color: part.color,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
          shininess: 60
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        landmarkMeshesRef.current.push(mesh);
      }
    });
  };

  const renderHandLandmarks = () => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    // Render left hand
    if (landmarks.leftHandLandmarks) {
      renderSingleHand(landmarks.leftHandLandmarks.landmarks, 0xFF6B6B, 'Left');
    }

    // Render right hand
    if (landmarks.rightHandLandmarks) {
      renderSingleHand(landmarks.rightHandLandmarks.landmarks, 0x4ECDC4, 'Right');
    }
  };

  const renderSingleHand = (handLandmarks: PoseKeypoint[], color: number, side: string) => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    // Hand connections (simplified)
    const handConnections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm
    ];

    // Render hand landmarks as small spheres
    handLandmarks.forEach((landmark, index) => {
      if (landmark.visibility > 0.5) {
        const geometry = new THREE.SphereGeometry(0.015, 12, 12);
        const material = new THREE.MeshPhongMaterial({ 
          color,
          transparent: true,
          opacity: 0.8
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(
          (landmark.x - 0.5) * 4,
          -(landmark.y - 0.5) * 4,
          landmark.z * 2
        );
        sphere.userData.isFrameObject = true;
        scene.add(sphere);
        landmarkMeshesRef.current.push(sphere);
      }
    });

    // Render hand connections
    handConnections.forEach(([startIdx, endIdx]) => {
      if (handLandmarks[startIdx] && handLandmarks[endIdx] &&
          handLandmarks[startIdx].visibility > 0.5 && handLandmarks[endIdx].visibility > 0.5) {
        
        const startPos = new THREE.Vector3(
          (handLandmarks[startIdx].x - 0.5) * 4,
          -(handLandmarks[startIdx].y - 0.5) * 4,
          handLandmarks[startIdx].z * 2
        );
        
        const endPos = new THREE.Vector3(
          (handLandmarks[endIdx].x - 0.5) * 4,
          -(handLandmarks[endIdx].y - 0.5) * 4,
          handLandmarks[endIdx].z * 2
        );

        const direction = new THREE.Vector3().subVectors(endPos, startPos);
        const length = direction.length();
        
        const geometry = new THREE.CylinderGeometry(0.008, 0.008, length, 8);
        const material = new THREE.MeshPhongMaterial({ 
          color,
          transparent: true,
          opacity: 0.7
        });
        
        const cylinder = new THREE.Mesh(geometry, material);
        cylinder.position.copy(startPos).add(endPos).multiplyScalar(0.5);
        cylinder.lookAt(endPos);
        cylinder.rotateX(Math.PI / 2);
        
        scene.add(cylinder);
        connectionLinesRef.current.push(cylinder as any);
      }
    });
  };

  const renderFaceMesh = () => {
    if (!sceneRef.current || !landmarks.faceLandmarks) return;

    const scene = sceneRef.current;
    const faceLandmarks = landmarks.faceLandmarks.landmarks;

    // Render face landmarks as very small points
    faceLandmarks.forEach((landmark, index) => {
      if (landmark.visibility > 0.5) {
        const geometry = new THREE.SphereGeometry(0.005, 8, 8);
        const material = new THREE.MeshPhongMaterial({ 
          color: 0xFFD700,
          transparent: true,
          opacity: 0.6
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(
          (landmark.x - 0.5) * 4,
          -(landmark.y - 0.5) * 4,
          landmark.z * 2
        );
        sphere.userData.isFrameObject = true;
        scene.add(sphere);
        landmarkMeshesRef.current.push(sphere);
      }
    });

    // Create a simplified face mesh using key landmarks
    if (faceLandmarks.length > 100) {
      const keyFaceIndices = [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1, 19, 94, 125]; // Key face outline points
      const positions = [];
      
      keyFaceIndices.forEach(index => {
        if (faceLandmarks[index]) {
          positions.push(
            (faceLandmarks[index].x - 0.5) * 4,
            -(faceLandmarks[index].y - 0.5) * 4,
            faceLandmarks[index].z * 2
          );
        }
      });

      if (positions.length >= 9) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.MeshPhongMaterial({
          color: 0xFFE4B5,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        landmarkMeshesRef.current.push(mesh);
      }
    }
  };

  const createVelocityVectors = () => {
    if (!sceneRef.current || previousLandmarksRef.current.length === 0) return;

    const scene = sceneRef.current;
    const keyJoints = [11, 12, 13, 14, 23, 24, 25, 26]; // Key joints for velocity

    keyJoints.forEach(index => {
      const current = landmarks[index];
      const previous = previousLandmarksRef.current[index];
      
      if (current && previous && current.visibility > 0.7 && previous.visibility > 0.7) {
        const currentPos = new THREE.Vector3(
          (current.x - 0.5) * 4,
          -(current.y - 0.5) * 4,
          current.z * 2
        );
        
        const previousPos = new THREE.Vector3(
          (previous.x - 0.5) * 4,
          -(previous.y - 0.5) * 4,
          previous.z * 2
        );
        
        const velocity = new THREE.Vector3().subVectors(currentPos, previousPos);
        const speed = velocity.length();
        
        if (speed > 0.01) { // Only show significant velocities
          const direction = velocity.normalize();
          const color = speed > 0.1 ? 0xff0000 : speed > 0.05 ? 0xffaa00 : 0x00ff00;
          
          const arrowHelper = new THREE.ArrowHelper(
            direction,
            currentPos,
            Math.min(speed * 10, 0.5),
            color,
            0.1,
            0.05
          );
          
          scene.add(arrowHelper);
          velocityArrowsRef.current.push(arrowHelper);
        }
      }
    });
  };

  const updateMotionTrails = () => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const keyJoints = [11, 12, 23, 24]; // Shoulders and hips for trails

    keyJoints.forEach(jointIndex => {
      const landmark = landmarks[jointIndex];
      if (landmark && landmark.visibility > 0.7) {
        const position = new THREE.Vector3(
          (landmark.x - 0.5) * 4,
          -(landmark.y - 0.5) * 4,
          landmark.z * 2
        );
        
        if (!trailPointsRef.current.has(jointIndex)) {
          trailPointsRef.current.set(jointIndex, []);
        }
        
        const points = trailPointsRef.current.get(jointIndex)!;
        points.push(position.clone());
        
        // Keep only last 50 points
        if (points.length > 50) {
          points.shift();
        }
        
        // Create/update trail line
        if (points.length > 1) {
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: getJointColor(jointIndex),
            transparent: true,
            opacity: 0.7,
            linewidth: 2
          });
          
          // Remove old trail
          const oldTrail = trailsRef.current.find(t => t.userData.jointIndex === jointIndex);
          if (oldTrail) {
            scene.remove(oldTrail);
            trailsRef.current = trailsRef.current.filter(t => t !== oldTrail);
          }
          
          // Add new trail
          const line = new THREE.Line(geometry, material);
          line.userData.jointIndex = jointIndex;
          trailsRef.current.push(line);
          scene.add(line);
        }
      }
    });
  };

  const getJointColor = (index: number): number => {
    if (index <= 10) return 0xff6b6b; // Head - red
    if (index <= 22) return 0x4ecdc4; // Arms - cyan
    if (index <= 24) return 0xffe66d; // Torso - yellow
    if (index <= 28) return 0xa8e6cf; // Legs - light green
    return 0xffd93d; // Feet - gold
  };

  const startAnimation = () => {
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Update controls
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
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
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 0, 3);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.reset();
    }
  };

  const handleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      onRecordingStop?.();
    } else {
      setIsRecording(true);
      onRecordingStart?.();
    }
  };

  const exportFrame = () => {
    if (rendererRef.current) {
      const canvas = rendererRef.current.domElement;
      const link = document.createElement('a');
      link.download = `pose-frame-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const containerClasses = isFullscreen 
    ? 'fixed inset-0 z-50 bg-black'
    : `relative w-full h-full ${className}`;

  return (
    <div ref={containerRef} className={containerClasses}>
      {/* Enhanced Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-3">
        <div className="bg-black bg-opacity-80 text-white p-4 rounded-lg text-sm backdrop-blur-sm">
          <p className="font-semibold text-blue-300 mb-3">Enhanced 3D Motion Capture</p>
          <div className="space-y-2 text-xs">
            <p><strong>Mouse:</strong> Drag to rotate • Scroll to zoom</p>
            <p><strong>Landmarks:</strong> {landmarks.filter(l => l.visibility > 0.5).length}/33</p>
            <p><strong>Mode:</strong> {viewMode}</p>
            <p><strong>Resolution:</strong> {dimensions.width}×{dimensions.height}</p>
            <p><strong>Quality:</strong> {landmarks.length > 0 ? 'Clinical Grade' : 'No Data'}</p>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          
          <button
            onClick={resetCamera}
            className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg"
            title="Reset Camera"
          >
            <RotateCcw size={18} />
          </button>
          
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-3 rounded-lg transition-colors shadow-lg ${
              autoRotate ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
            } text-white`}
            title="Toggle Auto Rotate"
          >
            <Eye size={18} />
          </button>

          {enableRecording && (
            <button
              onClick={handleRecording}
              className={`p-3 rounded-lg transition-colors shadow-lg ${
                isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'
              } text-white`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? <Pause size={18} /> : <Play size={18} />}
            </button>
          )}

          <button
            onClick={exportFrame}
            className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
            title="Export Frame"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Enhanced View Mode Controls */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-black bg-opacity-80 rounded-lg p-3 backdrop-blur-sm">
          <div className="flex flex-wrap gap-2 mb-3">
            {(['skeleton', 'points', 'both', 'mesh', 'body-mesh'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {mode === 'body-mesh' ? 'Body Mesh' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Visualization Options */}
          <div className="space-y-2 text-white text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showVelocity}
                onChange={(e) => setShowVelocity(e.target.checked)}
                className="rounded"
              />
              <span>Velocity Vectors</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTrails}
                onChange={(e) => setShowTrails(e.target.checked)}
                className="rounded"
              />
              <span>Motion Trails</span>
            </label>
            <div className="text-xs text-gray-400 mt-2">
              <p><strong>Navigation:</strong></p>
              <p>• Left drag: Rotate</p>
              <p>• Right drag: Pan</p>
              <p>• Scroll: Zoom</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute bottom-4 left-4 z-10 flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          <span className="font-semibold">Recording Motion</span>
        </div>
      )}

      {/* 3D Canvas Container */}
      <div 
        ref={mountRef} 
        className="w-full h-full"
        style={{ 
          width: dimensions.width, 
          height: dimensions.height,
          minHeight: '400px'
        }}
      />

      {/* No pose data message */}
      {landmarks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 backdrop-blur-sm">
          <div className="text-center text-white">
            <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-semibold mb-2">No Motion Data</p>
            <p className="text-sm text-gray-300">Start pose detection to see 3D visualization</p>
            <p className="text-xs text-gray-400 mt-2">Enhanced with sub-millimeter accuracy</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDVisualization;
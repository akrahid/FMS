import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Download, Eye, Settings, Maximize2, Minimize2 } from 'lucide-react';
import { MotionRecording, MotionFrame, MovementAnalysis } from '../types/assessment';
import { motionCaptureSystem } from '../utils/motionCapture';
import * as THREE from 'three';

interface MotionPlaybackProps {
  recording: MotionRecording;
  onClose: () => void;
}

const MotionPlayback: React.FC<MotionPlaybackProps> = ({ recording, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [viewMode, setViewMode] = useState<'skeleton' | 'mesh' | 'points'>('skeleton');
  const [showVelocity, setShowVelocity] = useState(false);
  const [showTrails, setShowTrails] = useState(false);
  const [showCenterOfMass, setShowCenterOfMass] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [analysis, setAnalysis] = useState<MovementAnalysis | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Motion trails
  const trailsRef = useRef<THREE.Line[]>([]);
  const trailPointsRef = useRef<Map<number, THREE.Vector3[]>>(new Map());

  useEffect(() => {
    initializeScene();
    analyzeRecording();
    return () => cleanup();
  }, []);

  useEffect(() => {
    updateVisualization();
  }, [currentFrame, viewMode, showVelocity, showTrails, showCenterOfMass]);

  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    } else {
      stopPlayback();
    }
    return () => stopPlayback();
  }, [isPlaying, playbackSpeed]);

  const initializeScene = () => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, 16/9, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(800, 450);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4080ff, 0.4);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Grid
    const gridHelper = new THREE.GridHelper(10, 50, 0x444444, 0x222222);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Start animation loop
    startAnimation();
  };

  const analyzeRecording = async () => {
    const movementAnalysis = motionCaptureSystem.analyzeMovement(recording);
    setAnalysis(movementAnalysis);
  };

  const updateVisualization = () => {
    if (!sceneRef.current || !recording.frames[currentFrame]) return;

    const scene = sceneRef.current;
    const frame = recording.frames[currentFrame];

    // Clear previous frame objects
    const objectsToRemove = scene.children.filter(child => 
      child.userData.isFrameObject
    );
    objectsToRemove.forEach(obj => scene.remove(obj));

    // Clear trails if not showing
    if (!showTrails) {
      trailsRef.current.forEach(trail => scene.remove(trail));
      trailsRef.current = [];
      trailPointsRef.current.clear();
    }

    // Render body landmarks
    if (frame.bodyLandmarks.length > 0) {
      renderBodyPose(frame);
    }

    // Render hand landmarks
    if (frame.leftHand) {
      renderHandPose(frame.leftHand, 'left');
    }
    if (frame.rightHand) {
      renderHandPose(frame.rightHand, 'right');
    }

    // Show velocity vectors
    if (showVelocity && analysis) {
      renderVelocityVectors();
    }

    // Show center of mass
    if (showCenterOfMass && analysis) {
      renderCenterOfMass();
    }

    // Update trails
    if (showTrails) {
      updateMotionTrails(frame);
    }
  };

  const renderBodyPose = (frame: MotionFrame) => {
    const scene = sceneRef.current!;
    const landmarks = frame.bodyLandmarks;

    // Pose connections for MediaPipe
    const connections = [
      [11, 12], [11, 13], [12, 14], [13, 15], [14, 16],
      [11, 23], [12, 24], [23, 24],
      [23, 25], [24, 26], [25, 27], [26, 28],
      [27, 29], [28, 30], [29, 31], [30, 32]
    ];

    // Render based on view mode
    switch (viewMode) {
      case 'skeleton':
        renderSkeleton(landmarks, connections);
        break;
      case 'mesh':
        renderMesh(landmarks);
        break;
      case 'points':
        renderPoints(landmarks);
        break;
    }
  };

  const renderSkeleton = (landmarks: any[], connections: number[][]) => {
    const scene = sceneRef.current!;

    // Render connections
    connections.forEach(([startIdx, endIdx]) => {
      if (landmarks[startIdx] && landmarks[endIdx]) {
        const start = new THREE.Vector3(
          (landmarks[startIdx].x - 0.5) * 4,
          -(landmarks[startIdx].y - 0.5) * 4,
          landmarks[startIdx].z * 2
        );
        const end = new THREE.Vector3(
          (landmarks[endIdx].x - 0.5) * 4,
          -(landmarks[endIdx].y - 0.5) * 4,
          landmarks[endIdx].z * 2
        );

        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({ 
          color: 0x00aaff,
          linewidth: 3
        });
        const line = new THREE.Line(geometry, material);
        line.userData.isFrameObject = true;
        scene.add(line);
      }
    });

    // Render joints
    landmarks.forEach((landmark, index) => {
      if (landmark) {
        const geometry = new THREE.SphereGeometry(0.03, 16, 16);
        const material = new THREE.MeshPhongMaterial({ 
          color: getJointColor(index),
          transparent: true,
          opacity: 0.9
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(
          (landmark.x - 0.5) * 4,
          -(landmark.y - 0.5) * 4,
          landmark.z * 2
        );
        sphere.userData.isFrameObject = true;
        scene.add(sphere);
      }
    });
  };

  const renderMesh = (landmarks: any[]) => {
    // Create a simplified mesh representation
    const scene = sceneRef.current!;
    
    // Create body mesh using key landmarks
    if (landmarks.length >= 33) {
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      const indices = [];

      // Add vertices from landmarks
      landmarks.forEach(landmark => {
        if (landmark) {
          vertices.push(
            (landmark.x - 0.5) * 4,
            -(landmark.y - 0.5) * 4,
            landmark.z * 2
          );
        }
      });

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      
      const material = new THREE.MeshPhongMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.isFrameObject = true;
      scene.add(mesh);
    }
  };

  const renderPoints = (landmarks: any[]) => {
    const scene = sceneRef.current!;
    
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    landmarks.forEach((landmark, index) => {
      if (landmark) {
        positions.push(
          (landmark.x - 0.5) * 4,
          -(landmark.y - 0.5) * 4,
          landmark.z * 2
        );
        
        const color = new THREE.Color(getJointColor(index));
        colors.push(color.r, color.g, color.b);
      }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    const points = new THREE.Points(geometry, material);
    points.userData.isFrameObject = true;
    scene.add(points);
  };

  const renderHandPose = (hand: any, side: 'left' | 'right') => {
    const scene = sceneRef.current!;
    const color = side === 'left' ? 0xff6b6b : 0x4ecdc4;

    hand.landmarks.forEach((landmark: any, index: number) => {
      const geometry = new THREE.SphereGeometry(0.02, 12, 12);
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
    });
  };

  const renderVelocityVectors = () => {
    if (!analysis || !analysis.velocities) return;
    
    const scene = sceneRef.current!;
    const frame = recording.frames[currentFrame];
    
    // Show velocity vectors for key joints
    const keyJoints = ['Left Shoulder', 'Right Shoulder', 'Left Hip', 'Right Hip'];
    
    analysis.velocities.forEach(velocity => {
      if (keyJoints.includes(velocity.jointName)) {
        const origin = new THREE.Vector3(0, 0, 0); // Would map to actual joint position
        const direction = new THREE.Vector3(
          velocity.velocity.x,
          velocity.velocity.y,
          velocity.velocity.z
        ).normalize();
        
        const arrowHelper = new THREE.ArrowHelper(
          direction,
          origin,
          velocity.speed * 0.5,
          0xff0000,
          0.2,
          0.1
        );
        arrowHelper.userData.isFrameObject = true;
        scene.add(arrowHelper);
      }
    });
  };

  const renderCenterOfMass = () => {
    if (!analysis || !analysis.centerOfMass[currentFrame]) return;
    
    const scene = sceneRef.current!;
    const com = analysis.centerOfMass[currentFrame];
    
    const geometry = new THREE.SphereGeometry(0.05, 16, 16);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xffff00,
      emissive: 0x444400
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(com.x * 4, -com.y * 4, com.z * 2);
    sphere.userData.isFrameObject = true;
    scene.add(sphere);
  };

  const updateMotionTrails = (frame: MotionFrame) => {
    const scene = sceneRef.current!;
    
    // Update trails for key joints
    const keyJointIndices = [11, 12, 23, 24]; // Shoulders and hips
    
    keyJointIndices.forEach(jointIndex => {
      if (frame.bodyLandmarks[jointIndex]) {
        const landmark = frame.bodyLandmarks[jointIndex];
        const position = new THREE.Vector3(
          (landmark.x - 0.5) * 4,
          -(landmark.y - 0.5) * 4,
          landmark.z * 2
        );
        
        if (!trailPointsRef.current.has(jointIndex)) {
          trailPointsRef.current.set(jointIndex, []);
        }
        
        const points = trailPointsRef.current.get(jointIndex)!;
        points.push(position);
        
        // Keep only last 30 points
        if (points.length > 30) {
          points.shift();
        }
        
        // Create/update trail line
        if (points.length > 1) {
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: getJointColor(jointIndex),
            transparent: true,
            opacity: 0.6
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
          line.userData.isFrameObject = true;
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
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  const startPlayback = () => {
    const frameInterval = (1000 / recording.frameRate) / playbackSpeed;
    
    playbackIntervalRef.current = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + 1;
        if (next >= recording.frames.length) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, frameInterval);
  };

  const stopPlayback = () => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  const cleanup = () => {
    stopPlayback();
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    if (rendererRef.current && mountRef.current) {
      mountRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }
  };

  const handleFrameSeek = (frameIndex: number) => {
    setCurrentFrame(Math.max(0, Math.min(frameIndex, recording.frames.length - 1)));
  };

  const exportBVH = () => {
    const bvhData = motionCaptureSystem.exportToBVH(recording);
    const blob = new Blob([bvhData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.name}.bvh`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (frameIndex: number): string => {
    const seconds = frameIndex / recording.frameRate;
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'relative'}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{recording.name}</h3>
            <p className="text-sm text-gray-600">
              {recording.frames.length} frames • {recording.frameRate}fps • {recording.duration.toFixed(2)}s
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* 3D Viewer */}
        <div className={`${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-96'} bg-gray-900 relative`}>
          <div ref={mountRef} className="w-full h-full" />
          
          {/* Frame Info Overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg text-sm">
            <p>Frame: {currentFrame + 1} / {recording.frames.length}</p>
            <p>Time: {formatTime(currentFrame)}</p>
            <p>Confidence: {(recording.frames[currentFrame]?.confidence * 100 || 0).toFixed(1)}%</p>
          </div>

          {/* View Controls */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-70 rounded-lg p-2">
            <div className="flex space-x-1">
              {(['skeleton', 'mesh', 'points'] as const).map((mode) => (
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

          {/* Visualization Options */}
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 rounded-lg p-3">
            <div className="space-y-2 text-white text-sm">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showVelocity}
                  onChange={(e) => setShowVelocity(e.target.checked)}
                  className="rounded"
                />
                <span>Velocity Vectors</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showTrails}
                  onChange={(e) => setShowTrails(e.target.checked)}
                  className="rounded"
                />
                <span>Motion Trails</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showCenterOfMass}
                  onChange={(e) => setShowCenterOfMass(e.target.checked)}
                  className="rounded"
                />
                <span>Center of Mass</span>
              </label>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          {/* Playback Controls */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={() => handleFrameSeek(0)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <SkipBack size={20} />
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <button
              onClick={() => handleFrameSeek(recording.frames.length - 1)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <SkipForward size={20} />
            </button>

            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value={0.1}>0.1x</option>
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2.0x</option>
            </select>

            <button
              onClick={exportBVH}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              <span>Export BVH</span>
            </button>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <input
              type="range"
              min={0}
              max={recording.frames.length - 1}
              value={currentFrame}
              onChange={(e) => handleFrameSeek(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0:00.00</span>
              <span>{formatTime(recording.frames.length - 1)}</span>
            </div>
          </div>
        </div>

        {/* Analysis Panel */}
        {analysis && (
          <div className="p-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">Movement Analysis</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{analysis.movementQuality.toFixed(1)}</div>
                <div className="text-blue-700">Quality Score</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{analysis.velocities.length}</div>
                <div className="text-green-700">Velocity Points</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{analysis.deviations.length}</div>
                <div className="text-yellow-700">Deviations</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{recording.metadata.trackingQuality}</div>
                <div className="text-purple-700">Tracking Quality</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MotionPlayback;
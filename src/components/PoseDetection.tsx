import React, { useRef, useEffect, useState } from 'react';
import { Camera } from '@mediapipe/camera_utils';
import { Pose, Results } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS, POSE_LANDMARKS } from '@mediapipe/pose';
import { PoseResults, JointAngle, AnnotationData } from '../types/assessment';
import { calculateAllJointAngles, updatePerformanceMetrics } from '../utils/poseAnalysis';

interface PoseDetectionProps {
  onPoseResults: (results: PoseResults) => void;
  onJointAngles: (angles: JointAngle[]) => void;
  isRecording: boolean;
  currentTest: string;
  annotations: AnnotationData[];
  mirrorCamera?: boolean;
}

const LANDMARK_NAMES = {
  0: 'nose',
  1: 'left eye (inner)',
  2: 'left eye',
  3: 'left eye (outer)',
  4: 'right eye (inner)',
  5: 'right eye',
  6: 'right eye (outer)',
  7: 'left ear',
  8: 'right ear',
  9: 'mouth (left)',
  10: 'mouth (right)',
  11: 'left shoulder',
  12: 'right shoulder',
  13: 'left elbow',
  14: 'right elbow',
  15: 'left wrist',
  16: 'right wrist',
  17: 'left pinky',
  18: 'right pinky',
  19: 'left index',
  20: 'right index',
  21: 'left thumb',
  22: 'right thumb',
  23: 'left hip',
  24: 'right hip',
  25: 'left knee',
  26: 'right knee',
  27: 'left ankle',
  28: 'right ankle',
  29: 'left heel',
  30: 'right heel',
  31: 'left foot index',
  32: 'right foot index'
};

const PoseDetection: React.FC<PoseDetectionProps> = ({
  onPoseResults,
  onJointAngles,
  isRecording,
  currentTest,
  annotations,
  mirrorCamera = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pose, setPose] = useState<Pose | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [error, setError] = useState<string>('');
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const [performanceStats, setPerformanceStats] = useState({
    fps: 0,
    latency: 0,
    confidence: 0
  });

  // Performance tracking
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const processingTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const initializePose = async (startCamera = false) => {
      if (!videoRef.current || !canvasRef.current) return;

      try {
        setError('');

        const poseInstance = new Pose({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        poseInstance.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: true,
          minDetectionConfidence: 0.7, // Increased for clinical accuracy
          minTrackingConfidence: 0.7   // Increased for clinical accuracy
        });

        poseInstance.onResults(onResults);
        setPose(poseInstance);

        const cameraInstance = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && poseInstance) {
              const startTime = performance.now();
              await poseInstance.send({ image: videoRef.current });
              const processingTime = performance.now() - startTime;
              
              // Track processing times for latency calculation
              processingTimesRef.current.push(processingTime);
              if (processingTimesRef.current.length > 30) {
                processingTimesRef.current.shift();
              }
            }
          },
          width: 1280,
          height: 720
        });

        setCamera(cameraInstance);
        
        if (startCamera) {
          await cameraInstance.start();
          setIsCameraStarted(true);
        }
        
        setIsInitialized(true);

        // Start FPS tracking
        const fpsInterval = setInterval(() => {
          const now = Date.now();
          const elapsed = now - lastTimeRef.current;
          const fps = (frameCountRef.current * 1000) / elapsed;
          
          const avgLatency = processingTimesRef.current.length > 0 ?
            processingTimesRef.current.reduce((a, b) => a + b, 0) / processingTimesRef.current.length : 0;

          setPerformanceStats(prev => ({
            ...prev,
            fps: Math.round(fps),
            latency: Math.round(avgLatency)
          }));

          updatePerformanceMetrics({
            fps: Math.round(fps),
            latency: Math.round(avgLatency),
            processingTime: avgLatency
          });

          frameCountRef.current = 0;
          lastTimeRef.current = now;
        }, 1000);

        return () => clearInterval(fpsInterval);

      } catch (err) {
        console.error('MediaPipe initialization error:', err);
        setError('Failed to initialize pose detection. Please check your internet connection and try again.');
      }
    };

    initializePose();

    return () => {
      if (camera) {
        camera.stop();
      }
    };
  }, []);

  const startCamera = async () => {
    if (camera && !isCameraStarted) {
      try {
        await camera.start();
        setIsCameraStarted(true);
      } catch (error) {
        console.error('Failed to start camera:', error);
        setError('Failed to start camera. Please check permissions and try again.');
      }
    }
  };

  const stopCamera = () => {
    if (camera && isCameraStarted) {
      camera.stop();
      setIsCameraStarted(false);
    }
  };

  const onResults = (results: Results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    frameCountRef.current++;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply mirroring if enabled
    if (mirrorCamera) {
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
    }
    
    // Draw the video frame
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    if (results.poseLandmarks) {
      // Calculate average confidence
      const avgConfidence = results.poseLandmarks.reduce((sum, landmark) => 
        sum + (landmark.visibility || 0), 0) / results.poseLandmarks.length;
      
      setPerformanceStats(prev => ({
        ...prev,
        confidence: Math.round(avgConfidence * 100)
      }));

      // Convert MediaPipe landmarks to our format with enhanced confidence tracking
      const landmarks = results.poseLandmarks.map(landmark => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility || 1,
        confidence: landmark.visibility || 1
      }));

      // Draw pose connections in blue
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#0000FF',
        lineWidth: 3
      });

      // Draw landmarks as blue bullet points
      drawLandmarks(ctx, results.poseLandmarks, {
        color: '#0000FF',
        lineWidth: 2,
        radius: 6
      });

      // Reset transformation for text to keep it readable
      if (mirrorCamera) {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
      }

      // Draw landmark indices and names (always in correct orientation)
      drawLandmarkData(ctx, results.poseLandmarks, canvas.width, canvas.height, mirrorCamera);

      // Send pose results with enhanced metadata
      const poseResults: PoseResults = {
        landmarks,
        timestamp: Date.now(),
        processingLatency: processingTimesRef.current[processingTimesRef.current.length - 1] || 0,
        confidence: avgConfidence
      };

      onPoseResults(poseResults);

      // Calculate and display joint angles using centralized function
      const angles = calculateAllJointAngles(landmarks);
      onJointAngles(angles);
      drawAngles(ctx, angles, canvas.width, canvas.height, mirrorCamera);
    }

    // Draw annotations (always in correct orientation)
    drawAnnotations(ctx, annotations, mirrorCamera);
    
    ctx.restore();
  };

  const drawLandmarkData = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number, mirrored: boolean) => {
    const displayIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;

    displayIndices.forEach(index => {
      if (landmarks[index] && landmarks[index].visibility > 0.5) {
        let x = landmarks[index].x * width;
        const y = landmarks[index].y * height;
        
        // Adjust x position for mirrored display
        if (mirrored) {
          x = width - x;
        }
        
        const text = `${index}`;
        const name = LANDMARK_NAMES[index as keyof typeof LANDMARK_NAMES];
        const confidence = Math.round((landmarks[index].visibility || 0) * 100);
        
        // Draw index number with larger font
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeText(text, x + 10, y - 10);
        ctx.fillText(text, x + 10, y - 10);
        
        // Draw landmark name with confidence
        if (name) {
          ctx.font = 'bold 14px Arial';
          ctx.fillStyle = confidence >= 70 ? '#00FF00' : confidence >= 50 ? '#FFFF00' : '#FF0000';
          ctx.strokeText(`${name} (${confidence}%)`, x + 10, y + 20);
          ctx.fillText(`${name} (${confidence}%)`, x + 10, y + 20);
        }
      }
    });
  };

  const drawAngles = (ctx: CanvasRenderingContext2D, angles: JointAngle[], width: number, height: number, mirrored: boolean) => {
    angles.forEach((angle, index) => {
      const point = angle.points[1]; // Middle point (joint)
      let x = point.x * width;
      const y = point.y * height;
      
      // Adjust x position for mirrored display
      if (mirrored) {
        x = width - x;
      }
      
      // Create background for text with confidence-based opacity
      const opacity = angle.confidence / 100;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.8 * opacity})`;
      ctx.fillRect(x + 15, y - 35 - (index * 35), 180, 30);
      
      // Draw angle text with confidence and deviation info
      const color = angle.normal ? '#00FF00' : angle.warning ? '#FFFF00' : '#FF0000';
      ctx.fillStyle = color;
      ctx.font = 'bold 14px Arial';
      ctx.fillText(
        `${angle.name}: ${angle.angle.toFixed(1)}°`,
        x + 20,
        y - 20 - (index * 35)
      );
      
      // Draw confidence and deviation
      ctx.font = 'bold 12px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(
        `Conf: ${angle.confidence.toFixed(0)}% | Dev: ${angle.deviationDirection}${angle.deviation.toFixed(1)}°`,
        x + 20,
        y - 5 - (index * 35)
      );
    });
  };

  const drawAnnotations = (ctx: CanvasRenderingContext2D, annotations: AnnotationData[], mirrored: boolean) => {
    annotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = annotation.thickness;
      
      let coords = [...annotation.coordinates];
      
      // Adjust coordinates for mirrored display
      if (mirrored) {
        for (let i = 0; i < coords.length; i += 2) {
          coords[i] = canvasRef.current!.width - coords[i];
        }
      }
      
      switch (annotation.type) {
        case 'line':
          ctx.beginPath();
          ctx.moveTo(coords[0], coords[1]);
          ctx.lineTo(coords[2], coords[3]);
          ctx.stroke();
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(
            coords[0],
            coords[1],
            coords[2],
            0,
            2 * Math.PI
          );
          ctx.stroke();
          break;
        case 'text':
          ctx.fillStyle = annotation.color;
          ctx.font = '16px Arial';
          ctx.fillText(
            annotation.text || '',
            coords[0],
            coords[1]
          );
          break;
      }
    });
  };

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${mirrorCamera ? 'scale-x-[-1]' : ''}`}
        autoPlay
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={1280}
        height={720}
      />
      
      {(!isInitialized || !isCameraStarted) && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-white text-center">
            {!isInitialized ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-lg font-semibold">Initializing clinical pose detection...</p>
                <p className="text-sm text-gray-300 mt-2">Loading enhanced MediaPipe models...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold mb-4">Camera Ready</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Start Camera
                </button>
                <p className="text-sm text-gray-300 mt-2">Click to begin pose detection</p>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center p-6 max-w-md">
            <div className="text-red-400 text-lg mb-4 font-semibold">Clinical System Error</div>
            <p className="text-white text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry Initialization
            </button>
          </div>
        </div>
      )}
      
      {isRecording && isCameraStarted && (
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black bg-opacity-50 px-3 py-2 rounded-lg">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-white font-semibold">Clinical Recording</span>
        </div>
      )}

      {/* Enhanced Performance Metrics */}
      {isCameraStarted && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg text-sm space-y-1">
          <p className="font-semibold text-blue-300">Clinical MediaPipe Pose Detection</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-green-300">FPS: </span>
              <span className={performanceStats.fps >= 25 ? 'text-green-400' : 'text-yellow-400'}>
                {performanceStats.fps}
              </span>
            </div>
            <div>
              <span className="text-blue-300">Latency: </span>
              <span className={performanceStats.latency <= 50 ? 'text-green-400' : 'text-yellow-400'}>
                {performanceStats.latency}ms
              </span>
            </div>
            <div>
              <span className="text-purple-300">Confidence: </span>
              <span className={
                performanceStats.confidence >= 90 ? 'text-green-400' :
                performanceStats.confidence >= 70 ? 'text-yellow-400' : 'text-red-400'
              }>
                {performanceStats.confidence}%
              </span>
            </div>
            <div>
              <span className="text-orange-300">Quality: </span>
              <span className={
                performanceStats.confidence >= 90 && performanceStats.fps >= 25 && performanceStats.latency <= 50 
                  ? 'text-green-400' : 'text-yellow-400'
              }>
                {performanceStats.confidence >= 90 && performanceStats.fps >= 25 && performanceStats.latency <= 50 
                  ? 'Clinical' : 'Standard'}
              </span>
            </div>
          </div>
          <p className="text-xs text-yellow-300">Enhanced confidence tracking • Goniometer-grade accuracy</p>
          {mirrorCamera && <p className="text-xs text-purple-300">Camera mirrored for natural movement</p>}
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={stopCamera}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
            >
              Stop Camera
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoseDetection;
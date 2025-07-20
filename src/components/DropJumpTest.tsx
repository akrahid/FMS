import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Camera, Eye, AlertTriangle, CheckCircle, Target, Activity, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { dualCameraManager } from '../utils/cameraSetup';
import { Pose3DProcessor } from '../utils/pose3dProcessor';
import { DropJumpAnalyzer } from '../utils/temporalAnalysis';
import { DropJumpTrial, DropJumpAssessment } from '../types/assessment';
import { Pose } from '@mediapipe/pose';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';

interface DropJumpTestProps {
  onAssessmentComplete: (assessment: DropJumpAssessment) => void;
}

const DropJumpTest: React.FC<DropJumpTestProps> = ({ onAssessmentComplete }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [trials, setTrials] = useState<DropJumpTrial[]>([]);
  const [error, setError] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<'initializing' | 'ready' | 'recording' | 'analyzing'>('initializing');
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 0,
    latency: 0,
    confidence: 0,
    triangulationQuality: 0
  });

  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);

  const pose1Ref = useRef<Pose | null>(null);
  const pose2Ref = useRef<Pose | null>(null);
  const camera1Ref = useRef<MediaPipeCamera | null>(null);
  const camera2Ref = useRef<MediaPipeCamera | null>(null);
  const pose3DProcessorRef = useRef<Pose3DProcessor | null>(null);
  const dropJumpAnalyzerRef = useRef<DropJumpAnalyzer | null>(null);

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    initializeSystem();
    return () => {
      cleanup();
    };
  }, []);

  const initializeSystem = async () => {
    try {
      setSystemStatus('initializing');
      setError('');

      // Initialize dual cameras
      const cameraSuccess = await dualCameraManager.initialize();
      if (!cameraSuccess) {
        throw new Error('Failed to initialize cameras. Please ensure at least one camera is connected and grant camera permissions.');
      }

      const { camera1, camera2 } = dualCameraManager.getStreams();
      const calibration = dualCameraManager.getCalibration();

      if (!camera1 || !camera2 || !calibration) {
        throw new Error('Camera streams or calibration not available');
      }

      // Initialize 3D pose processor
      pose3DProcessorRef.current = new Pose3DProcessor(calibration);
      dropJumpAnalyzerRef.current = new DropJumpAnalyzer();

      // Initialize MediaPipe Pose for both cameras
      await initializeMediaPipePose();

      // Set up video streams
      if (video1Ref.current && video2Ref.current) {
        video1Ref.current.srcObject = camera1;
        video2Ref.current.srcObject = camera2;
        
        await Promise.all([
          video1Ref.current.play(),
          video2Ref.current.play()
        ]);
      }

      setIsInitialized(true);
      setSystemStatus('ready');
      console.log('3D Drop Jump Test system initialized successfully');

    } catch (err) {
      console.error('System initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown initialization error');
      setSystemStatus('initializing');
    }
  };

  const initializeMediaPipePose = async () => {
    // Initialize pose detection for camera 1
    const pose1 = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose1.setOptions({
      modelComplexity: 2, // Highest accuracy for clinical use
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.8,
      minTrackingConfidence: 0.8
    });

    pose1.onResults(onPose1Results);
    pose1Ref.current = pose1;

    // Initialize pose detection for camera 2
    const pose2 = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose2.setOptions({
      modelComplexity: 2,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.8,
      minTrackingConfidence: 0.8
    });

    pose2.onResults(onPose2Results);
    pose2Ref.current = pose2;

    // Initialize cameras
    if (video1Ref.current && video2Ref.current) {
      camera1Ref.current = new MediaPipeCamera(video1Ref.current, {
        onFrame: async () => {
          if (video1Ref.current && pose1Ref.current) {
            await pose1Ref.current.send({ image: video1Ref.current });
          }
        },
        width: 1920,
        height: 1080
      });

      camera2Ref.current = new MediaPipeCamera(video2Ref.current, {
        onFrame: async () => {
          if (video2Ref.current && pose2Ref.current) {
            await pose2Ref.current.send({ image: video2Ref.current });
          }
        },
        width: 1920,
        height: 1080
      });
    }
  };

  const landmarks1Ref = useRef<any>(null);
  const landmarks2Ref = useRef<any>(null);

  const onPose1Results = (results: any) => {
    landmarks1Ref.current = results.poseLandmarks;
    drawPoseResults(results, canvas1Ref.current);
    processCombinedResults();
  };

  const onPose2Results = (results: any) => {
    landmarks2Ref.current = results.poseLandmarks;
    drawPoseResults(results, canvas2Ref.current);
    processCombinedResults();
  };

  const processCombinedResults = async () => {
    if (!landmarks1Ref.current || !landmarks2Ref.current || 
        !pose3DProcessorRef.current || !dropJumpAnalyzerRef.current) return;

    try {
      frameCountRef.current++;

      // Convert MediaPipe landmarks to our format
      const landmarks2D_cam1 = landmarks1Ref.current.map((lm: any) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility || 1,
        confidence: lm.visibility || 1
      }));

      const landmarks2D_cam2 = landmarks2Ref.current.map((lm: any) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility || 1,
        confidence: lm.visibility || 1
      }));

      // Process 3D pose
      const pose3D = await pose3DProcessorRef.current.process3DPose(
        landmarks2D_cam1,
        landmarks2D_cam2,
        Date.now()
      );

      // Update performance metrics
      updatePerformanceMetrics(pose3D);

      // Process frame for drop jump analysis
      if (isRecording) {
        dropJumpAnalyzerRef.current.processFrame(pose3D);
      }

    } catch (error) {
      console.error('Error processing combined results:', error);
    }
  };

  const drawPoseResults = (results: any, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the video frame
    if (results.image) {
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    }

    // Draw pose landmarks and connections
    if (results.poseLandmarks) {
      // Draw connections
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      
      // Draw landmarks
      ctx.fillStyle = '#FF0000';
      results.poseLandmarks.forEach((landmark: any, index: number) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw landmark index
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText(index.toString(), x + 5, y - 5);
        ctx.fillStyle = '#FF0000';
      });
    }

    ctx.restore();
  };

  const updatePerformanceMetrics = (pose3D: any) => {
    const now = Date.now();
    const elapsed = now - lastTimeRef.current;
    
    if (elapsed >= 1000) { // Update every second
      const fps = (frameCountRef.current * 1000) / elapsed;
      
      setPerformanceMetrics({
        fps: Math.round(fps),
        latency: Math.round(pose3D.processingTime || 0),
        confidence: Math.round(pose3D.confidence * 100),
        triangulationQuality: Math.round(pose3D.confidence * 100) // Simplified
      });

      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
  };

  const startRecording = async () => {
    if (!dropJumpAnalyzerRef.current) return;

    try {
      setIsRecording(true);
      setSystemStatus('recording');
      dropJumpAnalyzerRef.current.startAnalysis();
      
      // Start cameras
      if (camera1Ref.current && camera2Ref.current) {
        await Promise.all([
          camera1Ref.current.start(),
          camera2Ref.current.start()
        ]);
      }

      console.log('Drop Jump recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (!dropJumpAnalyzerRef.current) return;

    setIsRecording(false);
    setSystemStatus('analyzing');

    const detectedTrials = dropJumpAnalyzerRef.current.stopAnalysis();
    setTrials(detectedTrials);

    // Generate assessment
    const assessment = generateAssessment(detectedTrials);
    onAssessmentComplete(assessment);

    setSystemStatus('ready');
    console.log(`Recording stopped. ${detectedTrials.length} trials detected.`);
  };

  const generateAssessment = (trials: DropJumpTrial[]): DropJumpAssessment => {
    const riskDistribution = { low: 0, moderate: 0, high: 0 };
    
    trials.forEach(trial => {
      riskDistribution[trial.riskLevel]++;
    });

    const overallRisk = trials.length > 0 ? 
      (riskDistribution.high / trials.length >= 0.5 ? 'high' :
       riskDistribution.moderate / trials.length >= 0.5 ? 'moderate' : 'low') : 'low';

    // Calculate average metrics
    const averageMetrics = trials.length > 0 ? {
      kneeValgusLeft: trials.reduce((sum, t) => sum + t.metrics.kneeValgusLeft, 0) / trials.length,
      kneeValgusRight: trials.reduce((sum, t) => sum + t.metrics.kneeValgusRight, 0) / trials.length,
      trunkLeanSagittal: trials.reduce((sum, t) => sum + t.metrics.trunkLeanSagittal, 0) / trials.length,
      trunkLeanFrontal: trials.reduce((sum, t) => sum + t.metrics.trunkLeanFrontal, 0) / trials.length,
      bilateralSymmetry: trials.reduce((sum, t) => sum + t.metrics.bilateralSymmetry, 0) / trials.length,
      landingStability: trials.reduce((sum, t) => sum + t.metrics.landingStability, 0) / trials.length,
      armPositionCompliance: trials.reduce((sum, t) => sum + t.metrics.armPositionCompliance, 0) / trials.length
    } : {
      kneeValgusLeft: 0, kneeValgusRight: 0, trunkLeanSagittal: 0, trunkLeanFrontal: 0,
      bilateralSymmetry: 0, landingStability: 0, armPositionCompliance: 0
    };

    // Generate clinical recommendations
    const clinicalRecommendations: string[] = [];
    if (overallRisk === 'high') {
      clinicalRecommendations.push('High ACL injury risk detected - comprehensive intervention program recommended');
      clinicalRecommendations.push('Focus on neuromuscular training and landing mechanics');
    }
    if (averageMetrics.kneeValgusLeft > 15 || averageMetrics.kneeValgusRight > 15) {
      clinicalRecommendations.push('Knee valgus control exercises recommended');
    }
    if (averageMetrics.bilateralSymmetry > 10) {
      clinicalRecommendations.push('Bilateral symmetry training needed');
    }

    return {
      testId: 'drop-jump',
      trials,
      overallRisk,
      riskDistribution,
      averageMetrics,
      clinicalRecommendations,
      timestamp: Date.now()
    };
  };

  const reset = () => {
    setTrials([]);
    setCurrentTrial(0);
    setSystemStatus('ready');
    if (dropJumpAnalyzerRef.current) {
      dropJumpAnalyzerRef.current = new DropJumpAnalyzer();
    }
  };

  const cleanup = () => {
    if (camera1Ref.current) camera1Ref.current.stop();
    if (camera2Ref.current) camera2Ref.current.stop();
    dualCameraManager.dispose();
  };

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'ready': return 'text-green-600 bg-green-100';
      case 'recording': return 'text-red-600 bg-red-100';
      case 'analyzing': return 'text-blue-600 bg-blue-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">3D Drop Jump Test</h2>
              <p className="text-sm text-gray-600">ACL Injury Risk Assessment • Dual Camera 3D Analysis</p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isInitialized}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? <Pause size={20} /> : <Play size={20} />}
            <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
          </button>

          <button
            onClick={reset}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw size={18} />
            <span>Reset</span>
          </button>

          <div className="text-sm text-gray-600">
            Trials: {trials.length}/9 recommended
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">System Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
          <button
            onClick={initializeSystem}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry Initialization
          </button>
        </div>
      )}

      {/* Camera Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera 1 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-800">Camera 1 (Left)</span>
            </div>
          </div>
          <div className="relative h-96">
            <video
              ref={video1Ref}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvas1Ref}
              className="absolute inset-0 w-full h-full"
              width={640}
              height={480}
            />
          </div>
        </div>

        {/* Camera 2 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-800">Camera 2 (Right)</span>
            </div>
          </div>
          <div className="relative h-96">
            <video
              ref={video2Ref}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvas2Ref}
              className="absolute inset-0 w-full h-full"
              width={640}
              height={480}
            />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">3D System Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{performanceMetrics.fps}</div>
            <div className="text-sm text-gray-600">FPS</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{performanceMetrics.latency}ms</div>
            <div className="text-sm text-gray-600">Latency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{performanceMetrics.confidence}%</div>
            <div className="text-sm text-gray-600">Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{performanceMetrics.triangulationQuality}%</div>
            <div className="text-sm text-gray-600">3D Quality</div>
          </div>
        </div>
      </div>

      {/* Trial Results */}
      {trials.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Trial Results</h3>
          <div className="space-y-3">
            {trials.map((trial) => (
              <div key={trial.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-800">Trial {trial.id}</span>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(trial.riskLevel)}`}>
                    {trial.riskLevel.toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Valgus: {trial.metrics.kneeValgusLeft.toFixed(1)}°/{trial.metrics.kneeValgusRight.toFixed(1)}°</span>
                  <span>Confidence: {trial.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropJumpTest;
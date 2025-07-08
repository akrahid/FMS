import React, { useState, useRef, useCallback } from 'react';
import { Upload, Play, Pause, RotateCcw, Download, FileVideo, AlertCircle, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { Pose } from '@mediapipe/pose';
import { PoseResults, JointAngle, AssessmentMetricResult } from '../types/assessment';
import { calculateAllJointAngles, getDetailedMetricResults } from '../utils/poseAnalysis';
import { FMS_TESTS } from '../data/fmsTests';

interface VideoUploadAnalyzerProps {
  onAnalysisComplete?: (results: VideoAnalysisResults) => void;
}

interface VideoAnalysisResults {
  videoFile: File;
  totalFrames: number;
  analyzedFrames: number;
  poseResults: PoseResults[];
  jointAngles: JointAngle[][];
  metricResults: AssessmentMetricResult[][];
  averageMetrics: AssessmentMetricResult[];
  testType: string;
  timestamp: number;
  processingTime: number;
}

interface AnalysisProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining: number;
}

const VideoUploadAnalyzer: React.FC<VideoUploadAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [analysisResults, setAnalysisResults] = useState<VideoAnalysisResults | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<string>('deep-squat');
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const poseRef = useRef<Pose | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    setAnalysisResults(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Load video metadata
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.load();
    }
  }, []);

  const initializeMediaPipe = async (): Promise<boolean> => {
    try {
      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      pose.setOptions({
        modelComplexity: 2, // Highest accuracy for video analysis
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      poseRef.current = pose;
      return true;
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      setError('Failed to initialize pose detection. Please try again.');
      return false;
    }
  };

  const analyzeVideo = async () => {
    if (!selectedFile || !videoRef.current || !canvasRef.current) return;

    setIsAnalyzing(true);
    setError('');
    setAnalysisProgress(null);

    const startTime = Date.now();

    try {
      // Initialize MediaPipe
      const initialized = await initializeMediaPipe();
      if (!initialized) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      // Set canvas size
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Calculate frame extraction parameters
      const duration = video.duration;
      const frameRate = 30; // Extract 30 frames per second
      const totalFrames = Math.floor(duration * frameRate);
      const frameInterval = 1 / frameRate;

      const poseResults: PoseResults[] = [];
      const jointAnglesArray: JointAngle[][] = [];
      const metricResultsArray: AssessmentMetricResult[][] = [];

      let currentFrame = 0;
      let lastProgressUpdate = Date.now();

      // Process video frame by frame
      for (let time = 0; time < duration; time += frameInterval) {
        video.currentTime = time;
        
        // Wait for video to seek to the correct time
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        // Draw current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data for MediaPipe
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Process with MediaPipe
        const results = await new Promise<any>((resolve) => {
          if (poseRef.current) {
            poseRef.current.onResults = resolve;
            poseRef.current.send({ image: canvas });
          }
        });

        if (results.poseLandmarks) {
          // Convert to our format
          const landmarks = results.poseLandmarks.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility || 1,
            confidence: lm.visibility || 1
          }));

          const poseResult: PoseResults = {
            landmarks,
            timestamp: time * 1000,
            confidence: landmarks.reduce((sum, lm) => sum + lm.confidence, 0) / landmarks.length
          };

          poseResults.push(poseResult);

          // Calculate joint angles
          const jointAngles = calculateAllJointAngles(landmarks);
          jointAnglesArray.push(jointAngles);

          // Calculate metrics for selected test
          const metricResults = getDetailedMetricResults(selectedTestType, landmarks);
          metricResultsArray.push(metricResults);
        }

        currentFrame++;

        // Update progress
        const now = Date.now();
        if (now - lastProgressUpdate > 100) { // Update every 100ms
          const percentage = (currentFrame / totalFrames) * 100;
          const elapsed = now - startTime;
          const estimatedTotal = (elapsed / percentage) * 100;
          const estimatedTimeRemaining = estimatedTotal - elapsed;

          setAnalysisProgress({
            currentFrame,
            totalFrames,
            percentage,
            estimatedTimeRemaining
          });

          lastProgressUpdate = now;
        }
      }

      // Calculate average metrics
      const averageMetrics = calculateAverageMetrics(metricResultsArray);

      const results: VideoAnalysisResults = {
        videoFile: selectedFile,
        totalFrames,
        analyzedFrames: poseResults.length,
        poseResults,
        jointAngles: jointAnglesArray,
        metricResults: metricResultsArray,
        averageMetrics,
        testType: selectedTestType,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime
      };

      setAnalysisResults(results);
      
      // Save to local storage
      saveAnalysisToLocal(results);

      if (onAnalysisComplete) {
        onAnalysisComplete(results);
      }

    } catch (error) {
      console.error('Video analysis error:', error);
      setError('Failed to analyze video. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const calculateAverageMetrics = (metricResultsArray: AssessmentMetricResult[][]): AssessmentMetricResult[] => {
    if (metricResultsArray.length === 0) return [];

    const metricMap = new Map<string, AssessmentMetricResult[]>();

    // Group metrics by ID
    metricResultsArray.forEach(frameMetrics => {
      frameMetrics.forEach(metric => {
        if (!metricMap.has(metric.metricId)) {
          metricMap.set(metric.metricId, []);
        }
        metricMap.get(metric.metricId)!.push(metric);
      });
    });

    // Calculate averages
    const averageMetrics: AssessmentMetricResult[] = [];
    metricMap.forEach((metrics, metricId) => {
      const avgValue = metrics.reduce((sum, m) => sum + m.actualValue, 0) / metrics.length;
      const avgConfidence = metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length;
      const passCount = metrics.filter(m => m.pass).length;
      const passRate = passCount / metrics.length;

      const firstMetric = metrics[0];
      averageMetrics.push({
        ...firstMetric,
        actualValue: Math.round(avgValue * 10) / 10,
        confidence: Math.round(avgConfidence),
        pass: passRate >= 0.7, // Pass if 70% of frames pass
        warning: passRate >= 0.5 && passRate < 0.7
      });
    });

    return averageMetrics;
  };

  const saveAnalysisToLocal = (results: VideoAnalysisResults) => {
    try {
      const savedAnalyses = JSON.parse(localStorage.getItem('videoAnalyses') || '[]');
      
      // Create a summary for storage (without full pose data to save space)
      const summary = {
        id: Date.now().toString(),
        fileName: results.videoFile.name,
        fileSize: results.videoFile.size,
        testType: results.testType,
        timestamp: results.timestamp,
        processingTime: results.processingTime,
        totalFrames: results.totalFrames,
        analyzedFrames: results.analyzedFrames,
        averageMetrics: results.averageMetrics,
        overallScore: calculateOverallScore(results.averageMetrics)
      };

      savedAnalyses.unshift(summary);
      
      // Keep only last 10 analyses
      if (savedAnalyses.length > 10) {
        savedAnalyses.splice(10);
      }

      localStorage.setItem('videoAnalyses', JSON.stringify(savedAnalyses));
      console.log('Analysis saved to local storage');
    } catch (error) {
      console.error('Failed to save analysis to local storage:', error);
    }
  };

  const calculateOverallScore = (metrics: AssessmentMetricResult[]): number => {
    if (metrics.length === 0) return 0;
    
    const criticalMetrics = metrics.filter(m => m.isCritical);
    const passedCritical = criticalMetrics.filter(m => m.pass).length;
    const totalCritical = criticalMetrics.length;
    
    if (totalCritical === 0) return 2;
    
    const passRate = passedCritical / totalCritical;
    if (passRate >= 0.9) return 3;
    if (passRate >= 0.7) return 2;
    if (passRate >= 0.5) return 1;
    return 0;
  };

  const downloadResults = () => {
    if (!analysisResults) return;

    const dataStr = JSON.stringify(analysisResults, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `video-analysis-${analysisResults.testType}-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const reset = () => {
    setSelectedFile(null);
    setAnalysisResults(null);
    setAnalysisProgress(null);
    setError('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileVideo className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Video Upload Analyzer</h2>
              <p className="text-sm text-gray-600">Upload and analyze movement videos with AI pose detection</p>
            </div>
          </div>
        </div>

        {/* Test Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Test Type
          </label>
          <select
            value={selectedTestType}
            onChange={(e) => setSelectedTestType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            disabled={isAnalyzing}
          >
            {FMS_TESTS.map((test) => (
              <option key={test.id} value={test.id}>
                {test.name}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isAnalyzing}
          />
          
          {!selectedFile ? (
            <div>
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">Upload Video File</p>
              <p className="text-sm text-gray-500 mb-4">
                Supported formats: MP4, MOV, AVI, WebM (Max 100MB)
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                disabled={isAnalyzing}
              >
                Choose Video File
              </button>
            </div>
          ) : (
            <div>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">{selectedFile.name}</p>
              <p className="text-sm text-gray-500 mb-4">
                Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={analyzeVideo}
                  disabled={isAnalyzing}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Play size={16} />
                  <span>{isAnalyzing ? 'Analyzing...' : 'Start Analysis'}</span>
                </button>
                <button
                  onClick={reset}
                  disabled={isAnalyzing}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <RotateCcw size={16} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Video Preview */}
      {previewUrl && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Video Preview</h3>
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-auto max-h-96"
              controls
              preload="metadata"
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Analysis Progress */}
      {analysisProgress && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Analysis Progress</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock size={16} />
              <span>ETA: {formatTime(analysisProgress.estimatedTimeRemaining)}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Frame {analysisProgress.currentFrame} of {analysisProgress.totalFrames}</span>
              <span>{analysisProgress.percentage.toFixed(1)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Analysis Results</h3>
            <button
              onClick={downloadResults}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download size={16} />
              <span>Download Results</span>
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analysisResults.analyzedFrames}</div>
              <div className="text-sm text-gray-600">Frames Analyzed</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatTime(analysisResults.processingTime)}</div>
              <div className="text-sm text-gray-600">Processing Time</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{calculateOverallScore(analysisResults.averageMetrics)}/3</div>
              <div className="text-sm text-gray-600">Overall Score</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(analysisResults.averageMetrics.reduce((sum, m) => sum + m.confidence, 0) / analysisResults.averageMetrics.length)}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
          </div>

          {/* Average Metrics */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
              <BarChart3 size={16} />
              <span>Average Metrics</span>
            </h4>
            
            {analysisResults.averageMetrics.map((metric, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  metric.pass 
                    ? 'bg-green-50 border-green-400 text-green-800' 
                    : metric.warning
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                    : 'bg-red-50 border-red-400 text-red-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{metric.name}</span>
                  <span className="text-sm font-bold">{metric.actualValue}{metric.unit}</span>
                </div>
                <div className="text-xs mt-1 opacity-75">
                  Target: {metric.targetDescription} | Confidence: {metric.confidence}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploadAnalyzer;
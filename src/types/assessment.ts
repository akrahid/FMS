export interface FMSTest {
  id: string;
  name: string;
  description: string;
  instructions: string[];
  keyPoints: string[];
  scoringCriteria: {
    score: number;
    description: string;
    criteria: string[];
  }[];
  metrics: AssessmentMetricDefinition[];
}

export interface AssessmentMetricDefinition {
  id: string;
  name: string;
  description: string;
  targetDescription: string;
  targetMin?: number;
  targetMax?: number;
  targetExact?: number;
  unit: string;
  isCritical: boolean;
  category: 'angle' | 'distance' | 'symmetry' | 'alignment' | 'stability';
  validationCriteria: {
    passThreshold: number;
    warningThreshold?: number;
    tolerance: number;
    colorCoding: {
      pass: string;
      warning: string;
      fail: string;
    };
  };
}

export interface AssessmentMetricResult {
  metricId: string;
  name: string;
  targetDescription: string;
  actualValue: number;
  unit: string;
  pass: boolean;
  warning?: boolean;
  isCritical: boolean;
  category: string;
  deviation?: number;
  deviationDirection?: '+' | '-';
  confidence: number;
  timestamp: number;
}

export interface PoseKeypoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
  confidence?: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface HandLandmarks {
  landmarks: Vector3D[]; // 21 points per hand
  confidence: number;
  timestamp: number;
}

export interface MotionFrame {
  timestamp: number;
  bodyLandmarks: Vector3D[];
  leftHand?: HandLandmarks;
  rightHand?: HandLandmarks;
  confidence: number;
  frameIndex: number;
}

export interface MotionRecording {
  id: string;
  name: string;
  frames: MotionFrame[];
  frameRate: number;
  duration: number;
  testType: string;
  timestamp: number;
  metadata: {
    totalFrames: number;
    averageConfidence: number;
    trackingQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

export interface JointVelocity {
  jointName: string;
  velocity: Vector3D;
  speed: number;
  acceleration: Vector3D;
}

export interface MovementAnalysis {
  jointAngles: JointAngle3D[];
  velocities: JointVelocity[];
  centerOfMass: Vector3D[];
  movementQuality: number;
  deviations: MovementDeviation[];
  forceVectors: Vector3D[];
}

export interface MovementDeviation {
  jointName: string;
  deviationType: 'angle' | 'velocity' | 'position';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  frameIndex: number;
}

export interface Pose3DResults {
  landmarks: Vector3D[];
  confidence: number;
  timestamp: number;
  processingLatency: number;
  triangulationQuality: number;
}

export interface DropJumpTrial {
  id: number;
  timestamp: number;
  metrics: {
    kneeValgusLeft: number;
    kneeValgusRight: number;
    trunkLeanSagittal: number;
    trunkLeanFrontal: number;
    bilateralSymmetry: number;
    landingStability: number;
    armPositionCompliance: number;
  };
  riskLevel: 'low' | 'moderate' | 'high';
  confidence: number;
  landingPhase: {
    startFrame: number;
    endFrame: number;
    impactFrame: number;
    duration: number;
  };
}

export interface DropJumpAssessment {
  testId: string;
  trials: DropJumpTrial[];
  overallRisk: 'low' | 'moderate' | 'high';
  riskDistribution: {
    low: number;
    moderate: number;
    high: number;
  };
  averageMetrics: {
    kneeValgusLeft: number;
    kneeValgusRight: number;
    trunkLeanSagittal: number;
    trunkLeanFrontal: number;
    bilateralSymmetry: number;
    landingStability: number;
    armPositionCompliance: number;
  };
  clinicalRecommendations: string[];
  timestamp: number;
}

export interface PoseResults {
  landmarks: PoseKeypoint[];
  leftHandLandmarks?: HandLandmarks;
  rightHandLandmarks?: HandLandmarks;
  faceLandmarks?: FaceLandmarks;
  timestamp: number;
  processingLatency?: number;
  confidence: number;
}

export interface HandLandmarks {
  landmarks: PoseKeypoint[];
  confidence: number;
  handedness: 'Left' | 'Right';
}

export interface FaceLandmarks {
  landmarks: PoseKeypoint[];
  confidence: number;
}

export interface AssessmentScore {
  testId: string;
  score: number;
  automaticScore: number;
  manualOverride?: boolean;
  overrideReason?: string;
  notes: string;
  timestamp: number;
  metricResults: AssessmentMetricResult[];
  poseData?: PoseResults[];
  annotations?: AnnotationData[];
  painReported?: boolean;
  clinicianId?: string;
  auditTrail: {
    originalScore: number;
    changes: {
      timestamp: number;
      from: number;
      to: number;
      reason: string;
      clinicianId?: string;
    }[];
  };
}

export interface AnnotationData {
  id: string;
  type: 'line' | 'circle' | 'text' | 'angle';
  coordinates: number[];
  color: string;
  thickness: number;
  text?: string;
  timestamp: number;
}

export interface JointAngle {
  name: string;
  angle: number;
  normal: boolean;
  warning?: boolean;
  points: [PoseKeypoint, PoseKeypoint, PoseKeypoint];
  targetThresholdDescription: string;
  targetMin: number;
  targetMax: number;
  confidence: number;
  deviation: number;
  deviationDirection: '+' | '-';
}

export interface ClinicalValidationResult {
  testId: string;
  validationPassed: boolean;
  interRaterReliability?: number;
  accuracyScore?: number;
  edgeCaseHandling: {
    lowLight: boolean;
    obstruction: boolean;
    dynamicStability: boolean;
  };
  performanceMetrics: {
    fps: number;
    latency: number;
    poseAccuracy: number;
  };
}

export interface SystemPerformanceMetrics {
  fps: number;
  latency: number;
  poseDetectionAccuracy: number;
  processingTime: number;
  memoryUsage?: number;
}
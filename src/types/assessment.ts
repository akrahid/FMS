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

export interface PoseResults {
  landmarks: PoseKeypoint[];
  timestamp: number;
  processingLatency?: number;
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
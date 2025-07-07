import { PoseKeypoint, JointAngle, AssessmentMetricResult, AssessmentMetricDefinition, SystemPerformanceMetrics } from '../types/assessment';
import { FMS_TESTS } from '../data/fmsTests';

// Performance tracking
let performanceMetrics: SystemPerformanceMetrics = {
  fps: 0,
  latency: 0,
  poseDetectionAccuracy: 0,
  processingTime: 0
};

export function updatePerformanceMetrics(metrics: Partial<SystemPerformanceMetrics>) {
  performanceMetrics = { ...performanceMetrics, ...metrics };
}

export function getPerformanceMetrics(): SystemPerformanceMetrics {
  return performanceMetrics;
}

export function calculateAngle(
  point1: PoseKeypoint,
  point2: PoseKeypoint,
  point3: PoseKeypoint
): number {
  const vector1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y
  };
  
  const vector2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y
  };
  
  const dot = vector1.x * vector2.x + vector1.y * vector2.y;
  const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
  
  const cosine = dot / (mag1 * mag2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosine)));
  
  return (angle * 180) / Math.PI;
}

export function calculateDistance(point1: PoseKeypoint, point2: PoseKeypoint): number {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  const dz = point1.z - point2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function calculateAllJointAngles(landmarks: PoseKeypoint[]): JointAngle[] {
  if (landmarks.length < 33) return [];
  
  const startTime = performance.now();
  const angles: JointAngle[] = [];
  
  // Calculate confidence based on landmark visibility
  const getConfidence = (points: PoseKeypoint[]): number => {
    const avgVisibility = points.reduce((sum, p) => sum + (p.visibility || 0), 0) / points.length;
    return Math.min(avgVisibility * 100, 100);
  };

  // Shoulder angles
  if (landmarks[12] && landmarks[11] && landmarks[13] && 
      landmarks[12].visibility > 0.5 && landmarks[11].visibility > 0.5 && landmarks[13].visibility > 0.5) {
    const leftShoulderAngle = calculateAngle(
      landmarks[12], landmarks[11], landmarks[13]
    );
    
    const confidence = getConfidence([landmarks[12], landmarks[11], landmarks[13]]);
    const deviation = leftShoulderAngle < 90 ? 90 - leftShoulderAngle : 
                     leftShoulderAngle > 180 ? leftShoulderAngle - 180 : 0;
    
    angles.push({
      name: 'Left Shoulder',
      angle: leftShoulderAngle,
      normal: leftShoulderAngle >= 90 && leftShoulderAngle <= 180,
      warning: leftShoulderAngle >= 85 && leftShoulderAngle < 90 || leftShoulderAngle > 180 && leftShoulderAngle <= 185,
      points: [landmarks[12], landmarks[11], landmarks[13]],
      targetThresholdDescription: '90° - 180°',
      targetMin: 90,
      targetMax: 180,
      confidence,
      deviation,
      deviationDirection: leftShoulderAngle < 90 ? '-' : leftShoulderAngle > 180 ? '+' : '+'
    });
  }
  
  if (landmarks[11] && landmarks[12] && landmarks[14] && 
      landmarks[11].visibility > 0.5 && landmarks[12].visibility > 0.5 && landmarks[14].visibility > 0.5) {
    const rightShoulderAngle = calculateAngle(
      landmarks[11], landmarks[12], landmarks[14]
    );
    
    const confidence = getConfidence([landmarks[11], landmarks[12], landmarks[14]]);
    const deviation = rightShoulderAngle < 90 ? 90 - rightShoulderAngle : 
                     rightShoulderAngle > 180 ? rightShoulderAngle - 180 : 0;
    
    angles.push({
      name: 'Right Shoulder',
      angle: rightShoulderAngle,
      normal: rightShoulderAngle >= 90 && rightShoulderAngle <= 180,
      warning: rightShoulderAngle >= 85 && rightShoulderAngle < 90 || rightShoulderAngle > 180 && rightShoulderAngle <= 185,
      points: [landmarks[11], landmarks[12], landmarks[14]],
      targetThresholdDescription: '90° - 180°',
      targetMin: 90,
      targetMax: 180,
      confidence,
      deviation,
      deviationDirection: rightShoulderAngle < 90 ? '-' : rightShoulderAngle > 180 ? '+' : '+'
    });
  }
  
  // Elbow angles
  if (landmarks[11] && landmarks[13] && landmarks[15] && 
      landmarks[11].visibility > 0.5 && landmarks[13].visibility > 0.5 && landmarks[15].visibility > 0.5) {
    const leftElbowAngle = calculateAngle(
      landmarks[11], landmarks[13], landmarks[15]
    );
    
    const confidence = getConfidence([landmarks[11], landmarks[13], landmarks[15]]);
    const deviation = leftElbowAngle < 90 ? 90 - leftElbowAngle : 
                     leftElbowAngle > 180 ? leftElbowAngle - 180 : 0;
    
    angles.push({
      name: 'Left Elbow',
      angle: leftElbowAngle,
      normal: leftElbowAngle >= 90 && leftElbowAngle <= 180,
      warning: leftElbowAngle >= 85 && leftElbowAngle < 90 || leftElbowAngle > 180 && leftElbowAngle <= 185,
      points: [landmarks[11], landmarks[13], landmarks[15]],
      targetThresholdDescription: '90° - 180°',
      targetMin: 90,
      targetMax: 180,
      confidence,
      deviation,
      deviationDirection: leftElbowAngle < 90 ? '-' : leftElbowAngle > 180 ? '+' : '+'
    });
  }

  if (landmarks[12] && landmarks[14] && landmarks[16] && 
      landmarks[12].visibility > 0.5 && landmarks[14].visibility > 0.5 && landmarks[16].visibility > 0.5) {
    const rightElbowAngle = calculateAngle(
      landmarks[12], landmarks[14], landmarks[16]
    );
    
    const confidence = getConfidence([landmarks[12], landmarks[14], landmarks[16]]);
    const deviation = rightElbowAngle < 90 ? 90 - rightElbowAngle : 
                     rightElbowAngle > 180 ? rightElbowAngle - 180 : 0;
    
    angles.push({
      name: 'Right Elbow',
      angle: rightElbowAngle,
      normal: rightElbowAngle >= 90 && rightElbowAngle <= 180,
      warning: rightElbowAngle >= 85 && rightElbowAngle < 90 || rightElbowAngle > 180 && rightElbowAngle <= 185,
      points: [landmarks[12], landmarks[14], landmarks[16]],
      targetThresholdDescription: '90° - 180°',
      targetMin: 90,
      targetMax: 180,
      confidence,
      deviation,
      deviationDirection: rightElbowAngle < 90 ? '-' : rightElbowAngle > 180 ? '+' : '+'
    });
  }
  
  // Hip angles
  if (landmarks[11] && landmarks[23] && landmarks[25] && 
      landmarks[11].visibility > 0.5 && landmarks[23].visibility > 0.5 && landmarks[25].visibility > 0.5) {
    const leftHipAngle = calculateAngle(
      landmarks[11], landmarks[23], landmarks[25]
    );
    
    const confidence = getConfidence([landmarks[11], landmarks[23], landmarks[25]]);
    const deviation = leftHipAngle < 90 ? 90 - leftHipAngle : 
                     leftHipAngle > 120 ? leftHipAngle - 120 : 0;
    
    angles.push({
      name: 'Left Hip',
      angle: leftHipAngle,
      normal: leftHipAngle >= 90 && leftHipAngle <= 120,
      warning: leftHipAngle >= 85 && leftHipAngle < 90 || leftHipAngle > 120 && leftHipAngle <= 125,
      points: [landmarks[11], landmarks[23], landmarks[25]],
      targetThresholdDescription: '90° - 120°',
      targetMin: 90,
      targetMax: 120,
      confidence,
      deviation,
      deviationDirection: leftHipAngle < 90 ? '-' : leftHipAngle > 120 ? '+' : '+'
    });
  }

  if (landmarks[12] && landmarks[24] && landmarks[26] && 
      landmarks[12].visibility > 0.5 && landmarks[24].visibility > 0.5 && landmarks[26].visibility > 0.5) {
    const rightHipAngle = calculateAngle(
      landmarks[12], landmarks[24], landmarks[26]
    );
    
    const confidence = getConfidence([landmarks[12], landmarks[24], landmarks[26]]);
    const deviation = rightHipAngle < 90 ? 90 - rightHipAngle : 
                     rightHipAngle > 120 ? rightHipAngle - 120 : 0;
    
    angles.push({
      name: 'Right Hip',
      angle: rightHipAngle,
      normal: rightHipAngle >= 90 && rightHipAngle <= 120,
      warning: rightHipAngle >= 85 && rightHipAngle < 90 || rightHipAngle > 120 && rightHipAngle <= 125,
      points: [landmarks[12], landmarks[24], landmarks[26]],
      targetThresholdDescription: '90° - 120°',
      targetMin: 90,
      targetMax: 120,
      confidence,
      deviation,
      deviationDirection: rightHipAngle < 90 ? '-' : rightHipAngle > 120 ? '+' : '+'
    });
  }
  
  // Knee angles with enhanced validation
  if (landmarks[23] && landmarks[25] && landmarks[27] && 
      landmarks[23].visibility > 0.5 && landmarks[25].visibility > 0.5 && landmarks[27].visibility > 0.5) {
    const leftKneeAngle = calculateAngle(
      landmarks[23], landmarks[25], landmarks[27]
    );
    
    const confidence = getConfidence([landmarks[23], landmarks[25], landmarks[27]]);
    const deviation = leftKneeAngle < 90 ? 90 - leftKneeAngle : 
                     leftKneeAngle > 130 ? leftKneeAngle - 130 : 0;
    
    angles.push({
      name: 'Left Knee',
      angle: leftKneeAngle,
      normal: leftKneeAngle >= 90 && leftKneeAngle <= 130,
      warning: leftKneeAngle >= 85 && leftKneeAngle < 90 || leftKneeAngle > 130 && leftKneeAngle <= 135,
      points: [landmarks[23], landmarks[25], landmarks[27]],
      targetThresholdDescription: '90° - 130°',
      targetMin: 90,
      targetMax: 130,
      confidence,
      deviation,
      deviationDirection: leftKneeAngle < 90 ? '-' : leftKneeAngle > 130 ? '+' : '+'
    });
  }
  
  if (landmarks[24] && landmarks[26] && landmarks[28] && 
      landmarks[24].visibility > 0.5 && landmarks[26].visibility > 0.5 && landmarks[28].visibility > 0.5) {
    const rightKneeAngle = calculateAngle(
      landmarks[24], landmarks[26], landmarks[28]
    );
    
    const confidence = getConfidence([landmarks[24], landmarks[26], landmarks[28]]);
    const deviation = rightKneeAngle < 90 ? 90 - rightKneeAngle : 
                     rightKneeAngle > 130 ? rightKneeAngle - 130 : 0;
    
    angles.push({
      name: 'Right Knee',
      angle: rightKneeAngle,
      normal: rightKneeAngle >= 90 && rightKneeAngle <= 130,
      warning: rightKneeAngle >= 85 && rightKneeAngle < 90 || rightKneeAngle > 130 && rightKneeAngle <= 135,
      points: [landmarks[24], landmarks[26], landmarks[28]],
      targetThresholdDescription: '90° - 130°',
      targetMin: 90,
      targetMax: 130,
      confidence,
      deviation,
      deviationDirection: rightKneeAngle < 90 ? '-' : rightKneeAngle > 130 ? '+' : '+'
    });
  }

  // Ankle angles
  if (landmarks[25] && landmarks[27] && landmarks[31] && 
      landmarks[25].visibility > 0.5 && landmarks[27].visibility > 0.5 && landmarks[31].visibility > 0.5) {
    const leftAnkleAngle = calculateAngle(
      landmarks[25], landmarks[27], landmarks[31]
    );
    
    const confidence = getConfidence([landmarks[25], landmarks[27], landmarks[31]]);
    const deviation = leftAnkleAngle < 85 ? 85 - leftAnkleAngle : 
                     leftAnkleAngle > 95 ? leftAnkleAngle - 95 : 0;
    
    angles.push({
      name: 'Left Ankle',
      angle: leftAnkleAngle,
      normal: leftAnkleAngle >= 85 && leftAnkleAngle <= 95,
      warning: leftAnkleAngle >= 80 && leftAnkleAngle < 85 || leftAnkleAngle > 95 && leftAnkleAngle <= 100,
      points: [landmarks[25], landmarks[27], landmarks[31]],
      targetThresholdDescription: '85° - 95°',
      targetMin: 85,
      targetMax: 95,
      confidence,
      deviation,
      deviationDirection: leftAnkleAngle < 85 ? '-' : leftAnkleAngle > 95 ? '+' : '+'
    });
  }

  if (landmarks[26] && landmarks[28] && landmarks[32] && 
      landmarks[26].visibility > 0.5 && landmarks[28].visibility > 0.5 && landmarks[32].visibility > 0.5) {
    const rightAnkleAngle = calculateAngle(
      landmarks[26], landmarks[28], landmarks[32]
    );
    
    const confidence = getConfidence([landmarks[26], landmarks[28], landmarks[32]]);
    const deviation = rightAnkleAngle < 85 ? 85 - rightAnkleAngle : 
                     rightAnkleAngle > 95 ? rightAnkleAngle - 95 : 0;
    
    angles.push({
      name: 'Right Ankle',
      angle: rightAnkleAngle,
      normal: rightAnkleAngle >= 85 && rightAnkleAngle <= 95,
      warning: rightAnkleAngle >= 80 && rightAnkleAngle < 85 || rightAnkleAngle > 95 && rightAnkleAngle <= 100,
      points: [landmarks[26], landmarks[28], landmarks[32]],
      targetThresholdDescription: '85° - 95°',
      targetMin: 85,
      targetMax: 95,
      confidence,
      deviation,
      deviationDirection: rightAnkleAngle < 85 ? '-' : rightAnkleAngle > 95 ? '+' : '+'
    });
  }

  // Torso alignment
  if (landmarks[11] && landmarks[23] && landmarks[24] && 
      landmarks[11].visibility > 0.5 && landmarks[23].visibility > 0.5 && landmarks[24].visibility > 0.5) {
    const torsoAngle = calculateAngle(
      landmarks[11], landmarks[23], landmarks[24]
    );
    
    const confidence = getConfidence([landmarks[11], landmarks[23], landmarks[24]]);
    const deviation = torsoAngle < 85 ? 85 - torsoAngle : 
                     torsoAngle > 95 ? torsoAngle - 95 : 0;
    
    angles.push({
      name: 'Torso Alignment',
      angle: torsoAngle,
      normal: torsoAngle >= 85 && torsoAngle <= 95,
      warning: torsoAngle >= 80 && torsoAngle < 85 || torsoAngle > 95 && torsoAngle <= 100,
      points: [landmarks[11], landmarks[23], landmarks[24]],
      targetThresholdDescription: '85° - 95°',
      targetMin: 85,
      targetMax: 95,
      confidence,
      deviation,
      deviationDirection: torsoAngle < 85 ? '-' : torsoAngle > 95 ? '+' : '+'
    });
  }
  
  const processingTime = performance.now() - startTime;
  updatePerformanceMetrics({ processingTime });
  
  return angles;
}

export function getDetailedMetricResults(testId: string, landmarks: PoseKeypoint[]): AssessmentMetricResult[] {
  const test = FMS_TESTS.find(t => t.id === testId);
  if (!test || !test.metrics) return [];

  const startTime = performance.now();
  const results: AssessmentMetricResult[] = [];
  const jointAngles = calculateAllJointAngles(landmarks);

  test.metrics.forEach(metric => {
    let actualValue = 0;
    let pass = false;
    let warning = false;
    let confidence = 0;

    // Calculate actual values based on metric type with enhanced validation
    switch (metric.id) {
      case 'knee-valgus-left':
        const leftKneeAngle = jointAngles.find(a => a.name === 'Left Knee');
        actualValue = leftKneeAngle ? Math.abs(leftKneeAngle.angle - 90) : 0;
        confidence = leftKneeAngle?.confidence || 0;
        break;
      
      case 'knee-valgus-right':
        const rightKneeAngle = jointAngles.find(a => a.name === 'Right Knee');
        actualValue = rightKneeAngle ? Math.abs(rightKneeAngle.angle - 90) : 0;
        confidence = rightKneeAngle?.confidence || 0;
        break;
      
      case 'knee-flexion-depth':
        const leftKnee = jointAngles.find(a => a.name === 'Left Knee');
        const rightKnee = jointAngles.find(a => a.name === 'Right Knee');
        actualValue = Math.min(leftKnee?.angle || 0, rightKnee?.angle || 0);
        confidence = Math.min(leftKnee?.confidence || 0, rightKnee?.confidence || 0);
        break;
      
      case 'trunk-lean':
        const torsoAlignment = jointAngles.find(a => a.name === 'Torso Alignment');
        actualValue = torsoAlignment ? Math.abs(torsoAlignment.angle - 90) : 0;
        confidence = torsoAlignment?.confidence || 0;
        break;
      
      case 'lr-hip-symmetry':
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];
        if (leftHip && rightHip) {
          actualValue = Math.abs(leftHip.y - rightHip.y) * 100; // Convert to cm approximation
          confidence = Math.min(leftHip.visibility || 0, rightHip.visibility || 0) * 100;
        }
        break;
      
      case 'pelvic-rotation':
        // Enhanced calculation for pelvic rotation
        if (landmarks[23] && landmarks[24]) {
          const hipVector = {
            x: landmarks[24].x - landmarks[23].x,
            y: landmarks[24].y - landmarks[23].y
          };
          actualValue = Math.abs(Math.atan2(hipVector.y, hipVector.x) * 180 / Math.PI);
          confidence = Math.min(landmarks[23].visibility || 0, landmarks[24].visibility || 0) * 100;
        }
        break;
      
      case 'front-knee-flexion':
        const frontKnee = jointAngles.find(a => a.name === 'Left Knee') || 
                          jointAngles.find(a => a.name === 'Right Knee');
        actualValue = frontKnee?.angle || 0;
        confidence = frontKnee?.confidence || 0;
        break;
      
      case 'pelvic-tilt':
        // Calculate pelvic tilt using hip and shoulder landmarks
        if (landmarks[11] && landmarks[12] && landmarks[23] && landmarks[24]) {
          const shoulderMidpoint = {
            x: (landmarks[11].x + landmarks[12].x) / 2,
            y: (landmarks[11].y + landmarks[12].y) / 2
          };
          const hipMidpoint = {
            x: (landmarks[23].x + landmarks[24].x) / 2,
            y: (landmarks[23].y + landmarks[24].y) / 2
          };
          const tiltAngle = Math.atan2(
            shoulderMidpoint.y - hipMidpoint.y,
            shoulderMidpoint.x - hipMidpoint.x
          ) * 180 / Math.PI;
          actualValue = Math.abs(tiltAngle - 90);
          confidence = Math.min(
            landmarks[11].visibility || 0,
            landmarks[12].visibility || 0,
            landmarks[23].visibility || 0,
            landmarks[24].visibility || 0
          ) * 100;
        }
        break;
      
      case 'trail-leg-hip-flexion':
        const hipAngle = jointAngles.find(a => a.name === 'Left Hip') || 
                        jointAngles.find(a => a.name === 'Right Hip');
        actualValue = hipAngle?.angle || 0;
        confidence = hipAngle?.confidence || 0;
        break;
      
      default:
        actualValue = 0;
        confidence = 0;
    }

    // Enhanced pass/fail logic with warning states
    if (metric.targetMin !== undefined && metric.targetMax !== undefined) {
      pass = actualValue >= metric.targetMin && actualValue <= metric.targetMax;
      if (metric.validationCriteria.warningThreshold) {
        warning = !pass && actualValue >= (metric.targetMin - metric.validationCriteria.tolerance) && 
                 actualValue <= (metric.targetMax + metric.validationCriteria.tolerance);
      }
    } else if (metric.targetMin !== undefined) {
      pass = actualValue >= metric.targetMin;
      if (metric.validationCriteria.warningThreshold) {
        warning = !pass && actualValue >= (metric.targetMin - metric.validationCriteria.tolerance);
      }
    } else if (metric.targetMax !== undefined) {
      pass = actualValue <= metric.targetMax;
      if (metric.validationCriteria.warningThreshold) {
        warning = !pass && actualValue <= (metric.targetMax + metric.validationCriteria.tolerance);
      }
    } else if (metric.targetExact !== undefined) {
      pass = Math.abs(actualValue - metric.targetExact) <= metric.validationCriteria.tolerance;
      warning = !pass && Math.abs(actualValue - metric.targetExact) <= (metric.validationCriteria.tolerance * 2);
    }

    const deviation = metric.targetExact !== undefined ? 
      Math.abs(actualValue - metric.targetExact) :
      metric.targetMin !== undefined && actualValue < metric.targetMin ?
        metric.targetMin - actualValue :
      metric.targetMax !== undefined && actualValue > metric.targetMax ?
        actualValue - metric.targetMax : 0;

    const deviationDirection: '+' | '-' = 
      metric.targetExact !== undefined ? 
        (actualValue > metric.targetExact ? '+' : '-') :
      metric.targetMin !== undefined && actualValue < metric.targetMin ? '-' :
      metric.targetMax !== undefined && actualValue > metric.targetMax ? '+' : '+';

    results.push({
      metricId: metric.id,
      name: metric.name,
      targetDescription: metric.targetDescription,
      actualValue: Math.round(actualValue * 10) / 10,
      unit: metric.unit,
      pass,
      warning,
      isCritical: metric.isCritical,
      category: metric.category,
      deviation: Math.round(deviation * 10) / 10,
      deviationDirection,
      confidence: Math.round(confidence),
      timestamp: Date.now()
    });
  });

  const processingTime = performance.now() - startTime;
  updatePerformanceMetrics({ processingTime, latency: processingTime });

  return results;
}

export function generateAutomaticScore(
  testId: string,
  metricResults: AssessmentMetricResult[]
): number {
  if (metricResults.length === 0) return 0;

  const criticalMetrics = metricResults.filter(m => m.isCritical);
  const nonCriticalMetrics = metricResults.filter(m => !m.isCritical);
  
  const criticalPassed = criticalMetrics.filter(m => m.pass).length;
  const nonCriticalPassed = nonCriticalMetrics.filter(m => m.pass).length;
  const criticalFailed = criticalMetrics.length - criticalPassed;
  const nonCriticalFailed = nonCriticalMetrics.length - nonCriticalPassed;
  
  // Enhanced scoring logic following Cook & Burton's criteria
  // All critical metrics pass + most non-critical pass = 3
  if (criticalFailed === 0 && nonCriticalFailed <= 1) {
    return 3;
  }
  // 1 critical fail OR ≤2 non-critical fails = 2
  else if (criticalFailed === 1 || (criticalFailed === 0 && nonCriticalFailed <= 2)) {
    return 2;
  }
  // ≥2 critical fails OR >2 non-critical fails = 1
  else if (criticalFailed >= 2 || nonCriticalFailed > 2) {
    return 1;
  }
  // Default to 0 for severe issues
  else {
    return 0;
  }
}

export function validateClinicalStandards(
  testId: string,
  metricResults: AssessmentMetricResult[]
): boolean {
  const test = FMS_TESTS.find(t => t.id === testId);
  if (!test) return false;

  // Check if all metrics meet clinical validation criteria
  const validationPassed = metricResults.every(result => {
    const metric = test.metrics.find(m => m.id === result.metricId);
    if (!metric) return false;

    // Validate confidence levels (should be >70% for clinical use)
    if (result.confidence < 70) return false;

    // Validate measurement tolerance (±5° for goniometer comparison)
    if (result.deviation && result.deviation > metric.validationCriteria.tolerance) {
      return false;
    }

    return true;
  });

  return validationPassed;
}

// Keep backward compatibility
export function analyzeSquatPose(landmarks: PoseKeypoint[]): JointAngle[] {
  return calculateAllJointAngles(landmarks);
}
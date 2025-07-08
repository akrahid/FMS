import { Vector3D } from './pose3dProcessor';

export interface BiomechanicalMetric {
  name: string;
  value: number;
  unit: string;
  normal: boolean;
  warning?: boolean;
  confidence: number;
  clinicalSignificance: string;
}

export interface JointAngle3D {
  name: string;
  angle: number;
  plane: 'sagittal' | 'frontal' | 'transverse';
  normal: boolean;
  warning?: boolean;
  confidence: number;
  targetRange: { min: number; max: number };
  clinicalInterpretation: string;
}

export class BiomechanicsCalculator {
  
  /**
   * Calculate 3D joint angle using three points
   */
  static calculateJointAngle3D(
    proximal: Vector3D,
    joint: Vector3D,
    distal: Vector3D,
    plane: 'sagittal' | 'frontal' | 'transverse' = 'sagittal'
  ): number {
    // Create vectors from joint to proximal and distal points
    const vector1 = {
      x: proximal.x - joint.x,
      y: proximal.y - joint.y,
      z: proximal.z - joint.z
    };

    const vector2 = {
      x: distal.x - joint.x,
      y: distal.y - joint.y,
      z: distal.z - joint.z
    };

    // Project vectors onto specified plane
    let projectedVector1: Vector3D;
    let projectedVector2: Vector3D;

    switch (plane) {
      case 'sagittal': // Y-Z plane (side view)
        projectedVector1 = { x: 0, y: vector1.y, z: vector1.z };
        projectedVector2 = { x: 0, y: vector2.y, z: vector2.z };
        break;
      case 'frontal': // X-Y plane (front view)
        projectedVector1 = { x: vector1.x, y: vector1.y, z: 0 };
        projectedVector2 = { x: vector2.x, y: vector2.y, z: 0 };
        break;
      case 'transverse': // X-Z plane (top view)
        projectedVector1 = { x: vector1.x, y: 0, z: vector1.z };
        projectedVector2 = { x: vector2.x, y: 0, z: vector2.z };
        break;
    }

    // Calculate angle between projected vectors
    const dot = projectedVector1.x * projectedVector2.x + 
                projectedVector1.y * projectedVector2.y + 
                projectedVector1.z * projectedVector2.z;

    const mag1 = Math.sqrt(
      projectedVector1.x ** 2 + projectedVector1.y ** 2 + projectedVector1.z ** 2
    );
    const mag2 = Math.sqrt(
      projectedVector2.x ** 2 + projectedVector2.y ** 2 + projectedVector2.z ** 2
    );

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;

    return angle;
  }

  /**
   * Calculate knee valgus angle with enhanced 3D analysis
   */
  static calculateKneeValgus3D(
    hip: Vector3D,
    knee: Vector3D,
    ankle: Vector3D,
    foot: Vector3D
  ): BiomechanicalMetric {
    // Calculate the frontal plane projection angle
    const frontalAngle = this.calculateJointAngle3D(hip, knee, ankle, 'frontal');
    
    // Calculate patella displacement relative to foot progression
    const patellaDisplacement = this.calculatePatellaDisplacement(knee, ankle, foot);
    
    // Combine angle and displacement for comprehensive valgus assessment
    const valgusAngle = Math.abs(180 - frontalAngle);
    const displacementFactor = Math.min(patellaDisplacement / 50, 1); // Normalize to 0-1
    
    const combinedValgus = valgusAngle + (displacementFactor * 10);
    
    // Clinical thresholds based on research
    const normal = combinedValgus <= 15;
    const warning = combinedValgus > 15 && combinedValgus <= 20;
    
    return {
      name: 'Knee Valgus (3D)',
      value: Math.round(combinedValgus * 10) / 10,
      unit: '°',
      normal,
      warning,
      confidence: this.calculateConfidence([hip, knee, ankle, foot]),
      clinicalSignificance: normal ? 'Low ACL injury risk' : 
                           warning ? 'Moderate ACL injury risk' : 
                           'High ACL injury risk - intervention recommended'
    };
  }

  /**
   * Calculate patella displacement from foot progression line
   */
  static calculatePatellaDisplacement(
    knee: Vector3D,
    ankle: Vector3D,
    foot: Vector3D
  ): number {
    // Create foot progression vector
    const footVector = {
      x: foot.x - ankle.x,
      y: foot.y - ankle.y,
      z: foot.z - ankle.z
    };

    // Normalize foot vector
    const footMagnitude = Math.sqrt(
      footVector.x ** 2 + footVector.y ** 2 + footVector.z ** 2
    );
    
    if (footMagnitude === 0) return 0;

    const normalizedFoot = {
      x: footVector.x / footMagnitude,
      y: footVector.y / footMagnitude,
      z: footVector.z / footMagnitude
    };

    // Project knee position onto foot progression line
    const ankleToKnee = {
      x: knee.x - ankle.x,
      y: knee.y - ankle.y,
      z: knee.z - ankle.z
    };

    const projection = ankleToKnee.x * normalizedFoot.x + 
                      ankleToKnee.y * normalizedFoot.y + 
                      ankleToKnee.z * normalizedFoot.z;

    const projectedPoint = {
      x: ankle.x + projection * normalizedFoot.x,
      y: ankle.y + projection * normalizedFoot.y,
      z: ankle.z + projection * normalizedFoot.z
    };

    // Calculate lateral displacement (primarily in X direction)
    const displacement = Math.sqrt(
      (knee.x - projectedPoint.x) ** 2 + 
      (knee.z - projectedPoint.z) ** 2
    );

    return displacement * 1000; // Convert to mm
  }

  /**
   * Calculate 3D trunk lean with multi-planar analysis
   */
  static calculateTrunkLean3D(
    leftShoulder: Vector3D,
    rightShoulder: Vector3D,
    leftHip: Vector3D,
    rightHip: Vector3D
  ): { sagittal: BiomechanicalMetric; frontal: BiomechanicalMetric } {
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2
    };

    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2
    };

    // Calculate trunk vector
    const trunkVector = {
      x: shoulderMidpoint.x - hipMidpoint.x,
      y: shoulderMidpoint.y - hipMidpoint.y,
      z: shoulderMidpoint.z - hipMidpoint.z
    };

    // Sagittal plane lean (forward/backward)
    const sagittalAngle = Math.atan2(Math.abs(trunkVector.z), trunkVector.y) * 180 / Math.PI;
    
    // Frontal plane lean (left/right)
    const frontalAngle = Math.atan2(Math.abs(trunkVector.x), trunkVector.y) * 180 / Math.PI;

    const confidence = this.calculateConfidence([leftShoulder, rightShoulder, leftHip, rightHip]);

    return {
      sagittal: {
        name: 'Trunk Lean (Sagittal)',
        value: Math.round(sagittalAngle * 10) / 10,
        unit: '°',
        normal: sagittalAngle <= 15,
        warning: sagittalAngle > 15 && sagittalAngle <= 20,
        confidence,
        clinicalSignificance: sagittalAngle <= 15 ? 'Normal trunk control' : 
                             'Compensatory trunk lean - core stability needed'
      },
      frontal: {
        name: 'Trunk Lean (Frontal)',
        value: Math.round(frontalAngle * 10) / 10,
        unit: '°',
        normal: frontalAngle <= 10,
        warning: frontalAngle > 10 && frontalAngle <= 15,
        confidence,
        clinicalSignificance: frontalAngle <= 10 ? 'Normal lateral stability' : 
                             'Lateral trunk compensation - hip stability needed'
      }
    };
  }

  /**
   * Calculate hip flexion angle in 3D
   */
  static calculateHipFlexion3D(
    trunk: Vector3D,
    hip: Vector3D,
    knee: Vector3D
  ): BiomechanicalMetric {
    const angle = this.calculateJointAngle3D(trunk, hip, knee, 'sagittal');
    const flexionAngle = 180 - angle; // Convert to flexion angle
    
    return {
      name: 'Hip Flexion',
      value: Math.round(flexionAngle * 10) / 10,
      unit: '°',
      normal: flexionAngle >= 60 && flexionAngle <= 120,
      warning: flexionAngle >= 45 && flexionAngle < 60,
      confidence: this.calculateConfidence([trunk, hip, knee]),
      clinicalSignificance: flexionAngle >= 60 ? 'Adequate hip mobility' : 
                           'Limited hip flexion - mobility intervention needed'
    };
  }

  /**
   * Calculate ankle dorsiflexion in 3D
   */
  static calculateAnkleDorsiflexion3D(
    knee: Vector3D,
    ankle: Vector3D,
    foot: Vector3D
  ): BiomechanicalMetric {
    const angle = this.calculateJointAngle3D(knee, ankle, foot, 'sagittal');
    const dorsiflexionAngle = angle - 90; // Relative to 90° neutral
    
    return {
      name: 'Ankle Dorsiflexion',
      value: Math.round(dorsiflexionAngle * 10) / 10,
      unit: '°',
      normal: dorsiflexionAngle >= 10 && dorsiflexionAngle <= 30,
      warning: dorsiflexionAngle >= 5 && dorsiflexionAngle < 10,
      confidence: this.calculateConfidence([knee, ankle, foot]),
      clinicalSignificance: dorsiflexionAngle >= 10 ? 'Adequate ankle mobility' : 
                           'Limited dorsiflexion - ankle mobility needed'
    };
  }

  /**
   * Calculate bilateral symmetry index
   */
  static calculateBilateralSymmetry(
    leftMetric: number,
    rightMetric: number
  ): BiomechanicalMetric {
    const asymmetry = Math.abs(leftMetric - rightMetric);
    const symmetryIndex = (asymmetry / Math.max(leftMetric, rightMetric)) * 100;
    
    return {
      name: 'Bilateral Symmetry',
      value: Math.round(symmetryIndex * 10) / 10,
      unit: '%',
      normal: symmetryIndex <= 10,
      warning: symmetryIndex > 10 && symmetryIndex <= 15,
      confidence: 95, // High confidence for calculated metric
      clinicalSignificance: symmetryIndex <= 10 ? 'Symmetric movement pattern' : 
                           'Asymmetric pattern - unilateral intervention needed'
    };
  }

  /**
   * Calculate center of mass displacement
   */
  static calculateCOMDisplacement(
    landmarks: Vector3D[],
    referenceFrame: Vector3D[]
  ): BiomechanicalMetric {
    const currentCOM = this.calculateCenterOfMass(landmarks);
    const referenceCOM = this.calculateCenterOfMass(referenceFrame);
    
    const displacement = Math.sqrt(
      (currentCOM.x - referenceCOM.x) ** 2 +
      (currentCOM.y - referenceCOM.y) ** 2 +
      (currentCOM.z - referenceCOM.z) ** 2
    );
    
    return {
      name: 'COM Displacement',
      value: Math.round(displacement * 1000 * 10) / 10, // Convert to mm
      unit: 'mm',
      normal: displacement * 1000 <= 50,
      warning: displacement * 1000 > 50 && displacement * 1000 <= 100,
      confidence: this.calculateConfidence(landmarks),
      clinicalSignificance: displacement * 1000 <= 50 ? 'Good postural control' : 
                           'Excessive COM movement - balance training needed'
    };
  }

  /**
   * Calculate comprehensive joint angles for a pose
   */
  static calculateAllJointAngles3D(landmarks: Vector3D[]): JointAngle3D[] {
    const angles: JointAngle3D[] = [];
    
    // Landmark indices
    const LANDMARKS = {
      LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
      LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
      LEFT_HIP: 23, RIGHT_HIP: 24,
      LEFT_KNEE: 25, RIGHT_KNEE: 26,
      LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
      LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32
    };

    // Hip angles
    if (this.hasValidLandmarks(landmarks, [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE])) {
      const angle = this.calculateJointAngle3D(
        landmarks[LANDMARKS.LEFT_SHOULDER],
        landmarks[LANDMARKS.LEFT_HIP],
        landmarks[LANDMARKS.LEFT_KNEE],
        'sagittal'
      );
      
      angles.push({
        name: 'Left Hip Flexion',
        angle: Math.round((180 - angle) * 10) / 10,
        plane: 'sagittal',
        normal: angle >= 60 && angle <= 120,
        warning: angle >= 45 && angle < 60,
        confidence: this.calculateConfidence([
          landmarks[LANDMARKS.LEFT_SHOULDER],
          landmarks[LANDMARKS.LEFT_HIP],
          landmarks[LANDMARKS.LEFT_KNEE]
        ]),
        targetRange: { min: 60, max: 120 },
        clinicalInterpretation: 'Hip flexion during functional movement'
      });
    }

    // Knee angles
    if (this.hasValidLandmarks(landmarks, [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE])) {
      const angle = this.calculateJointAngle3D(
        landmarks[LANDMARKS.LEFT_HIP],
        landmarks[LANDMARKS.LEFT_KNEE],
        landmarks[LANDMARKS.LEFT_ANKLE],
        'sagittal'
      );
      
      angles.push({
        name: 'Left Knee Flexion',
        angle: Math.round((180 - angle) * 10) / 10,
        plane: 'sagittal',
        normal: angle >= 90 && angle <= 130,
        warning: angle >= 75 && angle < 90,
        confidence: this.calculateConfidence([
          landmarks[LANDMARKS.LEFT_HIP],
          landmarks[LANDMARKS.LEFT_KNEE],
          landmarks[LANDMARKS.LEFT_ANKLE]
        ]),
        targetRange: { min: 90, max: 130 },
        clinicalInterpretation: 'Knee flexion for shock absorption'
      });
    }

    // Add more joint angles as needed...

    return angles;
  }

  /**
   * Calculate center of mass from landmarks
   */
  private static calculateCenterOfMass(landmarks: Vector3D[]): Vector3D {
    // Use hip landmarks as approximation of COM
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) {
      return { x: 0, y: 0, z: 0 };
    }
    
    return {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2
    };
  }

  /**
   * Calculate confidence based on landmark quality
   */
  private static calculateConfidence(landmarks: Vector3D[]): number {
    // For 3D landmarks, confidence is based on triangulation quality
    // This is a simplified version - in production, use actual triangulation metrics
    const validLandmarks = landmarks.filter(lm => 
      lm && !isNaN(lm.x) && !isNaN(lm.y) && !isNaN(lm.z)
    );
    
    const confidence = (validLandmarks.length / landmarks.length) * 100;
    return Math.round(confidence);
  }

  /**
   * Check if landmarks are valid for calculation
   */
  private static hasValidLandmarks(landmarks: Vector3D[], indices: number[]): boolean {
    return indices.every(index => {
      const lm = landmarks[index];
      return lm && !isNaN(lm.x) && !isNaN(lm.y) && !isNaN(lm.z);
    });
  }

  /**
   * Validate anatomical constraints
   */
  static validateAnatomicalConstraints(landmarks: Vector3D[]): boolean {
    // Check for reasonable limb lengths and joint ranges
    const LANDMARKS = {
      LEFT_HIP: 23, LEFT_KNEE: 25, LEFT_ANKLE: 27,
      RIGHT_HIP: 24, RIGHT_KNEE: 26, RIGHT_ANKLE: 28
    };

    // Check left leg proportions
    if (this.hasValidLandmarks(landmarks, [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE])) {
      const thighLength = this.distance3D(landmarks[LANDMARKS.LEFT_HIP], landmarks[LANDMARKS.LEFT_KNEE]);
      const shankLength = this.distance3D(landmarks[LANDMARKS.LEFT_KNEE], landmarks[LANDMARKS.LEFT_ANKLE]);
      
      const ratio = thighLength / shankLength;
      if (ratio < 0.8 || ratio > 1.4) return false; // Unrealistic proportions
    }

    return true;
  }

  /**
   * Calculate 3D distance between two points
   */
  private static distance3D(p1: Vector3D, p2: Vector3D): number {
    return Math.sqrt(
      (p1.x - p2.x) ** 2 + 
      (p1.y - p2.y) ** 2 + 
      (p1.z - p2.z) ** 2
    );
  }
}
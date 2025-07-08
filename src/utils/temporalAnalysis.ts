import { Vector3D, Pose3DLandmarks } from './pose3dProcessor';

export interface LandingPhase {
  startFrame: number;
  endFrame: number;
  impactFrame: number;
  duration: number;
  maxVelocity: number;
}

export interface DropJumpTrial {
  id: number;
  landingPhase: LandingPhase;
  metrics: DropJumpMetrics;
  confidence: number;
  timestamp: number;
}

export interface DropJumpMetrics {
  maxKneeValgus: {
    left: number;
    right: number;
    asymmetry: number;
  };
  trunkLean: {
    sagittal: number;
    frontal: number;
  };
  landingSymmetry: {
    forceDistribution: number;
    timeToStabilization: number;
  };
  armPosition: {
    shoulderAbduction: number;
    elbowFlexion: number;
    valid: boolean;
  };
  instabilityIndex: number;
  overallRisk: 'low' | 'moderate' | 'high';
}

export class DropJumpAnalyzer {
  private frameBuffer: Pose3DLandmarks[] = [];
  private trials: DropJumpTrial[] = [];
  private isAnalyzing = false;
  private frameRate = 90; // fps
  private bufferSize = 450; // 5 seconds at 90fps

  // Landmark indices for MediaPipe Pose
  private readonly LANDMARKS = {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_FOOT_INDEX: 31,
    RIGHT_FOOT_INDEX: 32
  };

  startAnalysis(): void {
    this.isAnalyzing = true;
    this.frameBuffer = [];
    this.trials = [];
    console.log('Drop Jump analysis started');
  }

  stopAnalysis(): DropJumpTrial[] {
    this.isAnalyzing = false;
    console.log(`Drop Jump analysis completed. ${this.trials.length} trials detected.`);
    return this.trials;
  }

  processFrame(pose3D: Pose3DLandmarks): void {
    if (!this.isAnalyzing) return;

    // Add to buffer
    this.frameBuffer.push(pose3D);
    
    // Maintain buffer size
    if (this.frameBuffer.length > this.bufferSize) {
      this.frameBuffer.shift();
    }

    // Analyze for landing events every 10 frames (reduce computational load)
    if (this.frameBuffer.length % 10 === 0) {
      this.detectLandingEvents();
    }
  }

  private detectLandingEvents(): void {
    if (this.frameBuffer.length < 90) return; // Need at least 1 second of data

    const recentFrames = this.frameBuffer.slice(-90); // Last 1 second
    const landingPhases = this.identifyLandingPhases(recentFrames);

    for (const phase of landingPhases) {
      if (this.isValidLanding(phase)) {
        const trial = this.analyzeTrial(phase);
        if (trial) {
          this.trials.push(trial);
          console.log(`Trial ${trial.id} detected: ${trial.metrics.overallRisk} risk`);
        }
      }
    }
  }

  private identifyLandingPhases(frames: Pose3DLandmarks[]): LandingPhase[] {
    const phases: LandingPhase[] = [];
    const velocities = this.calculateVerticalVelocities(frames);
    
    let inLanding = false;
    let startFrame = 0;
    let maxVelocity = 0;
    let impactFrame = 0;

    for (let i = 1; i < velocities.length; i++) {
      const velocity = velocities[i];
      
      if (!inLanding && velocity < -0.8) { // Threshold for landing detection
        inLanding = true;
        startFrame = i;
        maxVelocity = velocity;
        impactFrame = i;
      } else if (inLanding) {
        if (velocity < maxVelocity) {
          maxVelocity = velocity;
          impactFrame = i;
        }
        
        // End of landing phase when velocity stabilizes
        if (velocity > -0.2 && i - startFrame > 15) { // Minimum 15 frames
          phases.push({
            startFrame,
            endFrame: i,
            impactFrame,
            duration: (i - startFrame) / this.frameRate * 1000, // ms
            maxVelocity
          });
          inLanding = false;
        }
      }
    }

    return phases;
  }

  private calculateVerticalVelocities(frames: Pose3DLandmarks[]): number[] {
    const velocities: number[] = [0]; // First frame has no velocity
    
    for (let i = 1; i < frames.length; i++) {
      const prevFrame = frames[i - 1];
      const currFrame = frames[i];
      
      // Calculate center of mass velocity (average of hip landmarks)
      const prevCOM = this.calculateCenterOfMass(prevFrame.landmarks);
      const currCOM = this.calculateCenterOfMass(currFrame.landmarks);
      
      const deltaTime = (currFrame.timestamp - prevFrame.timestamp) / 1000; // Convert to seconds
      const velocity = deltaTime > 0 ? (currCOM.y - prevCOM.y) / deltaTime : 0;
      
      velocities.push(velocity);
    }
    
    return velocities;
  }

  private calculateCenterOfMass(landmarks: Vector3D[]): Vector3D {
    const leftHip = landmarks[this.LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[this.LANDMARKS.RIGHT_HIP];
    
    return {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2
    };
  }

  private isValidLanding(phase: LandingPhase): boolean {
    // Validate landing phase criteria
    return phase.duration >= 100 && // At least 100ms
           phase.duration <= 500 && // No more than 500ms
           Math.abs(phase.maxVelocity) > 0.5; // Significant velocity change
  }

  private analyzeTrial(phase: LandingPhase): DropJumpTrial | null {
    const relevantFrames = this.frameBuffer.slice(
      Math.max(0, this.frameBuffer.length - 90 + phase.startFrame),
      Math.max(0, this.frameBuffer.length - 90 + phase.endFrame)
    );

    if (relevantFrames.length === 0) return null;

    const metrics = this.calculateTrialMetrics(relevantFrames, phase.impactFrame - phase.startFrame);
    const confidence = this.calculateTrialConfidence(relevantFrames);

    return {
      id: this.trials.length + 1,
      landingPhase: phase,
      metrics,
      confidence,
      timestamp: Date.now()
    };
  }

  private calculateTrialMetrics(frames: Pose3DLandmarks[], impactIndex: number): DropJumpMetrics {
    const impactFrame = frames[Math.min(impactIndex, frames.length - 1)];
    const landmarks = impactFrame.landmarks;

    // Calculate knee valgus angles
    const leftKneeValgus = this.calculateKneeValgus(
      landmarks[this.LANDMARKS.LEFT_HIP],
      landmarks[this.LANDMARKS.LEFT_KNEE],
      landmarks[this.LANDMARKS.LEFT_ANKLE]
    );

    const rightKneeValgus = this.calculateKneeValgus(
      landmarks[this.LANDMARKS.RIGHT_HIP],
      landmarks[this.LANDMARKS.RIGHT_KNEE],
      landmarks[this.LANDMARKS.RIGHT_ANKLE]
    );

    // Calculate trunk lean
    const trunkLean = this.calculateTrunkLean(
      landmarks[this.LANDMARKS.LEFT_SHOULDER],
      landmarks[this.LANDMARKS.RIGHT_SHOULDER],
      landmarks[this.LANDMARKS.LEFT_HIP],
      landmarks[this.LANDMARKS.RIGHT_HIP]
    );

    // Calculate arm position
    const armPosition = this.calculateArmPosition(
      landmarks[this.LANDMARKS.LEFT_SHOULDER],
      landmarks[this.LANDMARKS.RIGHT_SHOULDER],
      landmarks[this.LANDMARKS.LEFT_ELBOW],
      landmarks[this.LANDMARKS.RIGHT_ELBOW]
    );

    // Calculate landing symmetry
    const landingSymmetry = this.calculateLandingSymmetry(frames);

    // Calculate instability index
    const instabilityIndex = this.calculateInstabilityIndex(frames);

    // Determine overall risk
    const overallRisk = this.assessOverallRisk({
      maxKneeValgus: { left: leftKneeValgus, right: rightKneeValgus, asymmetry: Math.abs(leftKneeValgus - rightKneeValgus) },
      trunkLean,
      armPosition,
      instabilityIndex
    });

    return {
      maxKneeValgus: {
        left: leftKneeValgus,
        right: rightKneeValgus,
        asymmetry: Math.abs(leftKneeValgus - rightKneeValgus)
      },
      trunkLean,
      landingSymmetry,
      armPosition,
      instabilityIndex,
      overallRisk
    };
  }

  private calculateKneeValgus(hip: Vector3D, knee: Vector3D, ankle: Vector3D): number {
    // Calculate 3D knee valgus angle in frontal plane
    const thighVector = {
      x: knee.x - hip.x,
      y: knee.y - hip.y,
      z: knee.z - hip.z
    };

    const shankVector = {
      x: ankle.x - knee.x,
      y: ankle.y - knee.y,
      z: ankle.z - knee.z
    };

    // Project vectors onto frontal plane (x-y plane)
    const thighFrontal = { x: thighVector.x, y: thighVector.y, z: 0 };
    const shankFrontal = { x: shankVector.x, y: shankVector.y, z: 0 };

    // Calculate angle between projected vectors
    const dot = thighFrontal.x * shankFrontal.x + thighFrontal.y * shankFrontal.y;
    const magThigh = Math.sqrt(thighFrontal.x ** 2 + thighFrontal.y ** 2);
    const magShank = Math.sqrt(shankFrontal.x ** 2 + shankFrontal.y ** 2);

    if (magThigh === 0 || magShank === 0) return 0;

    const cosAngle = dot / (magThigh * magShank);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;

    // Return valgus angle (deviation from 180°)
    return Math.abs(180 - angle);
  }

  private calculateTrunkLean(
    leftShoulder: Vector3D,
    rightShoulder: Vector3D,
    leftHip: Vector3D,
    rightHip: Vector3D
  ): { sagittal: number; frontal: number } {
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

    const trunkVector = {
      x: shoulderMidpoint.x - hipMidpoint.x,
      y: shoulderMidpoint.y - hipMidpoint.y,
      z: shoulderMidpoint.z - hipMidpoint.z
    };

    // Sagittal plane lean (forward/backward)
    const sagittalAngle = Math.atan2(trunkVector.z, trunkVector.y) * 180 / Math.PI;
    
    // Frontal plane lean (left/right)
    const frontalAngle = Math.atan2(trunkVector.x, trunkVector.y) * 180 / Math.PI;

    return {
      sagittal: Math.abs(sagittalAngle),
      frontal: Math.abs(frontalAngle)
    };
  }

  private calculateArmPosition(
    leftShoulder: Vector3D,
    rightShoulder: Vector3D,
    leftElbow: Vector3D,
    rightElbow: Vector3D
  ): { shoulderAbduction: number; elbowFlexion: number; valid: boolean } {
    // Calculate shoulder abduction (should be ~45°)
    const leftArmVector = {
      x: leftElbow.x - leftShoulder.x,
      y: leftElbow.y - leftShoulder.y,
      z: leftElbow.z - leftShoulder.z
    };

    const shoulderAbduction = Math.atan2(
      Math.sqrt(leftArmVector.x ** 2 + leftArmVector.z ** 2),
      leftArmVector.y
    ) * 180 / Math.PI;

    // For this implementation, assume elbow flexion is approximately 90°
    const elbowFlexion = 90;

    // Validate arm position (should be 45° ± 10°)
    const valid = shoulderAbduction >= 35 && shoulderAbduction <= 55;

    return {
      shoulderAbduction,
      elbowFlexion,
      valid
    };
  }

  private calculateLandingSymmetry(frames: Pose3DLandmarks[]): { forceDistribution: number; timeToStabilization: number } {
    // Simplified calculation - in production, would use force plates
    const leftAnklePositions = frames.map(f => f.landmarks[this.LANDMARKS.LEFT_ANKLE]);
    const rightAnklePositions = frames.map(f => f.landmarks[this.LANDMARKS.RIGHT_ANKLE]);

    // Calculate force distribution approximation based on ankle positions
    const avgLeftY = leftAnklePositions.reduce((sum, pos) => sum + pos.y, 0) / leftAnklePositions.length;
    const avgRightY = rightAnklePositions.reduce((sum, pos) => sum + pos.y, 0) / rightAnklePositions.length;
    
    const forceDistribution = Math.abs(avgLeftY - avgRightY) * 100; // Convert to percentage

    // Time to stabilization (simplified)
    const timeToStabilization = frames.length / this.frameRate * 1000; // ms

    return {
      forceDistribution,
      timeToStabilization
    };
  }

  private calculateInstabilityIndex(frames: Pose3DLandmarks[]): number {
    // Calculate center of mass movement variability
    const comPositions = frames.map(f => this.calculateCenterOfMass(f.landmarks));
    
    let totalVariability = 0;
    for (let i = 1; i < comPositions.length; i++) {
      const movement = Math.sqrt(
        (comPositions[i].x - comPositions[i-1].x) ** 2 +
        (comPositions[i].y - comPositions[i-1].y) ** 2 +
        (comPositions[i].z - comPositions[i-1].z) ** 2
      );
      totalVariability += movement;
    }

    return totalVariability / frames.length;
  }

  private assessOverallRisk(metrics: Partial<DropJumpMetrics>): 'low' | 'moderate' | 'high' {
    let riskScore = 0;

    // Knee valgus risk factors
    if (metrics.maxKneeValgus) {
      if (metrics.maxKneeValgus.left > 15 || metrics.maxKneeValgus.right > 15) riskScore += 2;
      if (metrics.maxKneeValgus.asymmetry > 10) riskScore += 1;
    }

    // Trunk lean risk factors
    if (metrics.trunkLean) {
      if (metrics.trunkLean.sagittal > 15 || metrics.trunkLean.frontal > 10) riskScore += 1;
    }

    // Arm position risk factor
    if (metrics.armPosition && !metrics.armPosition.valid) riskScore += 1;

    // Instability risk factor
    if (metrics.instabilityIndex && metrics.instabilityIndex > 0.5) riskScore += 1;

    if (riskScore >= 3) return 'high';
    if (riskScore >= 1) return 'moderate';
    return 'low';
  }

  private calculateTrialConfidence(frames: Pose3DLandmarks[]): number {
    const avgConfidence = frames.reduce((sum, frame) => sum + frame.confidence, 0) / frames.length;
    return Math.round(avgConfidence * 100);
  }

  getTrials(): DropJumpTrial[] {
    return this.trials;
  }

  getTrialCount(): number {
    return this.trials.length;
  }

  getRiskDistribution(): { low: number; moderate: number; high: number } {
    const distribution = { low: 0, moderate: 0, high: 0 };
    this.trials.forEach(trial => {
      distribution[trial.metrics.overallRisk]++;
    });
    return distribution;
  }

  getOverallAssessment(): 'low' | 'moderate' | 'high' {
    if (this.trials.length === 0) return 'low';
    
    const riskDistribution = this.getRiskDistribution();
    const highRiskPercentage = riskDistribution.high / this.trials.length;
    
    if (highRiskPercentage >= 0.5) return 'high';
    if (highRiskPercentage >= 0.3 || riskDistribution.moderate / this.trials.length >= 0.5) return 'moderate';
    return 'low';
  }
}
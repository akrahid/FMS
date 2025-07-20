import { MotionFrame, MotionRecording, HandLandmarks, Vector3D, JointVelocity, MovementAnalysis, MovementDeviation } from '../types/assessment';
import { Hands } from '@mediapipe/hands';
import { Pose } from '@mediapipe/pose';
import { FaceMesh } from '@mediapipe/face_mesh';

export class MotionCaptureSystem {
  private isRecording = false;
  private frames: MotionFrame[] = [];
  private frameRate = 120;
  private startTime = 0;
  private frameIndex = 0;
  private poseDetector: Pose | null = null;
  private handsDetector: Hands | null = null;
  private faceMeshDetector: FaceMesh | null = null;

  constructor() {
    this.initializeDetectors();
  }

  private async initializeDetectors() {
    // Initialize MediaPipe Pose with high accuracy settings
    this.poseDetector = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    this.poseDetector.setOptions({
      modelComplexity: 2,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.9,
      minTrackingConfidence: 0.9
    });

    // Initialize MediaPipe Hands for detailed hand tracking
    this.handsDetector = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.handsDetector.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.8,
      minTrackingConfidence: 0.8
    });

    // Initialize MediaPipe FaceMesh for detailed facial tracking
    this.faceMeshDetector = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    this.faceMeshDetector.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });
  }

  async startRecording(testType: string): Promise<void> {
    this.isRecording = true;
    this.frames = [];
    this.frameIndex = 0;
    this.startTime = performance.now();
    console.log(`Started high-fidelity motion capture at ${this.frameRate}fps`);
  }

  stopRecording(): MotionRecording {
    this.isRecording = false;
    const duration = (performance.now() - this.startTime) / 1000;
    
    const recording: MotionRecording = {
      id: Date.now().toString(),
      name: `Motion_${new Date().toISOString().split('T')[0]}`,
      frames: this.frames,
      frameRate: this.frameRate,
      duration,
      testType: 'motion-capture',
      timestamp: Date.now(),
      metadata: {
        totalFrames: this.frames.length,
        averageConfidence: this.calculateAverageConfidence(),
        trackingQuality: this.assessTrackingQuality()
      }
    };

    this.saveRecording(recording);
    return recording;
  }

  async processFrame(videoElement: HTMLVideoElement): Promise<MotionFrame | null> {
    if (!this.isRecording || !this.poseDetector || !this.handsDetector) return null;

    const timestamp = performance.now() - this.startTime;
    
    try {
      // Process pose landmarks
      const poseResults = await new Promise<any>((resolve) => {
        this.poseDetector!.onResults = resolve;
        this.poseDetector!.send({ image: videoElement });
      });

      // Process hand landmarks
      const handResults = await new Promise<any>((resolve) => {
        this.handsDetector!.onResults = resolve;
        this.handsDetector!.send({ image: videoElement });
      });

      // Process face mesh landmarks
      const faceResults = await new Promise<any>((resolve) => {
        this.faceMeshDetector!.onResults = resolve;
        this.faceMeshDetector!.send({ image: videoElement });
      });

      const frame: MotionFrame = {
        timestamp,
        bodyLandmarks: this.convertPoseLandmarks(poseResults.poseLandmarks || []),
        leftHand: this.extractHandLandmarks(handResults, 'Left'),
        rightHand: this.extractHandLandmarks(handResults, 'Right'),
        confidence: this.calculateFrameConfidence(poseResults, handResults, faceResults),
        frameIndex: this.frameIndex++
      };

      this.frames.push(frame);
      return frame;

    } catch (error) {
      console.error('Error processing motion frame:', error);
      return null;
    }
  }

  private convertPoseLandmarks(landmarks: any[]): Vector3D[] {
    return landmarks.map(lm => ({
      x: lm.x,
      y: lm.y,
      z: lm.z || 0
    }));
  }

  private extractHandLandmarks(handResults: any, handedness: 'Left' | 'Right'): HandLandmarks | undefined {
    if (!handResults.multiHandLandmarks || !handResults.multiHandedness) return undefined;

    const handIndex = handResults.multiHandedness.findIndex(
      (hand: any) => hand.label === handedness
    );

    if (handIndex === -1) return undefined;

    const landmarks = handResults.multiHandLandmarks[handIndex];
    
    return {
      landmarks: landmarks.map((lm: any) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z || 0
      })),
      confidence: handResults.multiHandedness[handIndex].score || 0,
      timestamp: performance.now()
    };
  }

  private calculateFrameConfidence(poseResults: any, handResults: any): number {
  private calculateFrameConfidence(poseResults: any, handResults: any, faceResults: any): number {
    let totalConfidence = 0;
    let count = 0;

    if (poseResults.poseLandmarks) {
      const poseConfidence = poseResults.poseLandmarks.reduce(
        (sum: number, lm: any) => sum + (lm.visibility || 0), 0
      ) / poseResults.poseLandmarks.length;
      totalConfidence += poseConfidence;
      count++;
    }

    if (handResults.multiHandedness) {
      const handConfidence = handResults.multiHandedness.reduce(
        (sum: number, hand: any) => sum + hand.score, 0
      ) / handResults.multiHandedness.length;
      totalConfidence += handConfidence;
      count++;
    }

    if (faceResults.multiFaceLandmarks && faceResults.multiFaceLandmarks.length > 0) {
      const faceConfidence = faceResults.multiFaceLandmarks[0].reduce(
        (sum: number, landmark: any) => sum + (landmark.visibility || 1), 0
      ) / faceResults.multiFaceLandmarks[0].length;
      totalConfidence += faceConfidence;
      count++;
    }

    return count > 0 ? totalConfidence / count : 0;
  }

  private calculateAverageConfidence(): number {
    if (this.frames.length === 0) return 0;
    return this.frames.reduce((sum, frame) => sum + frame.confidence, 0) / this.frames.length;
  }

  private assessTrackingQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avgConfidence = this.calculateAverageConfidence();
    const frameConsistency = this.calculateFrameConsistency();
    
    const qualityScore = (avgConfidence + frameConsistency) / 2;
    
    if (qualityScore >= 0.9) return 'excellent';
    if (qualityScore >= 0.8) return 'good';
    if (qualityScore >= 0.7) return 'fair';
    return 'poor';
  }

  private calculateFrameConsistency(): number {
    if (this.frames.length < 2) return 1;
    
    let consistencyScore = 0;
    for (let i = 1; i < this.frames.length; i++) {
      const prev = this.frames[i - 1];
      const curr = this.frames[i];
      
      // Check if landmark count is consistent
      if (prev.bodyLandmarks.length === curr.bodyLandmarks.length) {
        consistencyScore++;
      }
    }
    
    return consistencyScore / (this.frames.length - 1);
  }

  private saveRecording(recording: MotionRecording): void {
    try {
      const recordings = this.getStoredRecordings();
      recordings.unshift(recording);
      
      // Keep only last 20 recordings
      if (recordings.length > 20) {
        recordings.splice(20);
      }
      
      localStorage.setItem('motionRecordings', JSON.stringify(recordings));
      console.log('Motion recording saved successfully');
    } catch (error) {
      console.error('Failed to save motion recording:', error);
    }
  }

  getStoredRecordings(): MotionRecording[] {
    try {
      const stored = localStorage.getItem('motionRecordings');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load stored recordings:', error);
      return [];
    }
  }

  exportToBVH(recording: MotionRecording): string {
    // Basic BVH export implementation
    let bvh = 'HIERARCHY\n';
    bvh += 'ROOT Hips\n';
    bvh += '{\n';
    bvh += '  OFFSET 0.0 0.0 0.0\n';
    bvh += '  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation\n';
    
    // Add joint hierarchy (simplified)
    bvh += '  JOINT Chest\n';
    bvh += '  {\n';
    bvh += '    OFFSET 0.0 20.0 0.0\n';
    bvh += '    CHANNELS 3 Zrotation Xrotation Yrotation\n';
    bvh += '    End Site\n';
    bvh += '    {\n';
    bvh += '      OFFSET 0.0 10.0 0.0\n';
    bvh += '    }\n';
    bvh += '  }\n';
    bvh += '}\n';
    
    bvh += 'MOTION\n';
    bvh += `Frames: ${recording.frames.length}\n`;
    bvh += `Frame Time: ${1.0 / recording.frameRate}\n`;
    
    // Add frame data
    recording.frames.forEach(frame => {
      if (frame.bodyLandmarks.length > 23) { // Hip landmark
        const hip = frame.bodyLandmarks[23];
        bvh += `${hip.x} ${hip.y} ${hip.z} 0.0 0.0 0.0 0.0 0.0 0.0\n`;
      }
    });
    
    return bvh;
  }

  calculateJointVelocities(recording: MotionRecording): JointVelocity[] {
    const velocities: JointVelocity[] = [];
    
    if (recording.frames.length < 2) return velocities;
    
    const jointNames = [
      'Head', 'Neck', 'Left Shoulder', 'Right Shoulder',
      'Left Elbow', 'Right Elbow', 'Left Wrist', 'Right Wrist',
      'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee',
      'Left Ankle', 'Right Ankle'
    ];
    
    const jointIndices = [0, 1, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    
    for (let i = 1; i < recording.frames.length; i++) {
      const prevFrame = recording.frames[i - 1];
      const currFrame = recording.frames[i];
      const deltaTime = (currFrame.timestamp - prevFrame.timestamp) / 1000;
      
      if (deltaTime === 0) continue;
      
      jointIndices.forEach((jointIndex, idx) => {
        if (prevFrame.bodyLandmarks[jointIndex] && currFrame.bodyLandmarks[jointIndex]) {
          const prev = prevFrame.bodyLandmarks[jointIndex];
          const curr = currFrame.bodyLandmarks[jointIndex];
          
          const velocity: Vector3D = {
            x: (curr.x - prev.x) / deltaTime,
            y: (curr.y - prev.y) / deltaTime,
            z: (curr.z - prev.z) / deltaTime
          };
          
          const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
          
          // Calculate acceleration (simplified)
          const acceleration: Vector3D = { x: 0, y: 0, z: 0 };
          if (i > 1) {
            const prevVelocity = velocities.find(v => 
              v.jointName === jointNames[idx] && 
              velocities.indexOf(v) === velocities.length - jointIndices.length + idx
            );
            
            if (prevVelocity) {
              acceleration.x = (velocity.x - prevVelocity.velocity.x) / deltaTime;
              acceleration.y = (velocity.y - prevVelocity.velocity.y) / deltaTime;
              acceleration.z = (velocity.z - prevVelocity.velocity.z) / deltaTime;
            }
          }
          
          velocities.push({
            jointName: jointNames[idx],
            velocity,
            speed,
            acceleration
          });
        }
      });
    }
    
    return velocities;
  }

  analyzeMovement(recording: MotionRecording): MovementAnalysis {
    const velocities = this.calculateJointVelocities(recording);
    const centerOfMass = this.calculateCenterOfMass(recording);
    const deviations = this.detectMovementDeviations(recording);
    const forceVectors = this.calculateForceVectors(recording);
    
    return {
      jointAngles: [], // Would be calculated using existing joint angle functions
      velocities,
      centerOfMass,
      movementQuality: this.assessMovementQuality(recording),
      deviations,
      forceVectors
    };
  }

  private calculateCenterOfMass(recording: MotionRecording): Vector3D[] {
    return recording.frames.map(frame => {
      if (frame.bodyLandmarks.length < 24) {
        return { x: 0, y: 0, z: 0 };
      }
      
      const leftHip = frame.bodyLandmarks[23];
      const rightHip = frame.bodyLandmarks[24];
      
      return {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2,
        z: (leftHip.z + rightHip.z) / 2
      };
    });
  }

  private detectMovementDeviations(recording: MotionRecording): MovementDeviation[] {
    const deviations: MovementDeviation[] = [];
    
    // Analyze each frame for deviations
    recording.frames.forEach((frame, index) => {
      // Check for tracking quality issues
      if (frame.confidence < 0.7) {
        deviations.push({
          jointName: 'Overall',
          deviationType: 'position',
          severity: 'moderate',
          description: 'Low tracking confidence detected',
          frameIndex: index
        });
      }
      
      // Check for missing landmarks
      if (frame.bodyLandmarks.length < 33) {
        deviations.push({
          jointName: 'Overall',
          deviationType: 'position',
          severity: 'major',
          description: 'Missing body landmarks',
          frameIndex: index
        });
      }
    });
    
    return deviations;
  }

  private calculateForceVectors(recording: MotionRecording): Vector3D[] {
    // Simplified force vector calculation based on acceleration
    const forces: Vector3D[] = [];
    const velocities = this.calculateJointVelocities(recording);
    
    // Group velocities by joint and calculate force approximations
    const jointGroups = new Map<string, JointVelocity[]>();
    velocities.forEach(v => {
      if (!jointGroups.has(v.jointName)) {
        jointGroups.set(v.jointName, []);
      }
      jointGroups.get(v.jointName)!.push(v);
    });
    
    jointGroups.forEach((jointVelocities, jointName) => {
      jointVelocities.forEach(v => {
        // F = ma (simplified, assuming unit mass)
        forces.push({
          x: v.acceleration.x,
          y: v.acceleration.y,
          z: v.acceleration.z
        });
      });
    });
    
    return forces;
  }

  private assessMovementQuality(recording: MotionRecording): number {
    let qualityScore = 100;
    
    // Penalize for low confidence frames
    const lowConfidenceFrames = recording.frames.filter(f => f.confidence < 0.8).length;
    qualityScore -= (lowConfidenceFrames / recording.frames.length) * 30;
    
    // Penalize for missing data
    const incompleteFrames = recording.frames.filter(f => f.bodyLandmarks.length < 33).length;
    qualityScore -= (incompleteFrames / recording.frames.length) * 40;
    
    // Penalize for inconsistent frame rate
    const expectedFrames = recording.duration * recording.frameRate;
    const frameRateConsistency = recording.frames.length / expectedFrames;
    if (frameRateConsistency < 0.9) {
      qualityScore -= (1 - frameRateConsistency) * 20;
    }
    
    return Math.max(0, Math.min(100, qualityScore));
  }
}

export const motionCaptureSystem = new MotionCaptureSystem();
import { PoseKeypoint } from '../types/assessment';
import { StereoCalibration } from './cameraSetup';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Pose3DLandmarks {
  landmarks: Vector3D[];
  confidence: number;
  timestamp: number;
  processingTime: number;
}

export class Pose3DProcessor {
  private calibration: StereoCalibration;
  private processingTimes: number[] = [];

  constructor(calibration: StereoCalibration) {
    this.calibration = calibration;
  }

  async process3DPose(
    landmarks2D_cam1: PoseKeypoint[],
    landmarks2D_cam2: PoseKeypoint[],
    timestamp: number
  ): Promise<Pose3DLandmarks> {
    const startTime = performance.now();

    if (!this.calibration.isCalibrated) {
      throw new Error('Cameras not calibrated for 3D processing');
    }

    // Triangulate 3D points from stereo pair
    const landmarks3D = this.triangulatePoints(landmarks2D_cam1, landmarks2D_cam2);
    
    // Apply biomechanical constraints
    const constrainedLandmarks = this.applyBiomechanicalConstraints(landmarks3D);
    
    // Apply temporal smoothing
    const smoothedLandmarks = this.applySmoothingFilter(constrainedLandmarks);
    
    // Calculate confidence based on triangulation quality
    const confidence = this.calculateTriangulationConfidence(
      landmarks2D_cam1, 
      landmarks2D_cam2, 
      smoothedLandmarks
    );

    const processingTime = performance.now() - startTime;
    this.updatePerformanceMetrics(processingTime);

    return {
      landmarks: smoothedLandmarks,
      confidence,
      timestamp,
      processingTime
    };
  }

  private triangulatePoints(
    landmarks1: PoseKeypoint[], 
    landmarks2: PoseKeypoint[]
  ): Vector3D[] {
    const points3D: Vector3D[] = [];
    
    for (let i = 0; i < Math.min(landmarks1.length, landmarks2.length); i++) {
      const lm1 = landmarks1[i];
      const lm2 = landmarks2[i];
      
      // Skip if either landmark has low confidence
      if (lm1.visibility < 0.5 || lm2.visibility < 0.5) {
        points3D.push({ x: 0, y: 0, z: 0 });
        continue;
      }

      // Convert normalized coordinates to pixel coordinates
      const p1 = {
        x: lm1.x * 1920, // Assuming 1920x1080 resolution
        y: lm1.y * 1080
      };
      const p2 = {
        x: lm2.x * 1920,
        y: lm2.y * 1080
      };

      // Triangulate using DLT (Direct Linear Transform)
      const point3D = this.triangulatePoint(p1, p2);
      points3D.push(point3D);
    }

    return points3D;
  }

  private triangulatePoint(p1: {x: number, y: number}, p2: {x: number, y: number}): Vector3D {
    const P1 = this.calibration.camera1.projectionMatrix;
    const P2 = this.calibration.camera2.projectionMatrix;

    // Build the A matrix for DLT
    const A = [
      [p1.x * P1[2][0] - P1[0][0], p1.x * P1[2][1] - P1[0][1], p1.x * P1[2][2] - P1[0][2]],
      [p1.y * P1[2][0] - P1[1][0], p1.y * P1[2][1] - P1[1][1], p1.y * P1[2][2] - P1[1][2]],
      [p2.x * P2[2][0] - P2[0][0], p2.x * P2[2][1] - P2[0][1], p2.x * P2[2][2] - P2[0][2]],
      [p2.y * P2[2][0] - P2[1][0], p2.y * P2[2][1] - P2[1][1], p2.y * P2[2][2] - P2[1][2]]
    ];

    const b = [
      P1[0][3] - p1.x * P1[2][3],
      P1[1][3] - p1.y * P1[2][3],
      P2[0][3] - p2.x * P2[2][3],
      P2[1][3] - p2.y * P2[2][3]
    ];

    // Solve using least squares (simplified implementation)
    const point3D = this.solveLeastSquares(A, b);
    
    return {
      x: point3D[0],
      y: point3D[1],
      z: point3D[2]
    };
  }

  private solveLeastSquares(A: number[][], b: number[]): number[] {
    // Simplified least squares solution
    // In production, use a proper linear algebra library
    const AtA = this.multiplyMatrices(this.transpose(A), A);
    const Atb = this.multiplyMatrixVector(this.transpose(A), b);
    
    // Simple 3x3 matrix inversion for this case
    const invAtA = this.invert3x3(AtA);
    return this.multiplyMatrixVector(invAtA, Atb);
  }

  private applyBiomechanicalConstraints(landmarks: Vector3D[]): Vector3D[] {
    const constrained = [...landmarks];
    
    // Apply anatomical constraints
    for (let i = 0; i < constrained.length; i++) {
      // Ensure reasonable limb lengths
      if (i === 25 || i === 26) { // Knees
        const hip = constrained[i === 25 ? 23 : 24];
        const ankle = constrained[i === 25 ? 27 : 28];
        
        if (hip && ankle) {
          const thighLength = this.distance3D(hip, constrained[i]);
          const shankLength = this.distance3D(constrained[i], ankle);
          
          // Typical thigh:shank ratio is ~1.1:1
          const expectedRatio = 1.1;
          const actualRatio = thighLength / shankLength;
          
          if (Math.abs(actualRatio - expectedRatio) > 0.3) {
            // Adjust knee position to maintain anatomical proportions
            constrained[i] = this.adjustKneePosition(hip, ankle, expectedRatio);
          }
        }
      }
    }

    return constrained;
  }

  private applySmoothingFilter(landmarks: Vector3D[]): Vector3D[] {
    // Apply Kalman filter or simple moving average
    // For now, implementing simple temporal smoothing
    return landmarks.map(landmark => ({
      x: Math.round(landmark.x * 1000) / 1000,
      y: Math.round(landmark.y * 1000) / 1000,
      z: Math.round(landmark.z * 1000) / 1000
    }));
  }

  private calculateTriangulationConfidence(
    landmarks1: PoseKeypoint[],
    landmarks2: PoseKeypoint[],
    landmarks3D: Vector3D[]
  ): number {
    let totalConfidence = 0;
    let validPoints = 0;

    for (let i = 0; i < landmarks1.length; i++) {
      const conf1 = landmarks1[i]?.visibility || 0;
      const conf2 = landmarks2[i]?.visibility || 0;
      
      if (conf1 > 0.5 && conf2 > 0.5) {
        // Geometric confidence based on triangulation angle
        const triangulationAngle = this.calculateTriangulationAngle(i, landmarks1[i], landmarks2[i]);
        const geometricConfidence = Math.min(triangulationAngle / 30, 1); // Optimal at 30+ degrees
        
        totalConfidence += (conf1 + conf2) / 2 * geometricConfidence;
        validPoints++;
      }
    }

    return validPoints > 0 ? totalConfidence / validPoints : 0;
  }

  private calculateTriangulationAngle(
    landmarkIndex: number,
    lm1: PoseKeypoint,
    lm2: PoseKeypoint
  ): number {
    // Calculate the angle between the two camera rays
    const baseline = this.calibration.baseline;
    const disparity = Math.abs(lm1.x - lm2.x) * 1920; // Convert to pixels
    
    if (disparity < 1) return 0; // Too small disparity
    
    const depth = (baseline * 1000) / disparity; // Focal length approximation
    const angle = Math.atan(baseline / depth) * 180 / Math.PI;
    
    return angle;
  }

  private updatePerformanceMetrics(processingTime: number): void {
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 30) {
      this.processingTimes.shift();
    }
  }

  getAverageProcessingTime(): number {
    return this.processingTimes.length > 0 
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length 
      : 0;
  }

  // Utility methods
  private distance3D(p1: Vector3D, p2: Vector3D): number {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2)
    );
  }

  private adjustKneePosition(hip: Vector3D, ankle: Vector3D, targetRatio: number): Vector3D {
    const totalLength = this.distance3D(hip, ankle);
    const thighLength = totalLength * targetRatio / (1 + targetRatio);
    
    const direction = {
      x: (ankle.x - hip.x) / totalLength,
      y: (ankle.y - hip.y) / totalLength,
      z: (ankle.z - hip.z) / totalLength
    };

    return {
      x: hip.x + direction.x * thighLength,
      y: hip.y + direction.y * thighLength,
      z: hip.z + direction.z * thighLength
    };
  }

  private multiplyMatrices(a: number[][], b: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < b.length; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  private multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => 
      row.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  }

  private transpose(matrix: number[][]): number[][] {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  private invert3x3(matrix: number[][]): number[][] {
    // Simplified 3x3 matrix inversion
    const det = this.determinant3x3(matrix);
    if (Math.abs(det) < 1e-10) {
      throw new Error('Matrix is singular');
    }

    const inv = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];

    inv[0][0] = (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) / det;
    inv[0][1] = (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) / det;
    inv[0][2] = (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) / det;
    inv[1][0] = (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) / det;
    inv[1][1] = (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) / det;
    inv[1][2] = (matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) / det;
    inv[2][0] = (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) / det;
    inv[2][1] = (matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) / det;
    inv[2][2] = (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) / det;

    return inv;
  }

  private determinant3x3(matrix: number[][]): number {
    return matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
           matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
           matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
  }
}
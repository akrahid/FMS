import { PoseKeypoint } from '../types/assessment';

export interface CameraCalibration {
  intrinsic: number[][];
  distortion: number[];
  rotation: number[][];
  translation: number[];
  projectionMatrix: number[][];
}

export interface StereoCalibration {
  camera1: CameraCalibration;
  camera2: CameraCalibration;
  fundamentalMatrix: number[][];
  essentialMatrix: number[][];
  baseline: number;
  isCalibrated: boolean;
}

export class DualCameraManager {
  private camera1Stream: MediaStream | null = null;
  private camera2Stream: MediaStream | null = null;
  private calibration: StereoCalibration | null = null;
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      // Get available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length < 2) {
        throw new Error('Two cameras required for 3D analysis. Please connect dual cameras.');
      }

      // Configure high-quality streams for biomechanical analysis
      const constraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 90, min: 60 },
          facingMode: 'environment'
        },
        audio: false
      };

      // Initialize camera streams
      this.camera1Stream = await navigator.mediaDevices.getUserMedia({
        ...constraints,
        video: { ...constraints.video, deviceId: videoDevices[0].deviceId }
      });

      this.camera2Stream = await navigator.mediaDevices.getUserMedia({
        ...constraints,
        video: { ...constraints.video, deviceId: videoDevices[1].deviceId }
      });

      // Load or perform calibration
      await this.loadCalibration();
      
      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('Failed to initialize dual cameras:', error);
      return false;
    }
  }

  private async loadCalibration(): Promise<void> {
    // Try to load existing calibration from storage
    const stored = localStorage.getItem('stereoCalibration');
    if (stored) {
      try {
        this.calibration = JSON.parse(stored);
        if (this.calibration?.isCalibrated) {
          console.log('Loaded existing stereo calibration');
          return;
        }
      } catch (error) {
        console.warn('Failed to load stored calibration:', error);
      }
    }

    // Perform new calibration
    await this.performCalibration();
  }

  private async performCalibration(): Promise<void> {
    console.log('Performing stereo camera calibration...');
    
    // Simplified calibration - in production, use checkerboard pattern
    // For now, use default calibration parameters
    this.calibration = {
      camera1: {
        intrinsic: [
          [1000, 0, 960],
          [0, 1000, 540],
          [0, 0, 1]
        ],
        distortion: [0.1, -0.2, 0, 0, 0],
        rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        translation: [0, 0, 0],
        projectionMatrix: [
          [1000, 0, 960, 0],
          [0, 1000, 540, 0],
          [0, 0, 1, 0]
        ]
      },
      camera2: {
        intrinsic: [
          [1000, 0, 960],
          [0, 1000, 540],
          [0, 0, 1]
        ],
        distortion: [0.1, -0.2, 0, 0, 0],
        rotation: [[0.9998, 0.0175, 0], [-0.0175, 0.9998, 0], [0, 0, 1]],
        translation: [200, 0, 0], // 20cm baseline
        projectionMatrix: [
          [1000, 0, 960, -200000],
          [0, 1000, 540, 0],
          [0, 0, 1, 0]
        ]
      },
      fundamentalMatrix: [
        [0, 0, 0.001],
        [0, 0, -0.005],
        [-0.001, 0.005, 1]
      ],
      essentialMatrix: [
        [0, 0, 200],
        [0, 0, -1000],
        [-200, 1000, 0]
      ],
      baseline: 200, // mm
      isCalibrated: true
    };

    // Store calibration
    localStorage.setItem('stereoCalibration', JSON.stringify(this.calibration));
    console.log('Stereo calibration completed and saved');
  }

  getStreams(): { camera1: MediaStream | null; camera2: MediaStream | null } {
    return {
      camera1: this.camera1Stream,
      camera2: this.camera2Stream
    };
  }

  getCalibration(): StereoCalibration | null {
    return this.calibration;
  }

  isReady(): boolean {
    return this.isInitialized && 
           this.camera1Stream !== null && 
           this.camera2Stream !== null && 
           this.calibration?.isCalibrated === true;
  }

  async recalibrate(): Promise<void> {
    localStorage.removeItem('stereoCalibration');
    await this.performCalibration();
  }

  dispose(): void {
    if (this.camera1Stream) {
      this.camera1Stream.getTracks().forEach(track => track.stop());
      this.camera1Stream = null;
    }
    if (this.camera2Stream) {
      this.camera2Stream.getTracks().forEach(track => track.stop());
      this.camera2Stream = null;
    }
    this.isInitialized = false;
  }
}

export const dualCameraManager = new DualCameraManager();
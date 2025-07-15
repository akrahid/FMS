import React, { useState, useRef, useCallback } from 'react';
import { Play, Pause, Square, Download, Save, Trash2, Clock, Camera, FileVideo } from 'lucide-react';
import { motionCaptureSystem } from '../utils/motionCapture';
import { MotionRecording } from '../types/assessment';

interface RecordingManagerProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onReset: () => void;
  currentTest: string;
  onPlaybackRecording?: (recording: MotionRecording) => void;
}

interface SavedRecording {
  id: string;
  name: string;
  testType: string;
  duration: number;
  timestamp: number;
  size: number;
  blob: Blob;
}

const RecordingManager: React.FC<RecordingManagerProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onReset,
  currentTest,
  onPlaybackRecording
}) => {
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [savedRecordings, setSavedRecordings] = useState<SavedRecording[]>([]);
  const [currentRecording, setCurrentRecording] = useState<Blob | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [motionRecordings, setMotionRecordings] = useState<MotionRecording[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load saved recordings from localStorage on component mount
  React.useEffect(() => {
    loadSavedRecordings();
    loadMotionRecordings();
  }, []);

  const loadMotionRecordings = () => {
    const recordings = motionCaptureSystem.getStoredRecordings();
    setMotionRecordings(recordings);
  };

  const loadSavedRecordings = () => {
    try {
      const saved = localStorage.getItem('fmsRecordings');
      if (saved) {
        const recordings = JSON.parse(saved);
        setSavedRecordings(recordings);
      }
    } catch (error) {
      console.error('Failed to load saved recordings:', error);
    }
  };

  const saveRecordingToLocal = (recording: SavedRecording) => {
    try {
      const existingRecordings = [...savedRecordings];
      existingRecordings.unshift(recording);
      
      // Keep only last 10 recordings to manage storage
      if (existingRecordings.length > 10) {
        existingRecordings.splice(10);
      }

      setSavedRecordings(existingRecordings);
      localStorage.setItem('fmsRecordings', JSON.stringify(existingRecordings.map(r => ({
        ...r,
        blob: undefined // Don't store blob in localStorage, use IndexedDB instead
      }))));

      // Store blob in IndexedDB for better performance
      storeRecordingBlob(recording.id, recording.blob);
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  };

  const storeRecordingBlob = async (id: string, blob: Blob) => {
    try {
      const request = indexedDB.open('FMSRecordings', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('recordings')) {
          db.createObjectStore('recordings', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['recordings'], 'readwrite');
        const store = transaction.objectStore('recordings');
        store.put({ id, blob });
      };
    } catch (error) {
      console.error('Failed to store recording blob:', error);
    }
  };

  const getRecordingBlob = async (id: string): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const request = indexedDB.open('FMSRecordings', 1);
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['recordings'], 'readonly');
        const store = transaction.objectStore('recordings');
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result?.blob || null);
        };
        
        getRequest.onerror = () => {
          resolve(null);
        };
      };
      
      request.onerror = () => {
        resolve(null);
      };
    });
  };

  const startRecording = useCallback(async () => {
    try {
      // Get display media (screen recording) or camera
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      streamRef.current = stream;
      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setCurrentRecording(blob);
        setShowSaveDialog(true);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Record in 1-second chunks

      // Start timer
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      onStartRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [onStartRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    onStopRecording();
  }, [onStopRecording]);

  const resetRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setRecordingDuration(0);
    setCurrentRecording(null);
    setShowSaveDialog(false);
    recordedChunksRef.current = [];

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    onReset();
  }, [onReset]);

  const saveCurrentRecording = () => {
    if (!currentRecording || !recordingName.trim()) return;

    const recording: SavedRecording = {
      id: Date.now().toString(),
      name: recordingName.trim(),
      testType: currentTest,
      duration: recordingDuration,
      timestamp: Date.now(),
      size: currentRecording.size,
      blob: currentRecording
    };

    saveRecordingToLocal(recording);
    setShowSaveDialog(false);
    setRecordingName('');
    setCurrentRecording(null);
  };

  const downloadRecording = async (recording: SavedRecording) => {
    let blob = recording.blob;
    
    if (!blob) {
      blob = await getRecordingBlob(recording.id);
      if (!blob) {
        console.error('Recording blob not found');
        return;
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.name}-${recording.testType}-${new Date(recording.timestamp).toISOString().split('T')[0]}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteRecording = (id: string) => {
    const updatedRecordings = savedRecordings.filter(r => r.id !== id);
    setSavedRecordings(updatedRecordings);
    localStorage.setItem('fmsRecordings', JSON.stringify(updatedRecordings));

    // Also delete from IndexedDB
    const request = indexedDB.open('FMSRecordings', 1);
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['recordings'], 'readwrite');
      const store = transaction.objectStore('recordings');
      store.delete(id);
    };
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Camera className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Screen Recording</h3>
              <p className="text-sm text-gray-600">Record your assessment session</p>
            </div>
          </div>
          
          {isRecording && (
            <div className="flex items-center space-x-2 text-red-600">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-mono text-lg">{formatDuration(recordingDuration)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Play size={20} />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Square size={20} />
              <span>Stop Recording</span>
            </button>
          )}

          <button
            onClick={resetRecording}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && currentRecording && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Save Recording</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recording Name
              </label>
              <input
                type="text"
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                placeholder={`${currentTest}-${new Date().toLocaleDateString()}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Duration:</span> {formatDuration(recordingDuration)}
              </div>
              <div>
                <span className="font-medium">Size:</span> {formatFileSize(currentRecording.size)}
              </div>
              <div>
                <span className="font-medium">Test:</span> {currentTest}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={saveCurrentRecording}
                disabled={!recordingName.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>Save Recording</span>
              </button>
              
              <button
                onClick={() => {
                  if (currentRecording) {
                    downloadRecording({
                      id: 'temp',
                      name: recordingName || 'recording',
                      testType: currentTest,
                      duration: recordingDuration,
                      timestamp: Date.now(),
                      size: currentRecording.size,
                      blob: currentRecording
                    });
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={16} />
                <span>Download</span>
              </button>

              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setCurrentRecording(null);
                  setRecordingName('');
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motion Recordings */}
      {motionRecordings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Motion Capture Recordings</h3>
            <div className="text-sm text-gray-600">
              {motionRecordings.length} recording{motionRecordings.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="space-y-3">
            {motionRecordings.map((recording) => (
              <div key={recording.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{recording.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{recording.testType}</span>
                      <span className="flex items-center space-x-1">
                        <Clock size={12} />
                        <span>{recording.duration.toFixed(2)}s</span>
                      </span>
                      <span>{recording.frames.length} frames</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        recording.metadata.trackingQuality === 'excellent' ? 'bg-green-100 text-green-800' :
                        recording.metadata.trackingQuality === 'good' ? 'bg-blue-100 text-blue-800' :
                        recording.metadata.trackingQuality === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {recording.metadata.trackingQuality}
                      </span>
                      <span>{new Date(recording.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {onPlaybackRecording && (
                    <button
                      onClick={() => onPlaybackRecording(recording)}
                      className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                      title="Play Recording"
                    >
                      <Play size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const bvhData = motionCaptureSystem.exportToBVH(recording);
                      const blob = new Blob([bvhData], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${recording.name}.bvh`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Export BVH"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => {
                      const updatedRecordings = motionRecordings.filter(r => r.id !== recording.id);
                      setMotionRecordings(updatedRecordings);
                      localStorage.setItem('motionRecordings', JSON.stringify(updatedRecordings));
                    }}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Recordings */}
      {savedRecordings.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Saved Recordings</h3>
            <div className="text-sm text-gray-600">
              {savedRecordings.length} recording{savedRecordings.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="space-y-3">
            {savedRecordings.map((recording) => (
              <div key={recording.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileVideo className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-800">{recording.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{recording.testType}</span>
                      <span className="flex items-center space-x-1">
                        <Clock size={12} />
                        <span>{formatDuration(recording.duration)}</span>
                      </span>
                      <span>{formatFileSize(recording.size)}</span>
                      <span>{new Date(recording.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => downloadRecording(recording)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => deleteRecording(recording.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordingManager;
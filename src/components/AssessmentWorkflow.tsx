import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, CheckCircle, Info, Target, Activity } from 'lucide-react';
import { FMS_TESTS } from '../data/fmsTests';
import { FMSTest } from '../types/assessment';
import InfoModal from './InfoModal';

interface AssessmentWorkflowProps {
  onTestChange: (test: FMSTest) => void;
  currentTest: FMSTest;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onReset: () => void;
  isRecording: boolean;
  hideRecordingControls?: boolean;
}

const AssessmentWorkflow: React.FC<AssessmentWorkflowProps> = ({
  onTestChange,
  currentTest,
  onStartRecording,
  onStopRecording,
  onReset,
  isRecording,
  hideRecordingControls = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showKeyPointsModal, setShowKeyPointsModal] = useState(false);
  const currentTestIndex = FMS_TESTS.findIndex(test => test.id === currentTest.id);

  const handlePreviousTest = () => {
    if (currentTestIndex > 0) {
      onTestChange(FMS_TESTS[currentTestIndex - 1]);
      setCurrentStep(0);
    }
  };

  const handleNextTest = () => {
    if (currentTestIndex < FMS_TESTS.length - 1) {
      onTestChange(FMS_TESTS[currentTestIndex + 1]);
      setCurrentStep(0);
    }
  };

  const handleNextStep = () => {
    if (currentStep < currentTest.instructions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* FMS Protocol Header */}
        <div className="text-center border-b border-gray-200 pb-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">FMS Protocol</h2>
          </div>
          <p className="text-sm text-gray-600">Functional Movement Screen</p>
          <p className="text-xs text-gray-500 mt-1">7 Movement Patterns • Score: 0-21 Points</p>
        </div>

        {/* Test Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousTest}
            disabled={currentTestIndex === 0}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
            <span className="text-sm">Previous</span>
          </button>
          
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-800">{currentTest.name}</h3>
            <p className="text-sm text-gray-500">
              Test {currentTestIndex + 1} of {FMS_TESTS.length}
            </p>
            <div className="flex justify-center mt-2 space-x-1">
              {FMS_TESTS.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentTestIndex ? 'bg-blue-500' : 
                    index < currentTestIndex ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <button
            onClick={handleNextTest}
            disabled={currentTestIndex === FMS_TESTS.length - 1}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-sm">Next</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Test Description Button */}
        <button
          onClick={() => setShowDescriptionModal(true)}
          className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Info className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <h4 className="font-semibold text-blue-900">Test Description</h4>
                <p className="text-blue-700 text-sm">Click to view detailed information</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-blue-600" />
          </div>
        </button>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-800">Instructions</h4>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Step {currentStep + 1} of {currentTest.instructions.length}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-800 leading-relaxed">{currentTest.instructions[currentStep]}</p>
          </div>

          {/* Step Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              <span className="text-sm">Previous</span>
            </button>
            
            <div className="flex space-x-2">
              {currentTest.instructions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentStep ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={handleNextStep}
              disabled={currentStep === currentTest.instructions.length - 1}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm">Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Key Points Button */}
        <button
          onClick={() => setShowKeyPointsModal(true)}
          className="w-full bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 hover:from-green-100 hover:to-emerald-100 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Target className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <h4 className="font-semibold text-green-900">Key Points to Observe</h4>
                <p className="text-green-700 text-sm">View assessment criteria</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-green-600" />
          </div>
        </button>

        {/* Recording Controls - Only show if not hidden */}
        {!hideRecordingControls && (
          <div className="flex items-center justify-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <button
              onClick={isRecording ? onStopRecording : onStartRecording}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg'
                  : 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
              }`}
            >
              {isRecording ? <Pause size={20} /> : <Play size={20} />}
              <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
            </button>
            
            <button
              onClick={onReset}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw size={18} />
              <span>Reset</span>
            </button>
          </div>
        )}

        {/* FMS Score Range Info */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-4 w-4 text-purple-600" />
            <h5 className="font-semibold text-purple-900">FMS Scoring</h5>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="text-center">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full mx-auto mb-1 flex items-center justify-center font-bold">3</div>
              <span className="text-green-700">Perfect</span>
            </div>
            <div className="text-center">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full mx-auto mb-1 flex items-center justify-center font-bold">2</div>
              <span className="text-blue-700">Good</span>
            </div>
            <div className="text-center">
              <div className="w-6 h-6 bg-yellow-500 text-white rounded-full mx-auto mb-1 flex items-center justify-center font-bold">1</div>
              <span className="text-yellow-700">Poor</span>
            </div>
            <div className="text-center">
              <div className="w-6 h-6 bg-red-500 text-white rounded-full mx-auto mb-1 flex items-center justify-center font-bold">0</div>
              <span className="text-red-700">Pain</span>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-2 text-center">Total Score Range: 0-21 Points</p>
        </div>
      </div>

      {/* Description Modal */}
      <InfoModal
        isOpen={showDescriptionModal}
        onClose={() => setShowDescriptionModal(false)}
        title="Test Description"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">{currentTest.name}</h3>
          <p className="text-gray-700 leading-relaxed">{currentTest.description}</p>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Clinical Purpose</h4>
            <p className="text-blue-800 text-sm leading-relaxed">{currentTest.description}</p>
          </div>
        </div>
      </InfoModal>

      {/* Key Points Modal */}
      <InfoModal
        isOpen={showKeyPointsModal}
        onClose={() => setShowKeyPointsModal(false)}
        title="Key Points to Observe"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">{currentTest.name} - Assessment Criteria</h3>
          <ul className="space-y-3">
            {currentTest.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-6">
            <h4 className="font-semibold text-green-900 mb-2">Assessment Focus</h4>
            <p className="text-green-800 text-sm">
              Look for compensation patterns, asymmetries, and movement quality. 
              Each point contributes to the overall movement assessment and scoring.
            </p>
          </div>
        </div>
      </InfoModal>
    </>
  );
};

export default AssessmentWorkflow;
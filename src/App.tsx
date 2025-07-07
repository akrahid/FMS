import React, { useState, useEffect } from 'react';
import { Activity, Camera, Eye, BarChart3, Settings, Download, Menu, X, Maximize2, Minimize2, Play, Pause, RotateCcw, FileText } from 'lucide-react';
import PoseDetection from './components/PoseDetection';
import ScoreCard from './components/ScoreCard';
import AssessmentWorkflow from './components/AssessmentWorkflow';
import ThreeDVisualization from './components/ThreeDVisualization';
import AssessmentMetricsTable from './components/AssessmentMetricsTable';
import InfoModal from './components/InfoModal';
import { FMS_TESTS } from './data/fmsTests';
import { FMSTest, PoseResults, JointAngle, AnnotationData, AssessmentScore, AssessmentMetricResult } from './types/assessment';
import { calculateAllJointAngles, generateAutomaticScore, getDetailedMetricResults } from './utils/poseAnalysis';

function App() {
  const [currentTest, setCurrentTest] = useState<FMSTest>(FMS_TESTS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [poseResults, setPoseResults] = useState<PoseResults[]>([]);
  const [currentPose, setCurrentPose] = useState<PoseResults | null>(null);
  const [jointAngles, setJointAngles] = useState<JointAngle[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [assessmentScores, setAssessmentScores] = useState<AssessmentScore[]>([]);
  const [activeView, setActiveView] = useState<'2d' | '3d'>('2d');
  const [automaticScore, setAutomaticScore] = useState<number>(0);
  const [metricResults, setMetricResults] = useState<AssessmentMetricResult[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showMetricsTable, setShowMetricsTable] = useState(false);
  const [cameraSize, setCameraSize] = useState<'small' | 'medium' | 'large' | 'fullscreen'>('large');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (currentPose && currentTest) {
      const angles = calculateAllJointAngles(currentPose.landmarks);
      setJointAngles(angles);
      
      const metrics = getDetailedMetricResults(currentTest.id, currentPose.landmarks);
      setMetricResults(metrics);
      
      const score = generateAutomaticScore(currentTest.id, metrics);
      setAutomaticScore(score);
    }
  }, [currentPose, currentTest]);

  const handlePoseResults = (results: PoseResults) => {
    setCurrentPose(results);
    if (isRecording) {
      setPoseResults(prev => [...prev, results]);
    }
  };

  const handleJointAngles = (angles: JointAngle[]) => {
    setJointAngles(angles);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setPoseResults([]);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleReset = () => {
    setIsRecording(false);
    setPoseResults([]);
    setAnnotations([]);
    setCurrentPose(null);
    setJointAngles([]);
    setMetricResults([]);
    setNotes('');
  };

  const handleTestChange = (test: FMSTest) => {
    setCurrentTest(test);
    handleReset();
  };

  const handleScoreChange = (score: AssessmentScore) => {
    // Include metric results and automatic score in the assessment
    const enhancedScore = {
      ...score,
      automaticScore,
      metricResults,
      notes
    };

    setAssessmentScores(prev => {
      const existing = prev.findIndex(s => s.testId === score.testId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = enhancedScore;
        return updated;
      }
      return [...prev, enhancedScore];
    });
  };

  const handleExportResults = () => {
    const results = {
      test: currentTest.name,
      scores: assessmentScores,
      currentMetrics: metricResults,
      poseData: poseResults,
      annotations,
      jointAngles,
      notes,
      timestamp: new Date().toISOString(),
      summary: {
        totalScore: assessmentScores.reduce((sum, score) => sum + score.score, 0),
        maxScore: FMS_TESTS.length * 3,
        completedTests: assessmentScores.length,
        totalTests: FMS_TESTS.length,
        fmsProtocol: 'Official 7-Movement Pattern Assessment',
        scoreInterpretation: {
          excellent: '≥17 points',
          good: '14-16 points',
          average: '11-13 points',
          poor: '≤10 points'
        }
      }
    };

    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `fms-assessment-report-${currentTest.id}-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getCameraSizeClasses = () => {
    switch (cameraSize) {
      case 'small': return 'h-64';
      case 'medium': return 'h-96';
      case 'large': return 'h-[600px]';
      case 'fullscreen': return 'h-[calc(100vh-200px)]';
      default: return 'h-[600px]';
    }
  };

  const totalScore = assessmentScores.reduce((sum, score) => sum + score.score, 0);
  const maxScore = FMS_TESTS.length * 3;

  // FMS Score Interpretation
  const getScoreInterpretation = (score: number) => {
    if (score >= 17) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 14) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 11) return { label: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const scoreInterpretation = getScoreInterpretation(totalScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FMS Assessment Platform</h1>
                <p className="text-sm text-gray-500">Functional Movement Screen • 7 Movement Patterns</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Recording Controls */}
              <div className="flex items-center space-x-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    isRecording
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg'
                      : 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                  }`}
                >
                  {isRecording ? <Pause size={18} /> : <Play size={18} />}
                  <span className="hidden sm:inline">{isRecording ? 'Stop' : 'Record'}</span>
                </button>
                
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RotateCcw size={18} />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveView('2d')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeView === '2d'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Camera size={16} className="inline mr-2" />
                  2D View
                </button>
                <button
                  onClick={() => setActiveView('3d')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeView === '3d'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Eye size={16} className="inline mr-2" />
                  3D View
                </button>
              </div>

              {/* Camera Size Controls */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCameraSize('small')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    cameraSize === 'small' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  S
                </button>
                <button
                  onClick={() => setCameraSize('medium')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    cameraSize === 'medium' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={() => setCameraSize('large')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    cameraSize === 'large' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  L
                </button>
                <button
                  onClick={() => setCameraSize('fullscreen')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    cameraSize === 'fullscreen' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Maximize2 size={12} />
                </button>
              </div>

              {/* Metrics Report Button */}
              <button
                onClick={() => setShowMetricsTable(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">Metrics</span>
              </button>

              {/* Assessment Summary Button */}
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Summary</span>
                <div className="flex flex-col items-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${scoreInterpretation.bg} ${scoreInterpretation.color}`}>
                    {totalScore}/{maxScore}
                  </span>
                  <span className="text-xs text-gray-500">{scoreInterpretation.label}</span>
                </div>
              </button>
              
              <button
                onClick={handleExportResults}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Scoring Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-6 py-4">
          <ScoreCard
            testName={currentTest.name}
            testId={currentTest.id}
            automaticScore={automaticScore}
            onScoreChange={handleScoreChange}
            scoringCriteria={currentTest.scoringCriteria}
            assessmentScores={assessmentScores}
          />
        </div>
      </div>

      {/* Assessment Summary Dropdown */}
      {showSummary && (
        <div className="bg-white border-b border-gray-200 shadow-lg">
          <div className="max-w-full mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">FMS Assessment Summary</h3>
              <button
                onClick={() => setShowSummary(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {FMS_TESTS.map((test) => {
                const score = assessmentScores.find(s => s.testId === test.id);
                return (
                  <div key={test.id} className="flex flex-col items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <span className="text-xs font-medium text-gray-700 text-center mb-2">{test.name}</span>
                    <span className={`text-lg font-bold px-3 py-1 rounded-full ${
                      score?.score === 3 ? 'text-green-700 bg-green-100' :
                      score?.score === 2 ? 'text-blue-700 bg-blue-100' :
                      score?.score === 1 ? 'text-yellow-700 bg-yellow-100' :
                      score?.score === 0 ? 'text-red-700 bg-red-100' :
                      'text-gray-500 bg-gray-200'
                    }`}>
                      {score ? score.score : '-'}
                    </span>
                  </div>
                );
              })}
              <div className={`flex flex-col items-center p-3 rounded-lg border-2 ${scoreInterpretation.bg} border-opacity-50`}>
                <span className="text-xs font-semibold text-gray-800 mb-2">Total Score</span>
                <span className={`text-xl font-bold ${scoreInterpretation.color}`}>
                  {totalScore} / {maxScore}
                </span>
                <span className={`text-xs font-medium ${scoreInterpretation.color}`}>
                  {scoreInterpretation.label}
                </span>
              </div>
            </div>
            
            {/* FMS Interpretation Guide */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">FMS Score Interpretation</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Excellent: ≥17 points</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Good: 14-16 points</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Average: 11-13 points</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Poor: ≤10 points</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-full mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Assessment Workflow */}
          <div className="lg:col-span-1">
            <AssessmentWorkflow
              currentTest={currentTest}
              onTestChange={handleTestChange}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onReset={handleReset}
              isRecording={isRecording}
              hideRecordingControls={true}
            />
          </div>

          {/* Center Column - Camera/3D View */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Camera Viewer */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className={`${getCameraSizeClasses()} transition-all duration-300`}>
                  {activeView === '2d' ? (
                    <PoseDetection
                      onPoseResults={handlePoseResults}
                      onJointAngles={handleJointAngles}
                      isRecording={isRecording}
                      currentTest={currentTest.id}
                      annotations={annotations}
                      mirrorCamera={true}
                    />
                  ) : (
                    <ThreeDVisualization
                      landmarks={currentPose?.landmarks || []}
                      width={640}
                      height={480}
                    />
                  )}
                </div>
              </div>

              {/* Assessment Notes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Assessment Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                  rows={4}
                  placeholder="Add detailed assessment observations, movement quality notes, compensations observed, or any other relevant information..."
                />
                <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                  <span>Notes are automatically saved with your assessment</span>
                  <span>{notes.length} characters</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Joint Angles */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Joint Angles</h3>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {jointAngles.length > 0 ? (
                  jointAngles.map((angle, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        angle.normal 
                          ? 'bg-green-50 border-green-400 text-green-800' 
                          : 'bg-red-50 border-red-400 text-red-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{angle.name}</span>
                        <span className="text-sm font-bold">{angle.angle.toFixed(1)}°</span>
                      </div>
                      <div className="text-xs mt-1 opacity-75">
                        Target: {angle.targetThresholdDescription}
                      </div>
                      <div className="text-xs opacity-75">
                        {angle.normal ? 'Within normal range' : 'Outside normal range'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No joint data available</p>
                    <p className="text-xs">Start pose detection to see angles</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Assessment Metrics Table Modal */}
      <InfoModal
        isOpen={showMetricsTable}
        onClose={() => setShowMetricsTable(false)}
        title="Assessment Metrics Report"
      >
        <AssessmentMetricsTable
          metricResults={metricResults}
          testName={currentTest.name}
        />
      </InfoModal>
    </div>
  );
}

export default App;
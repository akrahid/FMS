import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Edit3, Save, Star, Info, AlertTriangle as Warning } from 'lucide-react';
import { AssessmentScore } from '../types/assessment';
import InfoModal from './InfoModal';

interface ScoreCardProps {
  testName: string;
  testId: string;
  automaticScore: number;
  onScoreChange: (score: AssessmentScore) => void;
  scoringCriteria: {
    score: number;
    description: string;
    criteria: string[];
  }[];
  assessmentScores: AssessmentScore[];
}

const ScoreCard: React.FC<ScoreCardProps> = ({
  testName,
  testId,
  automaticScore,
  onScoreChange,
  scoringCriteria,
  assessmentScores
}) => {
  const [manualScore, setManualScore] = useState<number>(automaticScore);
  const [isEditing, setIsEditing] = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [painReported, setPainReported] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Load existing score when test changes
  useEffect(() => {
    const existingScore = assessmentScores.find(s => s.testId === testId);
    if (existingScore) {
      setManualScore(existingScore.score);
      setPainReported(existingScore.painReported || false);
      setOverrideReason(existingScore.overrideReason || '');
    } else {
      setManualScore(automaticScore);
      setPainReported(false);
      setOverrideReason('');
    }
  }, [testId, assessmentScores, automaticScore]);

  const handleScoreUpdate = () => {
    const existingScore = assessmentScores.find(s => s.testId === testId);
    const isManualOverride = manualScore !== automaticScore;
    
    const score: AssessmentScore = {
      testId,
      score: painReported ? 0 : manualScore,
      automaticScore,
      manualOverride: isManualOverride,
      overrideReason: isManualOverride ? overrideReason : undefined,
      notes: '',
      timestamp: Date.now(),
      metricResults: [],
      painReported,
      auditTrail: {
        originalScore: automaticScore,
        changes: existingScore ? [
          ...existingScore.auditTrail.changes,
          {
            timestamp: Date.now(),
            from: existingScore.score,
            to: painReported ? 0 : manualScore,
            reason: painReported ? 'Pain reported' : overrideReason,
            clinicianId: 'current-user' // In real app, get from auth
          }
        ] : [{
          timestamp: Date.now(),
          from: automaticScore,
          to: painReported ? 0 : manualScore,
          reason: painReported ? 'Pain reported' : overrideReason,
          clinicianId: 'current-user'
        }]
      }
    };
    
    onScoreChange(score);
    setIsEditing(false);
  };

  const handlePainToggle = () => {
    setPainReported(!painReported);
    if (!painReported) {
      setManualScore(0);
      setOverrideReason('Pain reported during movement');
    } else {
      setManualScore(automaticScore);
      setOverrideReason('');
    }
  };

  const getScoreColor = (score: number) => {
    switch (score) {
      case 3: return 'text-green-700 bg-green-100 border-green-200';
      case 2: return 'text-blue-700 bg-blue-100 border-blue-200';
      case 1: return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 0: return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getScoreIcon = (score: number) => {
    switch (score) {
      case 3: return <Check className="w-4 h-4" />;
      case 2: return <Check className="w-4 h-4" />;
      case 1: return <AlertCircle className="w-4 h-4" />;
      case 0: return <X className="w-4 h-4" />;
      default: return null;
    }
  };

  const existingScore = assessmentScores.find(s => s.testId === testId);
  const hasManualOverride = existingScore?.manualOverride;

  return (
    <>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0 lg:space-x-6">
        {/* Test Info */}
        <div className="flex items-center space-x-3">
          <Star className="h-5 w-5 text-yellow-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{testName}</h3>
            <p className="text-sm text-gray-500">Current Assessment</p>
          </div>
        </div>

        {/* Scores */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-6">
          {/* AI Score */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-600">AI Analysis:</span>
            <div className={`px-3 py-1 rounded-lg border flex items-center space-x-2 ${getScoreColor(automaticScore)}`}>
              {getScoreIcon(automaticScore)}
              <span className="font-semibold">{automaticScore}</span>
            </div>
          </div>

          {/* Manual Score */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-600">Clinical Score:</span>
            {isEditing ? (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[0, 1, 2, 3].map((score) => (
                      <button
                        key={score}
                        onClick={() => {
                          setManualScore(score);
                          if (score === 0) {
                            setPainReported(true);
                            setOverrideReason('Pain reported during movement');
                          } else if (painReported) {
                            setPainReported(false);
                            setOverrideReason('');
                          }
                        }}
                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                          manualScore === score
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-300 hover:border-gray-400 text-gray-600'
                        }`}
                      >
                        <span className="text-sm font-semibold">{score}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleScoreUpdate}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center space-x-1"
                  >
                    <Save size={14} />
                    <span>Save</span>
                  </button>
                </div>
                
                {/* Pain Reporting */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="pain-reported"
                    checked={painReported}
                    onChange={handlePainToggle}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="pain-reported" className="text-sm text-red-600 font-medium">
                    Pain reported during movement
                  </label>
                </div>

                {/* Override Reason */}
                {manualScore !== automaticScore && !painReported && (
                  <input
                    type="text"
                    placeholder="Reason for manual override..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className={`px-3 py-1 rounded-lg border flex items-center space-x-2 ${getScoreColor(manualScore)}`}>
                  {getScoreIcon(manualScore)}
                  <span className="font-semibold">{manualScore}</span>
                  {hasManualOverride && (
                    <Warning className="w-3 h-3 text-orange-500" title="Manual override applied" />
                  )}
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Criteria Button */}
          <button
            onClick={() => setShowCriteriaModal(true)}
            className="flex items-center space-x-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
          >
            <Info size={14} />
            <span className="text-sm font-medium">Criteria</span>
          </button>
        </div>
      </div>

      {/* Override Indicator */}
      {hasManualOverride && existingScore && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2 text-orange-800">
            <Warning className="w-4 h-4" />
            <span className="text-sm font-medium">Manual Override Applied</span>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            Original AI Score: {existingScore.automaticScore} → Clinical Score: {existingScore.score}
          </p>
          {existingScore.overrideReason && (
            <p className="text-sm text-orange-600 mt-1">
              Reason: {existingScore.overrideReason}
            </p>
          )}
        </div>
      )}

      {/* Scoring Criteria Modal */}
      <InfoModal
        isOpen={showCriteriaModal}
        onClose={() => setShowCriteriaModal(false)}
        title="Clinical Scoring Criteria"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">{testName} - Cook & Burton Scoring Guidelines</h3>
          <div className="space-y-4">
            {scoringCriteria.map((criteria) => (
              <div
                key={criteria.score}
                className={`p-4 rounded-lg border-2 ${
                  manualScore === criteria.score
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2 mb-3">
                  {getScoreIcon(criteria.score)}
                  <span className="font-semibold text-lg">{criteria.score} - {criteria.description}</span>
                  {criteria.score === 0 && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      Pain Override
                    </span>
                  )}
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  {criteria.criteria.map((criterion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                      {criterion}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          {/* Clinical Notes */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Clinical Validation Notes</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Scores follow Cook & Burton's original FMS criteria</li>
              <li>• Pain during movement automatically scores 0</li>
              <li>• Manual overrides require clinical justification</li>
              <li>• All changes are logged in audit trail</li>
            </ul>
          </div>
        </div>
      </InfoModal>
    </>
  );
};

export default ScoreCard;
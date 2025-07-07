import React from 'react';
import { Check, X, AlertTriangle, TrendingUp, TrendingDown, Clock, Target, Activity } from 'lucide-react';
import { AssessmentMetricResult } from '../types/assessment';

interface AssessmentMetricsTableProps {
  metricResults: AssessmentMetricResult[];
  testName: string;
}

const AssessmentMetricsTable: React.FC<AssessmentMetricsTableProps> = ({
  metricResults,
  testName
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'angle': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'distance': return 'bg-green-50 text-green-700 border-green-200';
      case 'symmetry': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'alignment': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'stability': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (result: AssessmentMetricResult) => {
    if (result.pass) return <Check className="w-5 h-5 text-green-600" />;
    if (result.warning) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <X className="w-5 h-5 text-red-600" />;
  };

  const getStatusColor = (result: AssessmentMetricResult) => {
    if (result.pass) return 'text-green-600 bg-green-50 border-green-200';
    if (result.warning) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50';
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const criticalMetrics = metricResults.filter(m => m.isCritical);
  const nonCriticalMetrics = metricResults.filter(m => !m.isCritical);
  const passedCritical = criticalMetrics.filter(m => m.pass).length;
  const passedNonCritical = nonCriticalMetrics.filter(m => m.pass).length;
  const warningMetrics = metricResults.filter(m => m.warning).length;

  // Calculate average confidence
  const avgConfidence = metricResults.length > 0 ? 
    metricResults.reduce((sum, m) => sum + m.confidence, 0) / metricResults.length : 0;

  return (
    <div className="space-y-6">
      {/* Clinical Validation Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Clinical Validation Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{avgConfidence.toFixed(0)}%</div>
            <div className="text-sm text-blue-700">Avg Confidence</div>
            <div className={`text-xs px-2 py-1 rounded-full mt-1 ${getConfidenceColor(avgConfidence)}`}>
              {avgConfidence >= 90 ? 'Excellent' : avgConfidence >= 70 ? 'Good' : 'Poor'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{passedCritical}/{criticalMetrics.length}</div>
            <div className="text-sm text-green-700">Critical Pass</div>
            <div className="text-xs text-gray-500">≥90% required</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{warningMetrics}</div>
            <div className="text-sm text-yellow-700">Warnings</div>
            <div className="text-xs text-gray-500">Within tolerance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {((passedCritical + passedNonCritical) / metricResults.length * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-purple-700">Overall Pass</div>
            <div className="text-xs text-gray-500">Clinical standard</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical Metrics</p>
              <p className="text-2xl font-bold text-gray-900">
                {passedCritical}/{criticalMetrics.length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${
              passedCritical === criticalMetrics.length ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {passedCritical === criticalMetrics.length ? 
                <Check className="w-6 h-6 text-green-600" /> : 
                <X className="w-6 h-6 text-red-600" />
              }
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {((passedCritical / criticalMetrics.length) * 100).toFixed(0)}% pass rate
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Non-Critical</p>
              <p className="text-2xl font-bold text-gray-900">
                {passedNonCritical}/{nonCriticalMetrics.length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${
              passedNonCritical >= nonCriticalMetrics.length * 0.8 ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                passedNonCritical >= nonCriticalMetrics.length * 0.8 ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {((passedNonCritical / nonCriticalMetrics.length) * 100).toFixed(0)}% pass rate
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Measurement Quality</p>
              <p className="text-2xl font-bold text-gray-900">
                {metricResults.filter(m => m.confidence >= 70).length}/{metricResults.length}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${getConfidenceColor(avgConfidence)}`}>
              <Target className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            ±5° goniometer tolerance
          </p>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">{testName} - Clinical Assessment Metrics</h3>
          <p className="text-sm text-gray-600 mt-1">Comprehensive biomechanical analysis with clinical validation</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric & Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target Threshold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deviation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metricResults.map((metric, index) => (
                <tr key={metric.metricId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(metric.category)}`}>
                        {metric.category}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{metric.name}</span>
                          {metric.isCritical && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              Critical
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {metric.targetDescription}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-900">
                      {metric.actualValue}{metric.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor(metric)}`}>
                      {getStatusIcon(metric)}
                      <span className="text-sm font-medium">
                        {metric.pass ? 'Pass' : metric.warning ? 'Warning' : 'Fail'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {metric.deviation && metric.deviation > 0 ? (
                        <>
                          {metric.deviationDirection === '+' ? 
                            <TrendingUp className="w-4 h-4 text-red-500" /> : 
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          }
                          <span className={`text-sm font-medium ${
                            metric.pass ? 'text-green-600' : 
                            metric.warning ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {metric.deviationDirection}{metric.deviation}{metric.unit}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-green-600">0{metric.unit}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(metric.confidence)}`}>
                        {metric.confidence}%
                      </div>
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clinical Standards Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <Target className="w-4 h-4 mr-2" />
          Clinical Validation Standards
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-100 rounded border border-green-200"></div>
              <span className="text-gray-600">Pass: Meets clinical threshold</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-100 rounded border border-yellow-200"></div>
              <span className="text-gray-600">Warning: Within tolerance (±5°)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-100 rounded border border-red-200"></div>
              <span className="text-gray-600">Fail: Outside acceptable range</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-100 rounded"></div>
              <span className="text-gray-600">Angle measurements</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-100 rounded"></div>
              <span className="text-gray-600">Symmetry analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-100 rounded"></div>
              <span className="text-gray-600">Alignment assessment</span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Confidence Levels:</strong> Excellent (≥90%) | Good (70-89%) | Poor (&lt;70%) | 
            <strong> Goniometer Tolerance:</strong> ±5° for clinical validation
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentMetricsTable;
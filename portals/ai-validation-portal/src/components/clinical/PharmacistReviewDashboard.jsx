import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle, Flag, TrendingUp } from 'lucide-react';

// Mock API - Replace with actual API calls
const mockAPI = {
  getReviewQueue: async () => {
    return [
      {
        review_id: 'REV-20251014-abc123',
        prescription_id: 1,
        status: 'PENDING',
        priority: 'CRITICAL',
        created_at: '2025-10-14T10:30:00Z',
        validation_flags: [
          {
            flag_type: 'CRITICAL_MEDICATION',
            severity: 'SEVERE',
            description: 'Critical medication detected: Warfarin',
            requires_review: true,
            blocking: true
          },
          {
            flag_type: 'DRUG_INTERACTION',
            severity: 'SEVERE',
            description: 'Warfarin + Aspirin: Increased bleeding risk',
            requires_review: true,
            blocking: true
          }
        ],
        confidence_scores: { ocr_confidence: 0.92, nlp_confidence: 0.88 }
      },
      {
        review_id: 'REV-20251014-def456',
        prescription_id: 2,
        status: 'PENDING',
        priority: 'HIGH',
        created_at: '2025-10-14T11:15:00Z',
        validation_flags: [
          {
            flag_type: 'LOW_CONFIDENCE_OCR',
            severity: 'MODERATE',
            description: 'Low OCR confidence: 78%',
            requires_review: true,
            blocking: false
          }
        ],
        confidence_scores: { ocr_confidence: 0.78, nlp_confidence: 0.91 }
      },
      {
        review_id: 'REV-20251014-ghi789',
        prescription_id: 3,
        status: 'PENDING',
        priority: 'MEDIUM',
        created_at: '2025-10-14T12:00:00Z',
        validation_flags: [
          {
            flag_type: 'UNUSUAL_DOSAGE',
            severity: 'MODERATE',
            description: 'Unusual dosage for Metformin: 2000mg',
            requires_review: true,
            blocking: false
          }
        ],
        confidence_scores: { ocr_confidence: 0.95, nlp_confidence: 0.93 }
      }
    ];
  },
  getMyStats: async () => {
    return {
      total_reviews: 247,
      completed_today: 12,
      completed_this_week: 89,
      pending_assigned_to_me: 3,
      avg_review_time_minutes: 4.2,
      avg_accuracy_score: 0.96,
      approval_rate: 0.94
    };
  },
  getMetrics: async () => {
    return {
      total_reviews: 1247,
      completed_reviews: 1189,
      pending_reviews: 58,
      approval_rate: 0.94,
      avg_time_to_review_minutes: 4.5,
      avg_corrections: 1.2,
      avg_accuracy: 0.96,
      critical_reviews: 23,
      safety_alerts: 5
    };
  }
};

const PharmacistReviewDashboard = () => {
  const [activeTab, setActiveTab] = useState('queue');
  const [reviews, setReviews] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [queueData, statsData, metricsData] = await Promise.all([
        mockAPI.getReviewQueue(),
        mockAPI.getMyStats(),
        mockAPI.getMetrics()
      ]);
      setReviews(queueData);
      setMyStats(statsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'CRITICAL': 'bg-red-100 text-red-800 border-red-300',
      'HIGH': 'bg-orange-100 text-orange-800 border-orange-300',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'LOW': 'bg-blue-100 text-blue-800 border-blue-300',
      'ROUTINE': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[priority] || colors['ROUTINE'];
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'SEVERE' || severity === 'LIFE_THREATENING') {
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    } else if (severity === 'MODERATE') {
      return <Flag className="w-4 h-4 text-orange-600" />;
    }
    return <Flag className="w-4 h-4 text-yellow-600" />;
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 60000);
    
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hr ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Clinical Validation</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Pharmacist</p>
                <p className="text-sm font-medium text-gray-900">Dr. Sarah Johnson</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Stats Cards */}
      {myStats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Pending Reviews"
              value={myStats.pending_assigned_to_me}
              icon={<Clock className="w-6 h-6 text-orange-600" />}
              color="orange"
            />
            <StatCard
              title="Completed Today"
              value={myStats.completed_today}
              icon={<CheckCircle className="w-6 h-6 text-green-600" />}
              color="green"
            />
            <StatCard
              title="Avg Review Time"
              value={`${myStats.avg_review_time_minutes.toFixed(1)} min`}
              icon={<Clock className="w-6 h-6 text-blue-600" />}
              color="blue"
            />
            <StatCard
              title="Approval Rate"
              value={`${(myStats.approval_rate * 100).toFixed(0)}%`}
              icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
              color="purple"
            />
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <TabButton
                  active={activeTab === 'queue'}
                  onClick={() => setActiveTab('queue')}
                  label="Review Queue"
                  count={reviews.length}
                />
                <TabButton
                  active={activeTab === 'metrics'}
                  onClick={() => setActiveTab('metrics')}
                  label="Metrics"
                />
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'queue' && (
                <ReviewQueue
                  reviews={reviews}
                  onSelectReview={setSelectedReview}
                  selectedReview={selectedReview}
                />
              )}
              {activeTab === 'metrics' && metrics && (
                <MetricsView metrics={metrics} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onReload={loadData}
        />
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    orange: 'bg-orange-50 border-orange-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="opacity-80">{icon}</div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, label, count }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    {label}
    {count !== undefined && (
      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
        active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
      }`}>
        {count}
      </span>
    )}
  </button>
);

const ReviewQueue = ({ reviews, onSelectReview, selectedReview }) => {
  const getPriorityColor = (priority) => {
    const colors = {
      'CRITICAL': 'bg-red-100 text-red-800 border-red-300',
      'HIGH': 'bg-orange-100 text-orange-800 border-orange-300',
      'MEDIUM': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'LOW': 'bg-blue-100 text-blue-800 border-blue-300',
      'ROUTINE': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[priority] || colors['ROUTINE'];
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / 60000);
    
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hr ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Pending Reviews</h2>
        <div className="flex items-center space-x-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>All Priorities</option>
            <option>Critical Only</option>
            <option>High Priority</option>
          </select>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No pending reviews</p>
          <p className="text-sm text-gray-400 mt-2">Great work! All caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.review_id}
              onClick={() => onSelectReview(review)}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(review.priority)}`}>
                      {review.priority}
                    </span>
                    <span className="text-sm text-gray-500">
                      {review.review_id}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Created {formatTimeAgo(review.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    Prescription #{review.prescription_id}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    OCR: {(review.confidence_scores.ocr_confidence * 100).toFixed(0)}% | 
                    NLP: {(review.confidence_scores.nlp_confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {review.validation_flags && review.validation_flags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Validation Flags ({review.validation_flags.length}):
                  </p>
                  {review.validation_flags.slice(0, 2).map((flag, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-sm">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        flag.severity === 'SEVERE' ? 'text-red-600' : 'text-orange-600'
                      }`} />
                      <span className="text-gray-700">{flag.description}</span>
                    </div>
                  ))}
                  {review.validation_flags.length > 2 && (
                    <p className="text-xs text-gray-500 ml-6">
                      +{review.validation_flags.length - 2} more flags
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Review Prescription →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MetricsView = ({ metrics }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">System Metrics</h2>
      
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Reviews"
          value={metrics.total_reviews.toLocaleString()}
          subtitle={`${metrics.completed_reviews} completed`}
        />
        <MetricCard
          title="Approval Rate"
          value={`${(metrics.approval_rate * 100).toFixed(1)}%`}
          subtitle="Of completed reviews"
          trend="up"
        />
        <MetricCard
          title="Avg Review Time"
          value={`${metrics.avg_time_to_review_minutes.toFixed(1)} min`}
          subtitle="Per prescription"
        />
      </div>

      {/* Quality Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-md font-semibold text-gray-900 mb-4">Quality Metrics</h3>
        <div className="space-y-4">
          <MetricRow
            label="AI Accuracy"
            value={`${(metrics.avg_accuracy * 100).toFixed(1)}%`}
            description="Average accuracy of AI predictions"
            progress={metrics.avg_accuracy * 100}
          />
          <MetricRow
            label="Avg Corrections per Review"
            value={metrics.avg_corrections.toFixed(1)}
            description="Number of corrections made by pharmacists"
          />
          <MetricRow
            label="Critical Reviews"
            value={metrics.critical_reviews}
            description="High-priority reviews this period"
          />
          <MetricRow
            label="Safety Alerts"
            value={metrics.safety_alerts}
            description="Safety concerns flagged"
            highlight={metrics.safety_alerts > 0}
          />
        </div>
      </div>

      {/* Pending Reviews */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-md font-semibold text-blue-900">Pending Reviews</h3>
            <p className="text-sm text-blue-700 mt-1">
              {metrics.pending_reviews} prescriptions awaiting review
            </p>
          </div>
          <div className="text-3xl font-bold text-blue-900">
            {metrics.pending_reviews}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, trend }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <p className="text-sm text-gray-600 mb-1">{title}</p>
    <div className="flex items-baseline space-x-2">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {trend && (
        <TrendingUp className={`w-4 h-4 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
      )}
    </div>
    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

const MetricRow = ({ label, value, description, progress, highlight }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
    {description && <p className="text-xs text-gray-500">{description}</p>}
    {progress !== undefined && (
      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    )}
  </div>
);

const ReviewDetailModal = ({ review, onClose, onReload }) => {
  const [reviewStatus, setReviewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [showCorrections, setShowCorrections] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (status) => {
    setSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Submitting review:', { status, notes });
    alert(`Review ${status.toLowerCase()}! In production, this would update the database.`);
    setSubmitting(false);
    onReload();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review Prescription</h2>
            <p className="text-sm text-gray-500 mt-1">{review.review_id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Priority & Confidence */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Priority</p>
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded border ${
                review.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-300' :
                review.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                'bg-yellow-100 text-yellow-800 border-yellow-300'
              }`}>
                {review.priority}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Confidence Scores</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>OCR:</span>
                  <span className="font-medium">
                    {(review.confidence_scores.ocr_confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>NLP:</span>
                  <span className="font-medium">
                    {(review.confidence_scores.nlp_confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Flags */}
          {review.validation_flags && review.validation_flags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-900 mb-3 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Validation Flags ({review.validation_flags.length})
              </h3>
              <div className="space-y-3">
                {review.validation_flags.map((flag, idx) => (
                  <div key={idx} className="bg-white rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        {flag.flag_type.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        flag.severity === 'SEVERE' ? 'bg-red-100 text-red-700' :
                        flag.severity === 'MODERATE' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{flag.description}</p>
                    <p className="text-xs text-gray-600">
                      <strong>Recommendation:</strong> {flag.recommendation}
                    </p>
                    {flag.blocking && (
                      <div className="mt-2 text-xs text-red-700 font-medium">
                        ⚠️ Blocking issue - must be addressed before approval
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescription Image Placeholder */}
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">Prescription Image</p>
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg h-64 flex items-center justify-center">
              <p className="text-gray-400">Image would display here</p>
            </div>
          </div>

          {/* Extracted Data */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Extracted Data</h3>
              <button
                onClick={() => setShowCorrections(!showCorrections)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showCorrections ? 'View Original' : 'Make Corrections'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-600">Patient Name</label>
                <p className="font-medium text-gray-900">John Doe</p>
              </div>
              <div>
                <label className="text-gray-600">Date of Birth</label>
                <p className="font-medium text-gray-900">1975-05-15</p>
              </div>
              <div>
                <label className="text-gray-600">Medication</label>
                <p className="font-medium text-gray-900">Warfarin 5mg</p>
              </div>
              <div>
                <label className="text-gray-600">Frequency</label>
                <p className="font-medium text-gray-900">Once daily</p>
              </div>
            </div>
          </div>

          {/* Review Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any notes or observations about this prescription..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => handleSubmit('REJECTED')}
              disabled={submitting}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reject
            </button>
            <div className="flex space-x-3">
              <button
                onClick={() => handleSubmit('ESCALATED')}
                disabled={submitting}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Escalate
              </button>
              <button
                onClick={() => handleSubmit('APPROVED')}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacistReviewDashboard;
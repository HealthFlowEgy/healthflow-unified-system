import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  Clock,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'

const AuditTrail = () => {
  const [auditLogs, setAuditLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Mock audit data
  useEffect(() => {
    const mockAuditData = [
      {
        id: 1,
        timestamp: '2025-07-15T10:30:00Z',
        action: 'Prescription Uploaded',
        user: 'Dr. John Smith',
        prescriptionId: 'RX-2025071501',
        patient: 'Alice Johnson',
        status: 'success',
        details: 'Prescription successfully uploaded and processed via OCR',
        validationResults: {
          medications: 2,
          interactions: 0,
          alerts: 0
        }
      },
      {
        id: 2,
        timestamp: '2025-07-15T10:25:00Z',
        action: 'Drug Interaction Check',
        user: 'System',
        prescriptionId: 'RX-2025071502',
        patient: 'Bob Wilson',
        status: 'warning',
        details: 'Moderate drug interaction detected between Lisinopril and Ibuprofen',
        validationResults: {
          medications: 3,
          interactions: 1,
          alerts: 1
        }
      },
      {
        id: 3,
        timestamp: '2025-07-15T10:20:00Z',
        action: 'Prescription Validated',
        user: 'Dr. Sarah Davis',
        prescriptionId: 'RX-2025071503',
        patient: 'Charlie Brown',
        status: 'success',
        details: 'All medications validated successfully with no interactions',
        validationResults: {
          medications: 1,
          interactions: 0,
          alerts: 0
        }
      },
      {
        id: 4,
        timestamp: '2025-07-15T10:15:00Z',
        action: 'OCR Processing Failed',
        user: 'System',
        prescriptionId: 'RX-2025071504',
        patient: 'Diana Prince',
        status: 'error',
        details: 'Unable to extract text from uploaded image - poor image quality',
        validationResults: null
      },
      {
        id: 5,
        timestamp: '2025-07-15T10:10:00Z',
        action: 'Voice Prescription Processed',
        user: 'Dr. Michael Johnson',
        prescriptionId: 'RX-2025071505',
        patient: 'Edward Norton',
        status: 'success',
        details: 'Voice prescription successfully transcribed and validated',
        validationResults: {
          medications: 2,
          interactions: 0,
          alerts: 1
        }
      },
      {
        id: 6,
        timestamp: '2025-07-15T10:05:00Z',
        action: 'FHIR Data Import',
        user: 'System',
        prescriptionId: 'RX-2025071506',
        patient: 'Fiona Green',
        status: 'success',
        details: 'Prescription data imported from external FHIR server',
        validationResults: {
          medications: 4,
          interactions: 2,
          alerts: 2
        }
      }
    ]

    setTimeout(() => {
      setAuditLogs(mockAuditData)
      setFilteredLogs(mockAuditData)
      setIsLoading(false)
    }, 1000)
  }, [])

  // Filter and search functionality
  useEffect(() => {
    let filtered = auditLogs

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(log => log.status === filterStatus)
    }

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter(log => 
        log.timestamp.startsWith(filterDate)
      )
    }

    // Search functionality
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.prescriptionId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredLogs(filtered)
  }, [auditLogs, searchTerm, filterStatus, filterDate])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-500" />
      case 'error':
        return <XCircle size={16} className="text-red-500" />
      default:
        return <Clock size={16} className="text-gray-500" />
    }
  }

  const getStatusBadge = (status) => {
    const statusClasses = {
      success: 'status-reviewed',
      warning: 'status-pending',
      error: 'status-alert',
      pending: 'status-uploaded'
    }

    const statusLabels = {
      success: 'Success',
      warning: 'Warning',
      error: 'Error',
      pending: 'Pending'
    }

    return (
      <span className={statusClasses[status]}>
        {statusLabels[status]}
      </span>
    )
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    }
  }

  const exportAuditLog = () => {
    // Mock export functionality
    const csvContent = [
      ['Timestamp', 'Action', 'User', 'Prescription ID', 'Patient', 'Status', 'Details'],
      ...filteredLogs.map(log => [
        log.timestamp,
        log.action,
        log.user,
        log.prescriptionId,
        log.patient,
        log.status,
        log.details
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-healthflow-primary">Audit Trail & Logs</h1>
          <p className="text-gray-600 mt-1">Track all prescription validation activities and system events</p>
        </div>
        <button
          onClick={exportAuditLog}
          className="healthflow-button-secondary flex items-center"
        >
          <Download size={16} className="mr-2" />
          Export Log
        </button>
      </div>

      {/* Filters and Search */}
      <div className="healthflow-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="healthflow-input pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="healthflow-input pl-10 appearance-none"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="healthflow-input pl-10"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={() => window.location.reload()}
            className="healthflow-button-primary flex items-center justify-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="healthflow-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="healthflow-stat-number text-green-600">
                {auditLogs.filter(log => log.status === 'success').length}
              </div>
              <div className="healthflow-stat-label">Successful Operations</div>
            </div>
            <CheckCircle className="text-green-600" size={24} />
          </div>
        </div>

        <div className="healthflow-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="healthflow-stat-number text-amber-600">
                {auditLogs.filter(log => log.status === 'warning').length}
              </div>
              <div className="healthflow-stat-label">Warnings</div>
            </div>
            <AlertTriangle className="text-amber-600" size={24} />
          </div>
        </div>

        <div className="healthflow-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="healthflow-stat-number text-red-600">
                {auditLogs.filter(log => log.status === 'error').length}
              </div>
              <div className="healthflow-stat-label">Errors</div>
            </div>
            <XCircle className="text-red-600" size={24} />
          </div>
        </div>

        <div className="healthflow-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="healthflow-stat-number text-blue-600">{auditLogs.length}</div>
              <div className="healthflow-stat-label">Total Events</div>
            </div>
            <FileText className="text-blue-600" size={24} />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="healthflow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-healthflow-primary">Recent Activity</h2>
          <span className="text-sm text-gray-500">
            Showing {filteredLogs.length} of {auditLogs.length} events
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="healthflow-spinner mx-auto mb-4"></div>
            <p className="text-gray-500">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No audit logs found matching your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="healthflow-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Prescription ID</th>
                  <th>Patient</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const { date, time } = formatTimestamp(log.timestamp)
                  return (
                    <tr key={log.id}>
                      <td>
                        <div className="text-sm">
                          <div className="font-medium">{date}</div>
                          <div className="text-gray-500">{time}</div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center">
                          {getStatusIcon(log.status)}
                          <span className="ml-2 font-medium">{log.action}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center">
                          <User size={16} className="text-gray-400 mr-2" />
                          {log.user}
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {log.prescriptionId}
                        </span>
                      </td>
                      <td>{log.patient}</td>
                      <td>{getStatusBadge(log.status)}</td>
                      <td>
                        <button className="text-healthflow-primary hover:text-healthflow-secondary">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Log View Modal would go here */}
      {/* For now, we'll show a summary of validation results */}
      {filteredLogs.length > 0 && (
        <div className="healthflow-card p-6">
          <h2 className="text-xl font-semibold text-healthflow-primary mb-4">Validation Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Total Medications Processed</h3>
              <p className="text-2xl font-bold text-blue-600">
                {filteredLogs.reduce((sum, log) => 
                  sum + (log.validationResults?.medications || 0), 0
                )}
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-2">Drug Interactions Found</h3>
              <p className="text-2xl font-bold text-amber-600">
                {filteredLogs.reduce((sum, log) => 
                  sum + (log.validationResults?.interactions || 0), 0
                )}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-800 mb-2">Validation Alerts</h3>
              <p className="text-2xl font-bold text-red-600">
                {filteredLogs.reduce((sum, log) => 
                  sum + (log.validationResults?.alerts || 0), 0
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditTrail


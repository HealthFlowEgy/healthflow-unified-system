import { useState, useEffect } from 'react'
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Calendar,
  Users,
  Activity
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const Dashboard = () => {
  const [stats, setStats] = useState({
    newPrescriptions: 13,
    pendingValidation: 34,
    validationAlerts: 7,
    totalValidated: 217
  })

  const [recentPrescriptions, setRecentPrescriptions] = useState([
    { id: 1, date: '13 Jul 22', prescriber: 'Dr. Smith', patient: 'John Doe', status: 'uploaded' },
    { id: 2, date: '34 May', prescriber: 'Dr. Johnson', patient: 'Jane Smith', status: 'pending' },
    { id: 3, date: '34 May', prescriber: 'Dr. Brown', patient: 'Bob Wilson', status: 'reviewed' },
    { id: 4, date: '277 Oct', prescriber: 'Dr. Davis', patient: 'Alice Cooper', status: 'reviewed' },
  ])

  const [validationStats, setValidationStats] = useState([
    { name: 'Day', value: 45 },
    { name: 'Week', value: 120 },
    { name: 'Month', value: 280 }
  ])

  const [prescriptionTypes, setPrescriptionTypes] = useState([
    { name: 'Scanned', value: 60, color: '#1e3a8a' },
    { name: 'Voice', value: 25, color: '#d97706' },
    { name: 'E-Prescription', value: 15, color: '#059669' }
  ])

  const getStatusBadge = (status) => {
    const statusClasses = {
      uploaded: 'status-uploaded',
      pending: 'status-pending',
      reviewed: 'status-reviewed',
      alert: 'status-alert'
    }
    
    const statusLabels = {
      uploaded: 'Uploaded',
      pending: 'Pending',
      reviewed: 'Reviewed',
      alert: 'Alert'
    }

    return (
      <span className={statusClasses[status]}>
        {statusLabels[status]}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-healthflow-primary">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your prescriptions today.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="healthflow-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="healthflow-stat-number text-blue-600">{stats.newPrescriptions}</div>
              <div className="healthflow-stat-label">New Prescriptions</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="healthflow-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="healthflow-stat-number text-blue-800">{stats.pendingValidation}</div>
              <div className="healthflow-stat-label">Pending Validation</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="text-blue-800" size={24} />
            </div>
          </div>
        </div>

        <div className="healthflow-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="healthflow-stat-number text-amber-600">{stats.validationAlerts}</div>
              <div className="healthflow-stat-label">Validation Alerts</div>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
          </div>
        </div>

        <div className="healthflow-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="healthflow-stat-number text-blue-900">{stats.totalValidated}</div>
              <div className="healthflow-stat-label">Total Validated</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-blue-900" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Prescriptions */}
        <div className="lg:col-span-2 healthflow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-healthflow-primary">Recent Prescriptions</h2>
            <button className="text-healthflow-secondary hover:text-healthflow-accent font-medium text-sm">
              View All
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="healthflow-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Prescriber</th>
                  <th>Patient</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPrescriptions.map((prescription) => (
                  <tr key={prescription.id}>
                    <td className="font-medium">{prescription.date}</td>
                    <td>{prescription.prescriber}</td>
                    <td>{prescription.patient}</td>
                    <td>{getStatusBadge(prescription.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Validation Stats Chart */}
        <div className="healthflow-card p-6">
          <h2 className="text-xl font-semibold text-healthflow-primary mb-6">Validation Stats</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={validationStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prescription Types */}
        <div className="healthflow-card p-6">
          <h2 className="text-xl font-semibold text-healthflow-primary mb-6">Prescription Types</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={prescriptionTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {prescriptionTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-6 mt-4">
            {prescriptionTypes.map((type, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: type.color }}
                ></div>
                <span className="text-sm text-gray-600">{type.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="healthflow-card p-6">
          <h2 className="text-xl font-semibold text-healthflow-primary mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <button className="w-full healthflow-button-primary text-left flex items-center">
              <FileText size={20} className="mr-3" />
              Upload New Prescription
            </button>
            <button className="w-full healthflow-button-secondary text-left flex items-center">
              <Activity size={20} className="mr-3" />
              View Validation Reports
            </button>
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium text-left flex items-center transition-colors">
              <Users size={20} className="mr-3" />
              Manage Users
            </button>
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium text-left flex items-center transition-colors">
              <TrendingUp size={20} className="mr-3" />
              Analytics Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="healthflow-card p-6">
        <h2 className="text-xl font-semibold text-healthflow-primary mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-green-800">OCR Service</p>
              <p className="text-xs text-green-600">Operational</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-green-800">NLP Engine</p>
              <p className="text-xs text-green-600">Operational</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-green-800">Snowstorm API</p>
              <p className="text-xs text-green-600">Connected</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard


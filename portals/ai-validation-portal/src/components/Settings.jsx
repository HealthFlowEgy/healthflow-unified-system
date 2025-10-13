import { useState } from 'react'
import { 
  Save, 
  RefreshCw, 
  Shield, 
  Database, 
  Bell, 
  User, 
  Globe,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Settings as SettingsIcon
} from 'lucide-react'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    general: {
      systemName: 'HealthFlow AI Validation System',
      timezone: 'UTC-5',
      language: 'en',
      autoSave: true,
      debugMode: false
    },
    validation: {
      enableOCR: true,
      enableNLP: true,
      enableSnowstorm: true,
      strictValidation: false,
      autoApprove: false,
      confidenceThreshold: 85
    },
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      pushNotifications: true,
      alertThreshold: 'medium',
      dailyReports: true
    },
    security: {
      sessionTimeout: 30,
      requireMFA: false,
      passwordExpiry: 90,
      auditLogging: true,
      encryptData: true
    },
    api: {
      snowstormUrl: 'https://snowstorm.app.evidium.com',
      fhirEndpoint: '',
      apiTimeout: 30,
      retryAttempts: 3,
      enableCaching: true
    }
  })
  
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'validation', name: 'Validation', icon: CheckCircle },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'api', name: 'API Configuration', icon: Database }
  ]

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const testConnection = async (service) => {
    // Mock connection test
    alert(`Testing connection to ${service}...`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-healthflow-primary">Settings & Configuration</h1>
          <p className="text-gray-600 mt-1">Manage system settings and preferences</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.location.reload()}
            className="healthflow-button-secondary flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="healthflow-button-primary flex items-center disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="healthflow-spinner mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div className={`p-4 rounded-lg flex items-center ${
          saveStatus === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {saveStatus === 'success' ? (
            <CheckCircle size={20} className="mr-2" />
          ) : (
            <AlertTriangle size={20} className="mr-2" />
          )}
          {saveStatus === 'success' 
            ? 'Settings saved successfully!' 
            : 'Failed to save settings. Please try again.'
          }
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="healthflow-card p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-healthflow-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={16} className="mr-3" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="healthflow-card p-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-healthflow-primary">General Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Name
                    </label>
                    <input
                      type="text"
                      value={settings.general.systemName}
                      onChange={(e) => handleSettingChange('general', 'systemName', e.target.value)}
                      className="healthflow-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.general.timezone}
                      onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                      className="healthflow-input"
                    >
                      <option value="UTC-5">UTC-5 (Eastern)</option>
                      <option value="UTC-6">UTC-6 (Central)</option>
                      <option value="UTC-7">UTC-7 (Mountain)</option>
                      <option value="UTC-8">UTC-8 (Pacific)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={settings.general.language}
                      onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                      className="healthflow-input"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Auto-save Changes</h3>
                      <p className="text-sm text-gray-500">Automatically save changes as you make them</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.general.autoSave}
                        onChange={(e) => handleSettingChange('general', 'autoSave', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-healthflow-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Debug Mode</h3>
                      <p className="text-sm text-gray-500">Enable detailed logging for troubleshooting</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.general.debugMode}
                        onChange={(e) => handleSettingChange('general', 'debugMode', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-healthflow-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Settings */}
            {activeTab === 'validation' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-healthflow-primary">Validation Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Enable OCR Processing</h3>
                      <p className="text-sm text-gray-500">Process scanned prescription images</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.validation.enableOCR}
                        onChange={(e) => handleSettingChange('validation', 'enableOCR', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-healthflow-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Enable NLP Processing</h3>
                      <p className="text-sm text-gray-500">Extract medication information using natural language processing</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.validation.enableNLP}
                        onChange={(e) => handleSettingChange('validation', 'enableNLP', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-healthflow-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Enable Snowstorm Integration</h3>
                      <p className="text-sm text-gray-500">Use SNOMED CT for drug interaction checking</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.validation.enableSnowstorm}
                        onChange={(e) => handleSettingChange('validation', 'enableSnowstorm', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-healthflow-primary"></div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confidence Threshold ({settings.validation.confidenceThreshold}%)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={settings.validation.confidenceThreshold}
                    onChange={(e) => handleSettingChange('validation', 'confidenceThreshold', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}

            {/* API Configuration */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-healthflow-primary">API Configuration</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Snowstorm Server URL
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        value={settings.api.snowstormUrl}
                        onChange={(e) => handleSettingChange('api', 'snowstormUrl', e.target.value)}
                        className="healthflow-input flex-1"
                        placeholder="https://snowstorm.app.evidium.com"
                      />
                      <button
                        onClick={() => testConnection('Snowstorm')}
                        className="healthflow-button-secondary"
                      >
                        Test
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FHIR Endpoint (Optional)
                    </label>
                    <input
                      type="url"
                      value={settings.api.fhirEndpoint}
                      onChange={(e) => handleSettingChange('api', 'fhirEndpoint', e.target.value)}
                      className="healthflow-input"
                      placeholder="https://your-fhir-server.com/fhir"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={settings.api.apiTimeout}
                        onChange={(e) => handleSettingChange('api', 'apiTimeout', parseInt(e.target.value))}
                        className="healthflow-input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Retry Attempts
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={settings.api.retryAttempts}
                        onChange={(e) => handleSettingChange('api', 'retryAttempts', parseInt(e.target.value))}
                        className="healthflow-input"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">Enable API Response Caching</h3>
                      <p className="text-sm text-gray-500">Cache API responses to improve performance</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.api.enableCaching}
                        onChange={(e) => handleSettingChange('api', 'enableCaching', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-healthflow-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs would be implemented similarly */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-healthflow-primary">Notification Settings</h2>
                <p className="text-gray-600">Configure how you receive alerts and notifications.</p>
                {/* Notification settings would go here */}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-healthflow-primary">Security Settings</h2>
                <p className="text-gray-600">Manage security and access control settings.</p>
                {/* Security settings would go here */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings


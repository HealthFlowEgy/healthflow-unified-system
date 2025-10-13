import { useState, useRef } from 'react'
import { 
  Upload, 
  Camera, 
  Mic, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  X,
  Eye,
  Download,
  Loader
} from 'lucide-react'

const UploadPrescription = () => {
  const [uploadMethod, setUploadMethod] = useState('scan')
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationResults, setValidationResults] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const fileInputRef = useRef(null)

  const uploadMethods = [
    {
      id: 'scan',
      title: 'Upload Scan',
      subtitle: 'Handwritten or preprinted prescription',
      icon: Upload,
      description: 'Upload images of prescription documents (PNG, JPG, PDF)'
    },
    {
      id: 'voice',
      title: 'Upload Voice File',
      subtitle: 'Real or Local voice prescription',
      icon: Mic,
      description: 'Record or upload audio files of spoken prescriptions'
    },
    {
      id: 'fhir',
      title: 'FHIR API',
      subtitle: 'Electronic data/electronic prescription',
      icon: FileText,
      description: 'Import prescription data via FHIR API integration'
    }
  ]

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files)
    setFiles(prev => [...prev, ...selectedFiles])
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const droppedFiles = Array.from(event.dataTransfer.files)
    setFiles(prev => [...prev, ...droppedFiles])
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0 && uploadMethod !== 'fhir') return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Simulate API call to backend
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock validation results
      setValidationResults({
        status: 'success',
        prescriptionId: 'RX-' + Date.now(),
        extractedData: {
          patientName: 'John Doe',
          medications: [
            { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
            { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' }
          ],
          prescriber: 'Dr. Smith',
          date: new Date().toLocaleDateString()
        },
        validationIssues: [
          {
            type: 'warning',
            message: 'Drug interaction detected between Lisinopril and NSAIDs',
            severity: 'moderate'
          }
        ]
      })

    } catch (error) {
      setValidationResults({
        status: 'error',
        message: 'Failed to process prescription. Please try again.'
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const startRecording = () => {
    setIsRecording(true)
    // Simulate recording
    setTimeout(() => {
      setIsRecording(false)
      setFiles(prev => [...prev, { name: 'voice-recording.wav', type: 'audio/wav', size: 1024000 }])
    }, 3000)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-healthflow-primary">Upload Prescription</h1>
        <p className="text-gray-600 mt-1">Choose your preferred method to upload and validate prescriptions</p>
      </div>

      {/* Upload Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {uploadMethods.map((method) => {
          const Icon = method.icon
          return (
            <button
              key={method.id}
              onClick={() => setUploadMethod(method.id)}
              className={`healthflow-card p-6 text-left transition-all duration-200 ${
                uploadMethod === method.id 
                  ? 'ring-2 ring-healthflow-primary bg-blue-50' 
                  : 'hover:shadow-lg'
              }`}
            >
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  uploadMethod === method.id 
                    ? 'bg-healthflow-primary text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Icon size={24} />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{method.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{method.subtitle}</p>
              <p className="text-xs text-gray-500">{method.description}</p>
            </button>
          )
        })}
      </div>

      {/* Upload Area */}
      <div className="healthflow-card p-6">
        {uploadMethod === 'scan' && (
          <div>
            <h2 className="text-xl font-semibold text-healthflow-primary mb-4">Upload Prescription Images</h2>
            <div
              className="healthflow-upload-area"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports PNG, JPG, PDF files up to 10MB each
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        )}

        {uploadMethod === 'voice' && (
          <div>
            <h2 className="text-xl font-semibold text-healthflow-primary mb-4">Voice Prescription Upload</h2>
            <div className="text-center py-12">
              <div className="mb-6">
                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
                  isRecording ? 'bg-red-100 animate-pulse' : 'bg-gray-100'
                }`}>
                  <Mic size={32} className={isRecording ? 'text-red-600' : 'text-gray-600'} />
                </div>
              </div>
              {!isRecording ? (
                <div>
                  <button
                    onClick={startRecording}
                    className="healthflow-button-primary mb-4"
                  >
                    Start Recording
                  </button>
                  <p className="text-sm text-gray-500 mb-4">Or upload an existing audio file</p>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="healthflow-button-secondary"
                  >
                    Upload Audio File
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-red-600 mb-2">Recording...</p>
                  <p className="text-sm text-gray-500">Speak clearly and mention all prescription details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {uploadMethod === 'fhir' && (
          <div>
            <h2 className="text-xl font-semibold text-healthflow-primary mb-4">FHIR API Integration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FHIR Server Endpoint
                </label>
                <input
                  type="url"
                  className="healthflow-input"
                  placeholder="https://your-fhir-server.com/fhir"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prescription ID
                </label>
                <input
                  type="text"
                  className="healthflow-input"
                  placeholder="Enter prescription ID or resource reference"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Token (Optional)
                </label>
                <input
                  type="password"
                  className="healthflow-input"
                  placeholder="Bearer token for authenticated requests"
                />
              </div>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Files</h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText size={20} className="text-gray-500 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size || 0)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading and processing...</span>
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-healthflow-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={isUploading || (files.length === 0 && uploadMethod !== 'fhir')}
            className="healthflow-button-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isUploading ? (
              <>
                <Loader className="animate-spin mr-2" size={16} />
                Processing...
              </>
            ) : (
              <>
                <Upload size={16} className="mr-2" />
                Upload & Validate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Validation Results */}
      {validationResults && (
        <div className="healthflow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-healthflow-primary">Validation Results</h2>
            {validationResults.status === 'success' && (
              <div className="flex items-center text-green-600">
                <CheckCircle size={20} className="mr-2" />
                <span className="font-medium">Validation Complete</span>
              </div>
            )}
          </div>

          {validationResults.status === 'success' ? (
            <div className="space-y-6">
              {/* Prescription Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Prescription ID: {validationResults.prescriptionId}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Patient:</span> {validationResults.extractedData.patientName}
                  </div>
                  <div>
                    <span className="font-medium">Prescriber:</span> {validationResults.extractedData.prescriber}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {validationResults.extractedData.date}
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Extracted Medications</h3>
                <div className="space-y-2">
                  {validationResults.extractedData.medications.map((med, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{med.name}</p>
                        <p className="text-sm text-gray-600">{med.dosage} - {med.frequency}</p>
                      </div>
                      <CheckCircle size={20} className="text-green-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Validation Issues */}
              {validationResults.validationIssues.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Validation Alerts</h3>
                  <div className="space-y-2">
                    {validationResults.validationIssues.map((issue, index) => (
                      <div key={index} className="flex items-start p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle size={20} className="text-amber-600 mr-3 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">{issue.type.toUpperCase()}</p>
                          <p className="text-sm text-amber-700">{issue.message}</p>
                          <p className="text-xs text-amber-600 mt-1">Severity: {issue.severity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-4">
                <button className="healthflow-button-primary flex items-center">
                  <Eye size={16} className="mr-2" />
                  View Full Report
                </button>
                <button className="healthflow-button-secondary flex items-center">
                  <Download size={16} className="mr-2" />
                  Download Report
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-red-600 mb-2">Validation Failed</p>
              <p className="text-gray-600">{validationResults.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default UploadPrescription


# HealthFlow API Documentation

## Overview

This document provides comprehensive documentation for all HealthFlow API endpoints across all services.

## Base URL

```
Production: https://api.healthflow.eg
Development: http://localhost:8000
```

## Authentication

All API requests require authentication using JWT tokens.

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

## Services

### 1. Authentication Service (Port 4001)

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "patient"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "token": "jwt-token"
  }
}
```

#### POST /api/auth/login
Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "patient"
    }
  }
}
```

### 2. Patient Service (Port 4006)

#### GET /api/patients
List all patients with pagination and filtering.

**Query Parameters:**
- `limit` (number): Number of results per page (default: 10)
- `offset` (number): Offset for pagination (default: 0)
- `search` (string): Search by name or email
- `status` (string): Filter by status (active, inactive)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "dateOfBirth": "1990-01-01",
      "gender": "male",
      "phone": "+201234567890",
      "status": "active"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
```

#### POST /api/patients
Create a new patient record.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "phone": "+201234567890",
  "address": "123 Main St, Cairo, Egypt",
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "+201234567891",
    "relationship": "spouse"
  }
}
```

#### GET /api/patients/:id
Get patient details by ID.

#### PUT /api/patients/:id
Update patient information.

#### DELETE /api/patients/:id
Delete patient record.

#### POST /api/patients/:id/allergies
Add patient allergy.

**Request Body:**
```json
{
  "allergen": "Penicillin",
  "severity": "high",
  "reaction": "Anaphylaxis",
  "diagnosedDate": "2015-06-15"
}
```

#### POST /api/patients/:id/medical-history
Add medical history entry.

**Request Body:**
```json
{
  "condition": "Hypertension",
  "diagnosedDate": "2020-01-01",
  "status": "active",
  "notes": "Controlled with medication"
}
```

#### POST /api/patients/:id/vital-signs
Record vital signs.

**Request Body:**
```json
{
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "heartRate": 72,
  "temperature": 36.6,
  "weight": 70.5,
  "height": 175,
  "recordedAt": "2025-10-13T10:00:00Z"
}
```

### 3. Doctor Service (Port 4007)

#### GET /api/doctors
List all doctors with pagination and filtering.

**Query Parameters:**
- `limit` (number): Number of results per page
- `offset` (number): Offset for pagination
- `specialization` (string): Filter by specialization
- `status` (string): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "dr.smith@healthflow.eg",
      "specialization": "Cardiology",
      "licenseNumber": "LIC123456",
      "phone": "+201234567890",
      "status": "active"
    }
  ]
}
```

#### POST /api/doctors
Create new doctor profile.

#### GET /api/doctors/:id
Get doctor details.

#### PUT /api/doctors/:id
Update doctor information.

#### GET /api/doctors/:id/statistics
Get doctor performance statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAppointments": 150,
    "totalPrescriptions": 120,
    "averageRating": 4.8,
    "totalPatients": 85
  }
}
```

#### POST /api/doctors/:id/licenses
Add medical license.

**Request Body:**
```json
{
  "licenseNumber": "LIC123456",
  "issuingAuthority": "Egyptian Medical Syndicate",
  "issueDate": "2020-01-01",
  "expiryDate": "2025-01-01",
  "type": "medical_practice"
}
```

#### POST /api/doctors/:id/templates
Create prescription template.

**Request Body:**
```json
{
  "name": "Hypertension Follow-up",
  "diagnosis": "Hypertension",
  "medications": [
    {
      "name": "Amlodipine",
      "dosage": "5mg",
      "frequency": "Once daily",
      "duration": "30 days"
    }
  ],
  "instructions": "Take in the morning with food"
}
```

### 4. Appointment Service (Port 4008)

#### GET /api/appointments
List appointments with filtering.

**Query Parameters:**
- `doctorId` (string): Filter by doctor
- `patientId` (string): Filter by patient
- `status` (string): Filter by status (scheduled, completed, cancelled)
- `startDate` (string): Filter by start date
- `endDate` (string): Filter by end date

#### POST /api/appointments
Create new appointment.

**Request Body:**
```json
{
  "doctorId": "uuid",
  "patientId": "uuid",
  "appointmentDate": "2025-10-20",
  "appointmentTime": "10:00",
  "type": "consultation",
  "reason": "Regular checkup",
  "notes": "Patient requests blood pressure check"
}
```

#### GET /api/appointments/upcoming
Get upcoming appointments.

#### POST /api/appointments/:id/cancel
Cancel appointment.

**Request Body:**
```json
{
  "reason": "Patient request"
}
```

#### POST /api/appointments/:id/complete
Mark appointment as completed.

**Request Body:**
```json
{
  "notes": "Appointment completed successfully"
}
```

### 5. Notification Service (Port 4009)

#### POST /api/notifications
Send notification.

**Request Body:**
```json
{
  "type": "email",
  "recipient": "user@example.com",
  "subject": "Appointment Reminder",
  "message": "Your appointment is tomorrow at 10:00 AM"
}
```

#### POST /api/notifications/send-from-template
Send notification from template.

**Request Body:**
```json
{
  "type": "email",
  "templateId": "appointment_confirmation",
  "recipient": "user@example.com",
  "data": {
    "patientName": "John Doe",
    "appointmentDate": "2025-10-20",
    "appointmentTime": "10:00 AM",
    "doctorName": "Dr. Smith"
  }
}
```

#### GET /api/notifications/templates
List all notification templates.

### 6. File Service (Port 4010)

#### POST /api/files/upload
Upload file.

**Request:**
- Content-Type: multipart/form-data
- Body: file (binary)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "document.pdf",
    "url": "https://storage.healthflow.eg/files/uuid",
    "size": 1024000,
    "mimeType": "application/pdf"
  }
}
```

#### GET /api/files/:id/download
Download file.

#### POST /api/files/:id/share
Share file with user.

**Request Body:**
```json
{
  "userId": "uuid",
  "permission": "read"
}
```

### 7. User Management Service (Port 4011)

#### GET /api/user-management/users
List all users.

#### POST /api/user-management/users
Create new user.

#### GET /api/user-management/roles
List all roles.

#### POST /api/user-management/roles
Create new role.

#### GET /api/user-management/activity
Get user activity logs.

### 8. BI Dashboard Service (Port 4012)

#### GET /api/bi-dashboard/analytics/metrics
Get system metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1000,
    "totalPrescriptions": 5000,
    "totalAppointments": 3000,
    "activeUsers": 750
  }
}
```

#### GET /api/bi-dashboard/analytics/trends/prescriptions
Get prescription trends.

**Query Parameters:**
- `period` (string): Time period (7d, 30d, 90d, 1y)

#### POST /api/bi-dashboard/reports/:id/execute
Execute report.

**Request Body:**
```json
{
  "format": "pdf",
  "parameters": {}
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Invalid or missing authentication token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

API requests are rate-limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated requests

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `limit`: Number of results (default: 10, max: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

## Webhooks

HealthFlow supports webhooks for real-time event notifications.

### Supported Events

- `appointment.created`
- `appointment.updated`
- `appointment.cancelled`
- `prescription.created`
- `prescription.dispensed`
- `user.registered`

### Webhook Payload

```json
{
  "event": "appointment.created",
  "timestamp": "2025-10-13T10:00:00Z",
  "data": {
    "id": "uuid",
    "doctorId": "uuid",
    "patientId": "uuid",
    "appointmentDate": "2025-10-20"
  }
}
```

## SDK Support

Official SDKs available for:
- JavaScript/TypeScript
- Python
- PHP
- Java

## Support

For API support, contact: api-support@healthflow.eg

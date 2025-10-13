// File: frontend/regulatory-portal/src/types/adverseEvent.types.ts
// Purpose: TypeScript types for adverse event reporting

export interface AdverseEvent {
  id: string;
  reportNumber: string;
  medicineId: string;
  medicineName?: string;
  batchNumber?: string;
  patientAge?: number;
  patientGender?: 'male' | 'female' | 'other';
  patientWeight?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening' | 'fatal';
  eventDate: string;
  description: string;
  symptoms?: string[];
  outcome?: string;
  hospitalizationRequired?: boolean;
  hospitalizationDays?: number;
  medicalHistory?: string;
  concomitantMedications?: string;
  allergies?: string;
  reporterType: 'doctor' | 'pharmacist' | 'patient' | 'other';
  reporterName: string;
  reporterEmail?: string;
  reporterPhone?: string;
  reporterFacility?: string;
  status: 'submitted' | 'under_review' | 'investigated' | 'closed';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  actionTaken?: 'none' | 'label_update' | 'recall' | 'investigation';
  followUpRequired?: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdverseEventFormData {
  medicineId: string;
  batchNumber?: string;
  patientAge?: number;
  patientGender?: 'male' | 'female' | 'other';
  patientWeight?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening' | 'fatal';
  eventDate: string;
  description: string;
  symptoms?: string[];
  outcome?: string;
  hospitalizationRequired?: boolean;
  hospitalizationDays?: number;
  medicalHistory?: string;
  concomitantMedications?: string;
  allergies?: string;
  reporterType: 'doctor' | 'pharmacist' | 'patient' | 'other';
  reporterName: string;
  reporterEmail?: string;
  reporterPhone?: string;
  reporterFacility?: string;
}

export interface AdverseEventStatistics {
  totalEvents: number;
  bySeverity: {
    mild: number;
    moderate: number;
    severe: number;
    life_threatening: number;
    fatal: number;
  };
  byStatus: {
    submitted: number;
    under_review: number;
    investigated: number;
    closed: number;
  };
}


// File: frontend/regulatory-portal/src/types/recall.types.ts
// Purpose: TypeScript types for recall management

export interface Recall {
  id: string;
  recallNumber: string;
  medicineId: string;
  medicineName?: string;
  severity: 'class_1' | 'class_2' | 'class_3';
  reason: string;
  description: string;
  batchNumbers: string[];
  affectedQuantity?: number;
  recallDate: string;
  deadline?: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'cancelled';
  actionRequired: string;
  returnInstructions?: string;
  distributionLevel: 'national' | 'regional' | 'facility_specific';
  affectedFacilities?: string[];
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  initiatedBy: string;
  completedBy?: string;
  completedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  documents?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecallFormData {
  medicineId: string;
  severity: 'class_1' | 'class_2' | 'class_3';
  reason: string;
  description: string;
  batchNumbers: string[];
  affectedQuantity?: number;
  recallDate: string;
  deadline?: string;
  actionRequired: string;
  returnInstructions?: string;
  distributionLevel: 'national' | 'regional' | 'facility_specific';
  affectedFacilities?: string[];
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface RecallStatistics {
  totalRecalls: number;
  activeRecalls: number;
  completedRecalls: number;
  bySeverity: {
    class1: number;
    class2: number;
    class3: number;
  };
}


// File: frontend/regulatory-portal/src/types/medicine.types.ts
// Purpose: Type definitions for medicines

export interface Medicine {
  id?: string;
  tradeName: string;
  genericName: string;
  edaRegistrationNumber: string;
  manufacturer?: string;
  strength?: string;
  dosageForm?: string;
  therapeuticClass?: string;
  drugClass?: string;
  atcCode?: string;
  registrationDate: Date | string;
  expiryDate: Date | string;
  status?: 'active' | 'partial_disabled' | 'permanently_disabled' | 'recalled';
  availableForPrescription?: boolean;
  availableForDispensing?: boolean;
  prescriptionRequired?: boolean;
  controlledSubstance?: boolean;
  scheduleClass?: string;
  disableReason?: string;
  disabledAt?: Date | string;
  recallInfo?: any;
  packagingSizes?: string[];
  storageConditions?: string;
  warnings?: string[];
  interactions?: string[];
  sideEffects?: string[];
  priceMin?: number;
  priceMax?: number;
  createdBy?: string;
  lastModifiedBy?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MedicineSearchParams {
  query?: string;
  status?: string;
  therapeuticClass?: string;
  prescriptionRequired?: boolean;
  page?: number;
  limit?: number;
}

export interface MedicineSearchResponse {
  success: boolean;
  data: Medicine[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

export interface BulkUploadResult {
  success: number;
  failed: number;
  errors: Array<{
    medicine: string;
    error: string;
  }>;
}


// Sprint 2 - Pharmacy Context Provider
// ------------------------------------------------------------------------------

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { pharmacyApi } from '../services/api';
import { useAuth } from './AuthContext';

interface Pharmacy {
  id: string;
  pharmacyName: string;
  licenseNumber: string;
  address: string;
  city: string;
  phone: string;
  status: string;
}

interface PharmacyContextType {
  pharmacies: Pharmacy[];
  currentPharmacy: Pharmacy | null;
  loading: boolean;
  setCurrentPharmacy: (pharmacy: Pharmacy) => void;
  refreshPharmacies: () => Promise<void>;
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

export const PharmacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [currentPharmacy, setCurrentPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadPharmacies();
    }
  }, [isAuthenticated]);

  const loadPharmacies = async () => {
    try {
      setLoading(true);
      const response = await pharmacyApi.listPharmacies();
      const userPharmacies = response.data.items;
      
      setPharmacies(userPharmacies);
      
      // Set first pharmacy as current if not already set
      if (userPharmacies.length > 0 && !currentPharmacy) {
        const savedPharmacyId = localStorage.getItem('currentPharmacyId');
        const pharmacy = savedPharmacyId
          ? userPharmacies.find((p: Pharmacy) => p.id === savedPharmacyId)
          : userPharmacies[0];
        
        setCurrentPharmacy(pharmacy || userPharmacies[0]);
      }
    } catch (error) {
      console.error('Failed to load pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentPharmacy = (pharmacy: Pharmacy) => {
    setCurrentPharmacy(pharmacy);
    localStorage.setItem('currentPharmacyId', pharmacy.id);
  };

  const refreshPharmacies = async () => {
    await loadPharmacies();
  };

  return (
    <PharmacyContext.Provider
      value={{
        pharmacies,
        currentPharmacy,
        loading,
        setCurrentPharmacy: handleSetCurrentPharmacy,
        refreshPharmacies,
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy must be used within PharmacyProvider');
  }
  return context;
};

// ------------------------------------------------------------------------------
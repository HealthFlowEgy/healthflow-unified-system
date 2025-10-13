// Sprint 3 - Custom Hook for Offline Data Management
// ------------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineStorage } from '../services/offlineStorage';

interface UseOfflineDataOptions {
  fetchOnline: () => Promise<any>;
  getCached: () => Promise<any>;
  cacheData: (data: any) => Promise<void>;
}

export const useOfflineData = <T>({
  fetchOnline,
  getCached,
  cacheData,
}: UseOfflineDataOptions) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    loadData();

    // Setup network listener
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
      
      if (state.isConnected && !data) {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check network status
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        // Online: Fetch from API
        try {
          const onlineData = await fetchOnline();
          setData(onlineData);
          
          // Cache the data
          await cacheData(onlineData);
        } catch (err) {
          // If online fetch fails, try cache
          console.error('Online fetch failed, trying cache:', err);
          const cachedData = await getCached();
          if (cachedData) {
            setData(cachedData);
            setIsOffline(true);
          } else {
            throw err;
          }
        }
      } else {
        // Offline: Use cached data
        const cachedData = await getCached();
        if (cachedData) {
          setData(cachedData);
          setIsOffline(true);
        } else {
          throw new Error('No cached data available');
        }
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadData();
  };

  return {
    data,
    loading,
    error,
    isOffline,
    refresh,
  };
};
</artifact>

Perfect! Now let me continue with more screens and offline functionality:

<artifact identifier="sprint3-inventory-offline-screens" type="application/vnd.ant.code" language="typescript" title="Inventory Screen and Offline Features">
// Sprint 3 - Offline Storage Service with SQLite
// ------------------------------------------------------------------------------

import SQLite from 'react-native-sqlite-storage';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

SQLite.enablePromise(true);

interface SyncQueue {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineStorageService {
  private db: SQLite.SQLiteDatabase | null = null;
  private syncQueue: SyncQueue[] = [];
  private isSyncing = false;

  async initialize() {
    try {
      this.db = await SQLite.openDatabase({
        name: 'healthflow.db',
        location: 'default',
      });

      await this.createTables();
      await this.loadSyncQueue();
      this.setupNetworkListener();
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  private async createTables() {
    if (!this.db) return;

    const tables = [
      // Prescriptions cache
      `CREATE TABLE IF NOT EXISTS prescriptions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        last_updated INTEGER NOT NULL,
        synced INTEGER DEFAULT 1
      )`,

      // Medicines cache
      `CREATE TABLE IF NOT EXISTS medicines (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        last_updated INTEGER NOT NULL
      )`,

      // Inventory cache
      `CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        pharmacy_id TEXT NOT NULL,
        data TEXT NOT NULL,
        last_updated INTEGER NOT NULL,
        synced INTEGER DEFAULT 1
      )`,

      // Sync queue
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        entity TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retries INTEGER DEFAULT 0
      )`,

      // Draft prescriptions (offline creation)
      `CREATE TABLE IF NOT EXISTS draft_prescriptions (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
    ];

    for (const table of tables) {
      await this.db.executeSql(table);
    }
  }

  private async loadSyncQueue() {
    if (!this.db) return;

    try {
      const [results] = await this.db.executeSql(
        'SELECT * FROM sync_queue ORDER BY timestamp ASC'
      );

      this.syncQueue = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        this.syncQueue.push({
          id: row.id,
          type: row.type,
          entity: row.entity,
          data: JSON.parse(row.data),
          timestamp: row.timestamp,
          retries: row.retries,
        });
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isSyncing) {
        this.processSyncQueue();
      }
    });
  }

  // Cache prescription
  async cachePrescription(prescriptionId: string, data: any) {
    if (!this.db) return;

    try {
      await this.db.executeSql(
        `INSERT OR REPLACE INTO prescriptions (id, data, last_updated, synced)
         VALUES (?, ?, ?, ?)`,
        [prescriptionId, JSON.stringify(data), Date.now(), 1]
      );
    } catch (error) {
      console.error('Failed to cache prescription:', error);
    }
  }

  // Get cached prescription
  async getCachedPrescription(prescriptionId: string): Promise<any | null> {
    if (!this.db) return null;

    try {
      const [results] = await this.db.executeSql(
        'SELECT data FROM prescriptions WHERE id = ?',
        [prescriptionId]
      );

      if (results.rows.length > 0) {
        return JSON.parse(results.rows.item(0).data);
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached prescription:', error);
      return null;
    }
  }

  // Get all cached prescriptions
  async getAllCachedPrescriptions(): Promise<any[]> {
    if (!this.db) return [];

    try {
      const [results] = await this.db.executeSql(
        'SELECT data FROM prescriptions ORDER BY last_updated DESC'
      );

      const prescriptions = [];
      for (let i = 0; i < results.rows.length; i++) {
        prescriptions.push(JSON.parse(results.rows.item(i).data));
      }

      return prescriptions;
    } catch (error) {
      console.error('Failed to get cached prescriptions:', error);
      return [];
    }
  }

  // Cache medicine
  async cacheMedicine(medicineId: string, data: any) {
    if (!this.db) return;

    try {
      await this.db.executeSql(
        `INSERT OR REPLACE INTO medicines (id, data, last_updated)
         VALUES (?, ?, ?)`,
        [medicineId, JSON.stringify(data), Date.now()]
      );
    } catch (error) {
      console.error('Failed to cache medicine:', error);
    }
  }

  // Get cached medicine
  async getCachedMedicine(medicineId: string): Promise<any | null> {
    if (!this.db) return null;

    try {
      const [results] = await this.db.executeSql(
        'SELECT data FROM medicines WHERE id = ?',
        [medicineId]
      );

      if (results.rows.length > 0) {
        return JSON.parse(results.rows.item(0).data);
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached medicine:', error);
      return null;
    }
  }

  // Search cached medicines
  async searchCachedMedicines(query: string): Promise<any[]> {
    if (!this.db) return [];

    try {
      const [results] = await this.db.executeSql(
        `SELECT data FROM medicines 
         WHERE data LIKE ? OR data LIKE ?
         LIMIT 20`,
        [`%"tradeName":"%${query}%"%`, `%"scientificName":"%${query}%"%`]
      );

      const medicines = [];
      for (let i = 0; i < results.rows.length; i++) {
        medicines.push(JSON.parse(results.rows.item(i).data));
      }

      return medicines;
    } catch (error) {
      console.error('Failed to search cached medicines:', error);
      return [];
    }
  }

  // Save draft prescription
  async saveDraftPrescription(draftId: string, data: any) {
    if (!this.db) return;

    try {
      const now = Date.now();
      await this.db.executeSql(
        `INSERT OR REPLACE INTO draft_prescriptions (id, data, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
        [draftId, JSON.stringify(data), now, now]
      );
    } catch (error) {
      console.error('Failed to save draft prescription:', error);
    }
  }

  // Get draft prescriptions
  async getDraftPrescriptions(): Promise<any[]> {
    if (!this.db) return [];

    try {
      const [results] = await this.db.executeSql(
        'SELECT * FROM draft_prescriptions ORDER BY updated_at DESC'
      );

      const drafts = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        drafts.push({
          id: row.id,
          ...JSON.parse(row.data),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }

      return drafts;
    } catch (error) {
      console.error('Failed to get draft prescriptions:', error);
      return [];
    }
  }

  // Delete draft prescription
  async deleteDraftPrescription(draftId: string) {
    if (!this.db) return;

    try {
      await this.db.executeSql('DELETE FROM draft_prescriptions WHERE id = ?', [draftId]);
    } catch (error) {
      console.error('Failed to delete draft prescription:', error);
    }
  }

  // Add to sync queue
  async addToSyncQueue(item: Omit<SyncQueue, 'id' | 'timestamp' | 'retries'>) {
    if (!this.db) return;

    const queueItem: SyncQueue = {
      ...item,
      id: `${item.type}_${item.entity}_${Date.now()}`,
      timestamp: Date.now(),
      retries: 0,
    };

    try {
      await this.db.executeSql(
        `INSERT INTO sync_queue (id, type, entity, data, timestamp, retries)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          queueItem.id,
          queueItem.type,
          queueItem.entity,
          JSON.stringify(queueItem.data),
          queueItem.timestamp,
          queueItem.retries,
        ]
      );

      this.syncQueue.push(queueItem);

      // Try to sync immediately if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        this.processSyncQueue();
      }
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  // Process sync queue
  private async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0 || !this.db) {
      return;
    }

    this.isSyncing = true;

    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        this.isSyncing = false;
        return;
      }

      // Process each item in the queue
      const itemsToRemove: string[] = [];

      for (const item of this.syncQueue) {
        try {
          // Sync with backend based on entity type
          await this.syncItem(item);
          itemsToRemove.push(item.id);
        } catch (error) {
          console.error('Failed to sync item:', error);

          // Increment retry count
          await this.db.executeSql(
            'UPDATE sync_queue SET retries = retries + 1 WHERE id = ?',
            [item.id]
          );

          // Remove if too many retries
          if (item.retries >= 5) {
            itemsToRemove.push(item.id);
          }
        }
      }

      // Remove successfully synced items
      if (itemsToRemove.length > 0) {
        const placeholders = itemsToRemove.map(() => '?').join(',');
        await this.db.executeSql(
          `DELETE FROM sync_queue WHERE id IN (${placeholders})`,
          itemsToRemove
        );

        this.syncQueue = this.syncQueue.filter((item) => !itemsToRemove.includes(item.id));
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(item: SyncQueue) {
    // TODO: Implement actual API calls based on entity type
    console.log('Syncing item:', item);

    switch (item.entity) {
      case 'prescription':
        // Sync prescription
        break;

      case 'inventory':
        // Sync inventory
        break;

      default:
        console.warn('Unknown entity type:', item.entity);
    }
  }

  // Clear cache
  async clearCache() {
    if (!this.db) return;

    try {
      await this.db.executeSql('DELETE FROM prescriptions');
      await this.db.executeSql('DELETE FROM medicines');
      await this.db.executeSql('DELETE FROM inventory');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // Get cache size
  async getCacheSize(): Promise<{ prescriptions: number; medicines: number; total: number }> {
    if (!this.db) return { prescriptions: 0, medicines: 0, total: 0 };

    try {
      const [presResults] = await this.db.executeSql(
        'SELECT COUNT(*) as count FROM prescriptions'
      );
      const [medResults] = await this.db.executeSql('SELECT COUNT(*) as count FROM medicines');

      const prescriptions = presResults.rows.item(0).count;
      const medicines = medResults.rows.item(0).count;

      return {
        prescriptions,
        medicines,
        total: prescriptions + medicines,
      };
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return { prescriptions: 0, medicines: 0, total: 0 };
    }
  }
}

export const offlineStorage = new OfflineStorageService();

// ------------------------------------------------------------------------------
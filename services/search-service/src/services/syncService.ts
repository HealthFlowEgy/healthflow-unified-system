/**
 * Database to Elasticsearch Sync Service
 */

import { indexService } from './indexService';
import { logger } from '../utils/logger';

interface SyncResult {
  success: boolean;
  count: number;
  errors?: any[];
}

class SyncService {
  async syncAll(tenantId?: string): Promise<SyncResult> {
    try {
      logger.info('Starting full sync...');
      
      const results = await Promise.all([
        this.syncPatients(tenantId),
        this.syncDoctors(tenantId),
        this.syncPrescriptions(tenantId),
        this.syncAppointments(tenantId),
        this.syncMedicines(tenantId)
      ]);

      const totalCount = results.reduce((sum, r) => sum + r.count, 0);
      
      logger.info(`Full sync complete: ${totalCount} documents indexed`);
      return { success: true, count: totalCount };
    } catch (error) {
      logger.error('Full sync failed:', error);
      throw error;
    }
  }

  async syncPatients(tenantId?: string): Promise<SyncResult> {
    try {
      logger.info('Syncing patients...');
      // Mock implementation - in production, fetch from database
      const mockPatients = [
        { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
      ];

      await indexService.bulkIndex('patients', mockPatients.map(p => ({
        id: p.id,
        data: { ...p, fullName: `${p.firstName} ${p.lastName}`, tenantId }
      })));

      return { success: true, count: mockPatients.length };
    } catch (error) {
      logger.error('Patient sync failed:', error);
      return { success: false, count: 0, errors: [error] };
    }
  }

  async syncDoctors(tenantId?: string): Promise<SyncResult> {
    try {
      logger.info('Syncing doctors...');
      const mockDoctors = [
        { id: '1', firstName: 'Dr. Ahmed', lastName: 'Hassan', specialization: 'Cardiology' },
        { id: '2', firstName: 'Dr. Fatma', lastName: 'Ali', specialization: 'Pediatrics' }
      ];

      await indexService.bulkIndex('doctors', mockDoctors.map(d => ({
        id: d.id,
        data: { ...d, fullName: `${d.firstName} ${d.lastName}`, tenantId }
      })));

      return { success: true, count: mockDoctors.length };
    } catch (error) {
      logger.error('Doctor sync failed:', error);
      return { success: false, count: 0, errors: [error] };
    }
  }

  async syncPrescriptions(tenantId?: string): Promise<SyncResult> {
    try {
      logger.info('Syncing prescriptions...');
      return { success: true, count: 0 };
    } catch (error) {
      logger.error('Prescription sync failed:', error);
      return { success: false, count: 0, errors: [error] };
    }
  }

  async syncAppointments(tenantId?: string): Promise<SyncResult> {
    try {
      logger.info('Syncing appointments...');
      return { success: true, count: 0 };
    } catch (error) {
      logger.error('Appointment sync failed:', error);
      return { success: false, count: 0, errors: [error] };
    }
  }

  async syncMedicines(tenantId?: string): Promise<SyncResult> {
    try {
      logger.info('Syncing medicines...');
      return { success: true, count: 0 };
    } catch (error) {
      logger.error('Medicine sync failed:', error);
      return { success: false, count: 0, errors: [error] };
    }
  }

  async syncSingle(type: string, id: string, data: any): Promise<void> {
    try {
      await indexService.indexDocument(type, { id, data });
      logger.info(`Synced ${type}/${id}`);
    } catch (error) {
      logger.error(`Failed to sync ${type}/${id}:`, error);
      throw error;
    }
  }

  async removeSingle(type: string, id: string): Promise<void> {
    try {
      await indexService.deleteDocument(type, id);
      logger.info(`Removed ${type}/${id} from index`);
    } catch (error) {
      logger.error(`Failed to remove ${type}/${id}:`, error);
      throw error;
    }
  }
}

export const syncService = new SyncService();

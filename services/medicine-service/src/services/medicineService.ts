/**
 * Medicine Service Logic
 */

import { eq, or, like, and, inArray } from 'drizzle-orm';
import db from '../config/database';
import { medicines, drugInteractions } from '../models/schema';

export class MedicineService {
  /**
   *

Search medicines with filters
   */
  async searchMedicines(filters: any) {
    const conditions: any[] = [eq(medicines.isActive, true)];

    // Search query (trade name or generic name)
    if (filters.query) {
      const searchTerm = `%${filters.query}%`;
      conditions.push(
        or(
          like(medicines.tradeName, searchTerm),
          like(medicines.genericName, searchTerm)
        )
      );
    }

    // Filter by category
    if (filters.category) {
      conditions.push(eq(medicines.category, filters.category));
    }

    // Filter by prescription requirement
    if (filters.prescriptionRequired !== undefined) {
      conditions.push(eq(medicines.isPrescriptionRequired, filters.prescriptionRequired));
    }

    const offset = (filters.page - 1) * filters.limit;

    const [medicinesList, [{ count }]] = await Promise.all([
      db.select()
        .from(medicines)
        .where(and(...conditions))
        .limit(filters.limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(medicines)
        .where(and(...conditions))
    ]);

    return {
      medicines: medicinesList,
      total: Number(count),
      page: filters.page,
      limit: filters.limit
    };
  }

  /**
   * Get medicine by ID
   */
  async getMedicineById(id: string) {
    const medicine = await db.query.medicines.findFirst({
      where: eq(medicines.id, id)
    });

    return medicine;
  }

  /**
   * Check drug interactions for multiple medicines
   */
  async checkInteractions(medicineIds: string[]) {
    const interactions = await db.select()
      .from(drugInteractions)
      .where(
        and(
          inArray(drugInteractions.medicineId1, medicineIds),
          inArray(drugInteractions.medicineId2, medicineIds)
        )
      );

    return interactions;
  }

  /**
   * Get all medicine categories
   */
  async getCategories() {
    const result = await db.selectDistinct({ category: medicines.category })
      .from(medicines)
      .where(eq(medicines.isActive, true));

    return result.map(r => r.category).filter(Boolean);
  }
}

export const medicineService = new MedicineService();
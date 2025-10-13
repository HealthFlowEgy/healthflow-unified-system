// Sprint 2 - Inventory Service Business Logic

import { db } from '../database/connection';
import { 
  pharmacyInventory, 
  medicines, 
  pharmacyStaff,
  dispensingRecords,
  priceHistory 
} from '../database/schema';
import { eq, and, or, sql, like, lte, gte, desc, asc } from 'drizzle-orm';
import { AppError } from '../utils/errors';
import { sendEmail } from '../utils/email';
import { logger } from '../utils/logger';

export class InventoryService {
  async checkPharmacyAccess(pharmacyId: string, userId: string): Promise<boolean> {
    const staffMember = await db.query.pharmacyStaff.findFirst({
      where: and(
        eq(pharmacyStaff.pharmacyId, pharmacyId),
        eq(pharmacyStaff.userId, userId)
      )
    });
    
    return !!staffMember;
  }
  
  async getInventory(pharmacyId: string, filters: any) {
    const {
      page = 1,
      limit = 50,
      status,
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = filters;
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [eq(pharmacyInventory.pharmacyId, pharmacyId)];
    
    if (status) {
      conditions.push(eq(pharmacyInventory.status, status));
    }
    
    // Execute query with medicine details
    const query = db
      .select({
        id: pharmacyInventory.id,
        pharmacyId: pharmacyInventory.pharmacyId,
        medicineId: pharmacyInventory.medicineId,
        batchNumber: pharmacyInventory.batchNumber,
        quantity: pharmacyInventory.quantity,
        expiryDate: pharmacyInventory.expiryDate,
        purchasePrice: pharmacyInventory.purchasePrice,
        sellingPrice: pharmacyInventory.sellingPrice,
        status: pharmacyInventory.status,
        minStockLevel: pharmacyInventory.minStockLevel,
        alertSent: pharmacyInventory.alertSent,
        createdAt: pharmacyInventory.createdAt,
        updatedAt: pharmacyInventory.updatedAt,
        // Medicine details
        medicineName: medicines.tradeName,
        scientificName: medicines.scientificName,
        dosageForm: medicines.dosageForm,
        strength: medicines.strength,
        edaNumber: medicines.edaNumber
      })
      .from(pharmacyInventory)
      .leftJoin(medicines, eq(pharmacyInventory.medicineId, medicines.id))
      .where(and(...conditions));
    
    // Add search if provided
    if (search) {
      query.where(
        or(
          like(medicines.tradeName, `%${search}%`),
          like(medicines.scientificName, `%${search}%`),
          like(pharmacyInventory.batchNumber, `%${search}%`),
          like(medicines.edaNumber, `%${search}%`)
        )
      );
    }
    
    // Add sorting
    const sortColumn = sortBy === 'name' ? medicines.tradeName : pharmacyInventory[sortBy];
    query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));
    
    // Execute with pagination
    const [items, totalResult] = await Promise.all([
      query.limit(limit).offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(pharmacyInventory)
        .where(and(...conditions))
    ]);
    
    const total = Number(totalResult[0]?.count || 0);
    
    // Update status for items
    const processedItems = items.map(item => ({
      ...item,
      status: this.determineInventoryStatus(item),
      daysUntilExpiry: this.calculateDaysUntilExpiry(item.expiryDate)
    }));
    
    return {
      items: processedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      summary: await this.getInventorySummary(pharmacyId)
    };
  }
  
  async addInventoryItem(pharmacyId: string, itemData: any) {
    // Verify medicine exists
    const medicine = await db.query.medicines.findFirst({
      where: eq(medicines.id, itemData.medicineId)
    });
    
    if (!medicine) {
      throw new AppError('MEDICINE_NOT_FOUND', 'Medicine not found', 404);
    }
    
    // Check if item with same batch already exists
    const existing = await db.query.pharmacyInventory.findFirst({
      where: and(
        eq(pharmacyInventory.pharmacyId, pharmacyId),
        eq(pharmacyInventory.medicineId, itemData.medicineId),
        eq(pharmacyInventory.batchNumber, itemData.batchNumber)
      )
    });
    
    if (existing) {
      // Update existing item quantity
      const [updated] = await db
        .update(pharmacyInventory)
        .set({
          quantity: sql`${pharmacyInventory.quantity} + ${itemData.quantity}`,
          purchasePrice: itemData.purchasePrice,
          sellingPrice: itemData.sellingPrice,
          updatedAt: new Date()
        })
        .where(eq(pharmacyInventory.id, existing.id))
        .returning();
      
      return updated;
    }
    
    // Create new inventory item
    const [item] = await db.insert(pharmacyInventory).values({
      pharmacyId,
      medicineId: itemData.medicineId,
      batchNumber: itemData.batchNumber,
      quantity: itemData.quantity,
      expiryDate: new Date(itemData.expiryDate),
      purchasePrice: itemData.purchasePrice,
      sellingPrice: itemData.sellingPrice,
      minStockLevel: itemData.minStockLevel || 10,
      status: 'in_stock',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Record price history
    await this.recordPriceChange(item.id, null, itemData.sellingPrice, 'initial_stock');
    
    return item;
  }
  
  async updateInventoryItem(pharmacyId: string, itemId: string, updates: any) {
    const item = await db.query.pharmacyInventory.findFirst({
      where: and(
        eq(pharmacyInventory.id, itemId),
        eq(pharmacyInventory.pharmacyId, pharmacyId)
      )
    });
    
    if (!item) {
      throw new AppError('ITEM_NOT_FOUND', 'Inventory item not found', 404);
    }
    
    // If price is changing, record it
    if (updates.sellingPrice && updates.sellingPrice !== item.sellingPrice) {
      await this.recordPriceChange(
        itemId,
        Number(item.sellingPrice),
        updates.sellingPrice,
        'manual_adjustment'
      );
    }
    
    const [updated] = await db
      .update(pharmacyInventory)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(pharmacyInventory.id, itemId))
      .returning();
    
    // Check if stock level triggers alert
    if (updates.quantity !== undefined) {
      await this.checkStockAlerts(updated);
    }
    
    return updated;
  }
  
  async deleteInventoryItem(pharmacyId: string, itemId: string) {
    const item = await db.query.pharmacyInventory.findFirst({
      where: and(
        eq(pharmacyInventory.id, itemId),
        eq(pharmacyInventory.pharmacyId, pharmacyId)
      )
    });
    
    if (!item) {
      throw new AppError('ITEM_NOT_FOUND', 'Inventory item not found', 404);
    }
    
    // Check if item has been used in dispensing
    const hasDispensing = await db.query.dispensingRecords.findFirst({
      where: sql`${dispensingRecords.medicationsDispensed}::jsonb @> '[{"inventoryItemId": "${itemId}"}]'`
    });
    
    if (hasDispensing) {
      // Soft delete by marking as deleted
      await db
        .update(pharmacyInventory)
        .set({ status: 'deleted', updatedAt: new Date() })
        .where(eq(pharmacyInventory.id, itemId));
    } else {
      // Hard delete
      await db.delete(pharmacyInventory).where(eq(pharmacyInventory.id, itemId));
    }
    
    return true;
  }
  
  async adjustStock(
    pharmacyId: string,
    itemId: string,
    adjustment: number,
    reason: string,
    userId: string
  ) {
    const item = await db.query.pharmacyInventory.findFirst({
      where: and(
        eq(pharmacyInventory.id, itemId),
        eq(pharmacyInventory.pharmacyId, pharmacyId)
      )
    });
    
    if (!item) {
      throw new AppError('ITEM_NOT_FOUND', 'Inventory item not found', 404);
    }
    
    const newQuantity = item.quantity + adjustment;
    
    if (newQuantity < 0) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        'Cannot adjust to negative quantity',
        400
      );
    }
    
    const [updated] = await db
      .update(pharmacyInventory)
      .set({
        quantity: newQuantity,
        status: this.determineInventoryStatus({ ...item, quantity: newQuantity }),
        updatedAt: new Date()
      })
      .where(eq(pharmacyInventory.id, itemId))
      .returning();
    
    // Log the adjustment
    logger.info(`Stock adjusted for item ${itemId}`, {
      pharmacyId,
      userId,
      adjustment,
      reason,
      oldQuantity: item.quantity,
      newQuantity
    });
    
    // Check for alerts
    await this.checkStockAlerts(updated);
    
    return updated;
  }
  
  async getLowStockItems(pharmacyId: string) {
    const items = await db
      .select({
        id: pharmacyInventory.id,
        quantity: pharmacyInventory.quantity,
        minStockLevel: pharmacyInventory.minStockLevel,
        medicineName: medicines.tradeName,
        scientificName: medicines.scientificName,
        dosageForm: medicines.dosageForm,
        strength: medicines.strength
      })
      .from(pharmacyInventory)
      .leftJoin(medicines, eq(pharmacyInventory.medicineId, medicines.id))
      .where(
        and(
          eq(pharmacyInventory.pharmacyId, pharmacyId),
          sql`${pharmacyInventory.quantity} <= ${pharmacyInventory.minStockLevel}`
        )
      )
      .orderBy(asc(pharmacyInventory.quantity));
    
    return items;
  }
  
  async getExpiringItems(pharmacyId: string, days: number = 30) {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + days);
    
    const items = await db
      .select({
        id: pharmacyInventory.id,
        quantity: pharmacyInventory.quantity,
        expiryDate: pharmacyInventory.expiryDate,
        batchNumber: pharmacyInventory.batchNumber,
        medicineName: medicines.tradeName,
        scientificName: medicines.scientificName,
        dosageForm: medicines.dosageForm,
        strength: medicines.strength
      })
      .from(pharmacyInventory)
      .leftJoin(medicines, eq(pharmacyInventory.medicineId, medicines.id))
      .where(
        and(
          eq(pharmacyInventory.pharmacyId, pharmacyId),
          lte(pharmacyInventory.expiryDate, expiryThreshold),
          sql`${pharmacyInventory.status} != 'expired'`
        )
      )
      .orderBy(asc(pharmacyInventory.expiryDate));
    
    return items.map(item => ({
      ...item,
      daysUntilExpiry: this.calculateDaysUntilExpiry(item.expiryDate)
    }));
  }
  
  async bulkImport(pharmacyId: string, items: any[]) {
    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as any[]
    };
    
    for (const item of items) {
      try {
        await this.addInventoryItem(pharmacyId, item);
        results.successCount++;
      } catch (error) {
        results.failureCount++;
        results.errors.push({
          item,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  async bulkUpdate(pharmacyId: string, updates: any[]) {
    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as any[]
    };
    
    for (const update of updates) {
      try {
        await this.updateInventoryItem(pharmacyId, update.id, update.changes);
        results.successCount++;
      } catch (error) {
        results.failureCount++;
        results.errors.push({
          update,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  async getInventoryValuation(pharmacyId: string) {
    const items = await db
      .select({
        quantity: pharmacyInventory.quantity,
        purchasePrice: pharmacyInventory.purchasePrice,
        sellingPrice: pharmacyInventory.sellingPrice
      })
      .from(pharmacyInventory)
      .where(
        and(
          eq(pharmacyInventory.pharmacyId, pharmacyId),
          sql`${pharmacyInventory.status} IN ('in_stock', 'low_stock')`
        )
      );
    
    const valuation = items.reduce(
      (acc, item) => {
        const purchaseValue = item.quantity * Number(item.purchasePrice || 0);
        const sellingValue = item.quantity * Number(item.sellingPrice || 0);
        
        return {
          totalPurchaseValue: acc.totalPurchaseValue + purchaseValue,
          totalSellingValue: acc.totalSellingValue + sellingValue,
          potentialProfit: acc.potentialProfit + (sellingValue - purchaseValue),
          itemCount: acc.itemCount + 1,
          totalUnits: acc.totalUnits + item.quantity
        };
      },
      {
        totalPurchaseValue: 0,
        totalSellingValue: 0,
        potentialProfit: 0,
        itemCount: 0,
        totalUnits: 0
      }
    );
    
    return valuation;
  }
  
  async getInventoryTurnover(pharmacyId: string, params: any) {
    const { startDate, endDate } = params;
    
    // Get dispensing records in date range
    const records = await db.query.dispensingRecords.findMany({
      where: and(
        eq(dispensingRecords.pharmacyId, pharmacyId),
        startDate ? gte(dispensingRecords.dispensedAt, new Date(startDate)) : undefined,
        endDate ? lte(dispensingRecords.dispensedAt, new Date(endDate)) : undefined
      )
    });
    
    // Calculate turnover by medicine
    const turnoverByMedicine: Record<string, any> = {};
    
    for (const record of records) {
      const medications = record.medicationsDispensed as any[];
      
      for (const med of medications) {
        if (!turnoverByMedicine[med.medicineId]) {
          turnoverByMedicine[med.medicineId] = {
            medicineId: med.medicineId,
            medicineName: med.name,
            totalDispensed: 0,
            totalRevenue: 0,
            dispensingCount: 0
          };
        }
        
        turnoverByMedicine[med.medicineId].totalDispensed += med.quantity;
        turnoverByMedicine[med.medicineId].totalRevenue += med.quantity * Number(med.price);
        turnoverByMedicine[med.medicineId].dispensingCount++;
      }
    }
    
    // Get current inventory levels
    const currentInventory = await db
      .select({
        medicineId: pharmacyInventory.medicineId,
        totalQuantity: sql<number>`SUM(${pharmacyInventory.quantity})`
      })
      .from(pharmacyInventory)
      .where(eq(pharmacyInventory.pharmacyId, pharmacyId))
      .groupBy(pharmacyInventory.medicineId);
    
    const inventoryMap = Object.fromEntries(
      currentInventory.map(item => [item.medicineId, Number(item.totalQuantity)])
    );
    
    // Calculate turnover rate
    const turnoverData = Object.values(turnoverByMedicine).map(item => ({
      ...item,
      currentStock: inventoryMap[item.medicineId] || 0,
      turnoverRate: item.totalDispensed / (inventoryMap[item.medicineId] || 1)
    }));
    
    return {
      items: turnoverData.sort((a, b) => b.totalRevenue - a.totalRevenue),
      summary: {
        totalRevenue: turnoverData.reduce((sum, item) => sum + item.totalRevenue, 0),
        totalDispensed: turnoverData.reduce((sum, item) => sum + item.totalDispensed, 0),
        averageTurnoverRate: turnoverData.reduce((sum, item) => sum + item.turnoverRate, 0) / turnoverData.length
      }
    };
  }
  
  private async getInventorySummary(pharmacyId: string) {
    const [summary] = await db
      .select({
        totalItems: sql<number>`COUNT(*)`,
        totalValue: sql<number>`SUM(${pharmacyInventory.quantity} * ${pharmacyInventory.sellingPrice})`,
        lowStockCount: sql<number>`COUNT(*) FILTER (WHERE ${pharmacyInventory.quantity} <= ${pharmacyInventory.minStockLevel})`,
        outOfStockCount: sql<number>`COUNT(*) FILTER (WHERE ${pharmacyInventory.quantity} = 0)`,
        expiringCount: sql<number>`COUNT(*) FILTER (WHERE ${pharmacyInventory.expiryDate} <= CURRENT_DATE + INTERVAL '30 days')`
      })
      .from(pharmacyInventory)
      .where(eq(pharmacyInventory.pharmacyId, pharmacyId));
    
    return {
      totalItems: Number(summary?.totalItems || 0),
      totalValue: Number(summary?.totalValue || 0),
      lowStockCount: Number(summary?.lowStockCount || 0),
      outOfStockCount: Number(summary?.outOfStockCount || 0),
      expiringCount: Number(summary?.expiringCount || 0)
    };
  }
  
  private determineInventoryStatus(item: any): string {
    const today = new Date();
    const expiryDate = new Date(item.expiryDate);
    
    if (expiryDate < today) {
      return 'expired';
    }
    
    if (item.quantity === 0) {
      return 'out_of_stock';
    }
    
    if (item.quantity <= item.minStockLevel) {
      return 'low_stock';
    }
    
    return 'in_stock';
  }
  
  private calculateDaysUntilExpiry(expiryDate: Date): number {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  private async checkStockAlerts(item: any) {
    if (item.quantity <= item.minStockLevel && !item.alertSent) {
      // Send alert to pharmacy staff
      await this.sendLowStockAlert(item);
      
      // Mark alert as sent
      await db
        .update(pharmacyInventory)
        .set({ alertSent: true })
        .where(eq(pharmacyInventory.id, item.id));
    }
  }
  
  private async sendLowStockAlert(item: any) {
    // Get pharmacy staff emails
    const staff = await db.query.pharmacyStaff.findMany({
      where: eq(pharmacyStaff.pharmacyId, item.pharmacyId),
      with: {
        user: true
      }
    });
    
    const emails = staff.map(s => s.user.email);
    
    if (emails.length > 0) {
      await sendEmail({
        to: emails,
        subject: 'Low Stock Alert',
        template: 'low-stock-alert',
        data: {
          itemId: item.id,
          quantity: item.quantity,
          minStockLevel: item.minStockLevel
        }
      });
    }
  }
  
  private async recordPriceChange(
    itemId: string,
    oldPrice: number | null,
    newPrice: number,
    reason: string
  ) {
    const item = await db.query.pharmacyInventory.findFirst({
      where: eq(pharmacyInventory.id, itemId)
    });
    
    if (!item) return;
    
    await db.insert(priceHistory).values({
      medicineId: item.medicineId,
      pharmacyId: item.pharmacyId,
      oldPrice: oldPrice ? String(oldPrice) : null,
      newPrice: String(newPrice),
      changePercentage: oldPrice ? String(((newPrice - oldPrice) / oldPrice) * 100) : null,
      reason,
      recordedAt: new Date()
    });
  }
}

// ------------------------------------------------------------------------------
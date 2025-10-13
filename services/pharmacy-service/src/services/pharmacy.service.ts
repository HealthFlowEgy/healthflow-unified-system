// Sprint 2 - Pharmacy Service Business Logic
// ------------------------------------------------------------------------------

import { db } from '../database/connection';
import { pharmacies, pharmacyStaff, users } from '../database/schema';
import { eq, and, or, sql, like, inArray } from 'drizzle-orm';
import { AppError } from '../utils/errors';
import { sendEmail } from '../utils/email';
import { calculateDistance } from '../utils/geolocation';

export class PharmacyService {
  async registerPharmacy(data: any, userId: string) {
    // Check if pharmacy with same license already exists
    const existing = await db.query.pharmacies.findFirst({
      where: eq(pharmacies.licenseNumber, data.licenseNumber)
    });
    
    if (existing) {
      throw new AppError(
        'PHARMACY_EXISTS',
        'A pharmacy with this license number already exists',
        400
      );
    }
    
    // Get user's tenant
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    // Create pharmacy
    const [pharmacy] = await db.insert(pharmacies).values({
      ...data,
      status: 'pending',
      edaVerified: false,
      tenantId: user?.tenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Add registering user as owner
    await db.insert(pharmacyStaff).values({
      pharmacyId: pharmacy.id,
      userId,
      role: 'owner',
      canDispense: true,
      createdAt: new Date()
    });
    
    // Notify EDA for verification
    await this.notifyEDAForVerification(pharmacy);
    
    return pharmacy;
  }
  
  async listPharmacies(filters: any) {
    const {
      page = 1,
      limit = 20,
      status,
      city,
      governorate,
      search,
      userId
    } = filters;
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [];
    
    if (status) {
      conditions.push(eq(pharmacies.status, status));
    }
    
    if (city) {
      conditions.push(eq(pharmacies.city, city));
    }
    
    if (governorate) {
      conditions.push(eq(pharmacies.governorate, governorate));
    }
    
    if (search) {
      conditions.push(
        or(
          like(pharmacies.pharmacyName, `%${search}%`),
          like(pharmacies.licenseNumber, `%${search}%`),
          like(pharmacies.ownerName, `%${search}%`)
        )
      );
    }
    
    // If userId is provided (pharmacist), filter by their pharmacies
    if (userId) {
      const userPharmacies = await db.query.pharmacyStaff.findMany({
        where: eq(pharmacyStaff.userId, userId),
        columns: { pharmacyId: true }
      });
      
      const pharmacyIds = userPharmacies.map(ps => ps.pharmacyId);
      if (pharmacyIds.length > 0) {
        conditions.push(inArray(pharmacies.id, pharmacyIds));
      }
    }
    
    // Execute query
    const [items, totalResult] = await Promise.all([
      db.query.pharmacies.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit,
        offset,
        orderBy: (pharmacies, { desc }) => [desc(pharmacies.createdAt)]
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(pharmacies)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
    ]);
    
    const total = Number(totalResult[0]?.count || 0);
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  async getPharmacy(id: string) {
    const pharmacy = await db.query.pharmacies.findFirst({
      where: eq(pharmacies.id, id),
      with: {
        staff: {
          with: {
            user: {
              columns: {
                id: true,
                email: true,
                fullName: true,
                phoneNumber: true
              }
            }
          }
        }
      }
    });
    
    return pharmacy;
  }
  
  async updatePharmacy(id: string, updates: any) {
    const [pharmacy] = await db.update(pharmacies)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(pharmacies.id, id))
      .returning();
    
    if (!pharmacy) {
      throw new AppError('PHARMACY_NOT_FOUND', 'Pharmacy not found', 404);
    }
    
    return pharmacy;
  }
  
  async deletePharmacy(id: string) {
    const [deleted] = await db.update(pharmacies)
      .set({
        deletedAt: new Date(),
        status: 'closed'
      })
      .where(eq(pharmacies.id, id))
      .returning();
    
    if (!deleted) {
      throw new AppError('PHARMACY_NOT_FOUND', 'Pharmacy not found', 404);
    }
    
    return deleted;
  }
  
  async checkUserAccess(pharmacyId: string, userId: string): Promise<boolean> {
    const staffMember = await db.query.pharmacyStaff.findFirst({
      where: and(
        eq(pharmacyStaff.pharmacyId, pharmacyId),
        eq(pharmacyStaff.userId, userId)
      )
    });
    
    return !!staffMember;
  }
  
  async addStaffMember(pharmacyId: string, staffData: any) {
    // Check if user already exists as staff
    const existing = await db.query.pharmacyStaff.findFirst({
      where: and(
        eq(pharmacyStaff.pharmacyId, pharmacyId),
        eq(pharmacyStaff.userId, staffData.userId)
      )
    });
    
    if (existing) {
      throw new AppError(
        'STAFF_EXISTS',
        'User is already a staff member of this pharmacy',
        400
      );
    }
    
    const [staff] = await db.insert(pharmacyStaff).values({
      pharmacyId,
      ...staffData,
      createdAt: new Date()
    }).returning();
    
    // Send notification to user
    const user = await db.query.users.findFirst({
      where: eq(users.id, staffData.userId)
    });
    
    if (user) {
      await sendEmail({
        to: user.email,
        subject: 'Added to Pharmacy Staff',
        template: 'staff-added',
        data: {
          userName: user.fullName,
          pharmacyId,
          role: staffData.role
        }
      });
    }
    
    return staff;
  }
  
  async getStaff(pharmacyId: string) {
    const staff = await db.query.pharmacyStaff.findMany({
      where: eq(pharmacyStaff.pharmacyId, pharmacyId),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            licenseNumber: true
          }
        }
      }
    });
    
    return staff;
  }
  
  async removeStaffMember(pharmacyId: string, staffId: string) {
    const [deleted] = await db.delete(pharmacyStaff)
      .where(
        and(
          eq(pharmacyStaff.pharmacyId, pharmacyId),
          eq(pharmacyStaff.id, staffId)
        )
      )
      .returning();
    
    if (!deleted) {
      throw new AppError('STAFF_NOT_FOUND', 'Staff member not found', 404);
    }
    
    return deleted;
  }
  
  async updateStatus(id: string, status: string, reason?: string) {
    const [pharmacy] = await db.update(pharmacies)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(pharmacies.id, id))
      .returning();
    
    if (!pharmacy) {
      throw new AppError('PHARMACY_NOT_FOUND', 'Pharmacy not found', 404);
    }
    
    // Log status change
    // await this.logStatusChange(id, status, reason);
    
    return pharmacy;
  }
  
  async verifyPharmacy(id: string, verifierId: string) {
    const [pharmacy] = await db.update(pharmacies)
      .set({
        edaVerified: true,
        verifiedAt: new Date(),
        verifiedBy: verifierId,
        status: 'active',
        updatedAt: new Date()
      })
      .where(eq(pharmacies.id, id))
      .returning();
    
    if (!pharmacy) {
      throw new AppError('PHARMACY_NOT_FOUND', 'Pharmacy not found', 404);
    }
    
    // Notify pharmacy owner
    await this.notifyPharmacyVerified(pharmacy);
    
    return pharmacy;
  }
  
  async findNearby(params: { latitude: number; longitude: number; radius: number }) {
    const { latitude, longitude, radius } = params;
    
    // Get all active pharmacies
    const allPharmacies = await db.query.pharmacies.findMany({
      where: eq(pharmacies.status, 'active')
    });
    
    // Filter by distance
    const nearbyPharmacies = allPharmacies
      .map(pharmacy => {
        if (!pharmacy.latitude || !pharmacy.longitude) return null;
        
        const distance = calculateDistance(
          latitude,
          longitude,
          Number(pharmacy.latitude),
          Number(pharmacy.longitude)
        );
        
        return distance <= radius ? { ...pharmacy, distance } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);
    
    return nearbyPharmacies;
  }
  
  async searchByLocation(params: { city?: string; governorate?: string }) {
    const { city, governorate } = params;
    
    const conditions = [eq(pharmacies.status, 'active')];
    
    if (city) {
      conditions.push(eq(pharmacies.city, city));
    }
    
    if (governorate) {
      conditions.push(eq(pharmacies.governorate, governorate));
    }
    
    const results = await db.query.pharmacies.findMany({
      where: and(...conditions),
      orderBy: (pharmacies, { asc }) => [asc(pharmacies.pharmacyName)]
    });
    
    return results;
  }
  
  private async notifyEDAForVerification(pharmacy: any) {
    // Get all EDA officers
    const edaOfficers = await db.query.users.findMany({
      where: eq(users.role, 'eda_officer')
    });
    
    // Send email to each EDA officer
    for (const officer of edaOfficers) {
      await sendEmail({
        to: officer.email,
        subject: 'New Pharmacy Registration - Verification Required',
        template: 'pharmacy-verification-required',
        data: {
          officerName: officer.fullName,
          pharmacyName: pharmacy.pharmacyName,
          licenseNumber: pharmacy.licenseNumber,
          verificationLink: `${process.env.FRONTEND_URL}/regulatory/pharmacies/${pharmacy.id}/verify`
        }
      });
    }
  }
  
  private async notifyPharmacyVerified(pharmacy: any) {
    // Get pharmacy owner
    const owner = await db.query.pharmacyStaff.findFirst({
      where: and(
        eq(pharmacyStaff.pharmacyId, pharmacy.id),
        eq(pharmacyStaff.role, 'owner')
      ),
      with: {
        user: true
      }
    });
    
    if (owner?.user) {
      await sendEmail({
        to: owner.user.email,
        subject: 'Pharmacy Verified - Ready to Operate',
        template: 'pharmacy-verified',
        data: {
          ownerName: owner.user.fullName,
          pharmacyName: pharmacy.pharmacyName,
          dashboardLink: `${process.env.FRONTEND_URL}/pharmacy/dashboard`
        }
      });
    }
  }
}
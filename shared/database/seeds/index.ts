import { db, client } from '../connection';
import { users, tenants } from '../schema';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('🌱 Seeding database...');
  
  try {
    // Create test tenant
    console.log('Creating test tenant...');
    const [tenant] = await db.insert(tenants).values({
      name: 'HealthFlow Egypt',
      slug: 'healthflow-egypt',
      type: 'hospital',
      contactEmail: 'contact@healthflow.ai',
      contactPhone: '+20 123 456 7890',
      address: 'Cairo, Egypt',
      city: 'Cairo',
      governorate: 'Cairo',
      status: 'active'
    }).returning();
    
    console.log('✓ Tenant created:', tenant.name);
    
    // Create test users
    console.log('Creating test users...');
    
    const testUsers = [
      {
        email: 'admin@healthflow.ai',
        password: 'Admin123!@#',
        fullName: 'System Administrator',
        role: 'super_admin' as const,
        emailVerified: true
      },
      {
        email: 'doctor@healthflow.ai',
        password: 'Doctor123!@#',
        fullName: 'Dr. Ahmed Hassan',
        role: 'doctor' as const,
        emailVerified: true,
        licenseNumber: 'DOC-2024-001',
        specialty: 'General Medicine',
        facilityName: 'Cairo Medical Center'
      },
      {
        email: 'pharmacist@healthflow.ai',
        password: 'Pharmacist123!@#',
        fullName: 'Fatima Mohamed',
        role: 'pharmacist' as const,
        emailVerified: true,
        licenseNumber: 'PHARM-2024-001'
      },
      {
        email: 'eda@healthflow.ai',
        password: 'EDA123!@#',
        fullName: 'EDA Officer',
        role: 'eda_officer' as const,
        emailVerified: true
      }
    ];
    
    for (const userData of testUsers) {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      const [user] = await db.insert(users).values({
        email: userData.email,
        passwordHash,
        fullName: userData.fullName,
        role: userData.role,
        status: 'active',
        emailVerified: userData.emailVerified,
        tenantId: tenant.id,
        licenseNumber: userData.licenseNumber,
        specialty: userData.specialty,
        facilityName: userData.facilityName
      }).returning();
      
      console.log(`✓ User created: ${user.email} (${user.role})`);
    }
    
    console.log('');
    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('Test Credentials:');
    console.log('=================');
    testUsers.forEach(user => {
      console.log(`${user.role.toUpperCase()}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();


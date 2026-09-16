import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check if hubId column exists on Vehicle table in DB
  const cols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Vehicle';
  `);
  console.log('Vehicle columns in DB:', cols.map((c: any) => c.column_name));

  const hasHubId = cols.some((c: any) => c.column_name === 'hubId');
  if (!hasHubId) {
    console.log('Adding hubId column and index to Vehicle table...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "hubId" TEXT REFERENCES "Hub"("id") ON DELETE SET NULL;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Vehicle_hubId_idx" ON "Vehicle"("hubId");
    `);
    console.log('Successfully added hubId column and index!');
  } else {
    console.log('hubId already exists on Vehicle table.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient, ServiceType } from '@prisma/client';

const prisma = new PrismaClient();

// ==============================================================================
// DEMO / APPLICATION FICTIONAL PRICING MATRIX
// Note: These figures are fictional demonstration values for the Euroshub
// application and are NOT claims about real-world courier market rates.
// ==============================================================================
interface IntercityPairRate {
  cityA: string;
  cityB: string;
  std: { baseFee: number; perKgFee: number; codFeeFlat: number; codFeePercent: number };
  exp: { baseFee: number; perKgFee: number; codFeeFlat: number; codFeePercent: number };
}

const FICTIONAL_INTERCITY_RATES: IntercityPairRate[] = [
  {
    cityA: 'Karachi',
    cityB: 'Lahore',
    std: { baseFee: 650, perKgFee: 120, codFeeFlat: 50, codFeePercent: 0.02 },
    exp: { baseFee: 900, perKgFee: 180, codFeeFlat: 60, codFeePercent: 0.025 },
  },
  {
    cityA: 'Karachi',
    cityB: 'Islamabad',
    std: { baseFee: 850, perKgFee: 140, codFeeFlat: 50, codFeePercent: 0.02 },
    exp: { baseFee: 1100, perKgFee: 220, codFeeFlat: 60, codFeePercent: 0.025 },
  },
  {
    cityA: 'Karachi',
    cityB: 'Faisalabad',
    std: { baseFee: 750, perKgFee: 130, codFeeFlat: 50, codFeePercent: 0.02 },
    exp: { baseFee: 1000, perKgFee: 200, codFeeFlat: 60, codFeePercent: 0.025 },
  },
  {
    cityA: 'Karachi',
    cityB: 'Multan',
    std: { baseFee: 650, perKgFee: 120, codFeeFlat: 50, codFeePercent: 0.02 },
    exp: { baseFee: 900, perKgFee: 180, codFeeFlat: 60, codFeePercent: 0.025 },
  },
  {
    cityA: 'Lahore',
    cityB: 'Islamabad',
    std: { baseFee: 500, perKgFee: 100, codFeeFlat: 45, codFeePercent: 0.02 },
    exp: { baseFee: 700, perKgFee: 150, codFeeFlat: 55, codFeePercent: 0.025 },
  },
  {
    cityA: 'Lahore',
    cityB: 'Faisalabad',
    std: { baseFee: 400, perKgFee: 90, codFeeFlat: 40, codFeePercent: 0.015 },
    exp: { baseFee: 600, perKgFee: 130, codFeeFlat: 50, codFeePercent: 0.02 },
  },
  {
    cityA: 'Lahore',
    cityB: 'Multan',
    std: { baseFee: 450, perKgFee: 90, codFeeFlat: 40, codFeePercent: 0.015 },
    exp: { baseFee: 650, perKgFee: 130, codFeeFlat: 50, codFeePercent: 0.02 },
  },
  {
    cityA: 'Islamabad',
    cityB: 'Faisalabad',
    std: { baseFee: 450, perKgFee: 90, codFeeFlat: 40, codFeePercent: 0.015 },
    exp: { baseFee: 650, perKgFee: 130, codFeeFlat: 50, codFeePercent: 0.02 },
  },
  {
    cityA: 'Islamabad',
    cityB: 'Multan',
    std: { baseFee: 550, perKgFee: 100, codFeeFlat: 45, codFeePercent: 0.02 },
    exp: { baseFee: 750, perKgFee: 150, codFeeFlat: 55, codFeePercent: 0.025 },
  },
  {
    cityA: 'Faisalabad',
    cityB: 'Multan',
    std: { baseFee: 400, perKgFee: 90, codFeeFlat: 40, codFeePercent: 0.015 },
    exp: { baseFee: 600, perKgFee: 130, codFeeFlat: 50, codFeePercent: 0.02 },
  },
];

async function main() {
  console.log('--- Seeding Euroshub Logistics initial database records ---');

  // 1. Singleton SystemSettings
  const systemSettings = await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    update: {
      companyName: 'Euroshub Logistics',
      companyPhone: '+92 21 32560001',
      companyEmail: 'support@euroshub.com',
      companyAddress: 'Karachi Logistics Park, Port Qasim, Karachi, Pakistan',
      currency: 'PKR',
      trackingPrefix: 'EHB',
    },
    create: {
      id: 'singleton',
      companyName: 'Euroshub Logistics',
      companyPhone: '+92 21 32560001',
      companyEmail: 'support@euroshub.com',
      companyAddress: 'Karachi Logistics Park, Port Qasim, Karachi, Pakistan',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      trackingPrefix: 'EHB',
      maxDeliveryAttempts: 3,
    },
  });
  console.log('SystemSettings seeded:', systemSettings.companyName);

  // 2. Hubs (Major Pakistan Logistics hubs with coordinates)
  const hubsData = [
    {
      code: 'KHI-01',
      name: 'Karachi Central Mega Hub',
      city: 'Karachi',
      address: 'Hub River Road, SITE Industrial Area, Karachi',
      phone: '+92 21 32560001',
      latitude: 24.8607,
      longitude: 67.0011,
    },
    {
      code: 'LHR-01',
      name: 'Lahore Gateway Hub',
      city: 'Lahore',
      address: 'Multan Road near Thokar Niaz Baig, Lahore',
      phone: '+92 42 37510002',
      latitude: 31.5204,
      longitude: 74.3587,
    },
    {
      code: 'ISB-01',
      name: 'Islamabad Capital Hub',
      city: 'Islamabad',
      address: 'Sector I-9/2 Industrial Area, Islamabad',
      phone: '+92 51 4430003',
      latitude: 33.6844,
      longitude: 73.0479,
    },
    {
      code: 'FSD-01',
      name: 'Faisalabad Industrial Hub',
      city: 'Faisalabad',
      address: 'Sargodha Road, Industrial Estate, Faisalabad',
      phone: '+92 41 8780004',
      latitude: 31.4504,
      longitude: 73.135,
    },
    {
      code: 'MUX-01',
      name: 'Multan Southern Hub',
      city: 'Multan',
      address: 'Khanewal Road, Industrial Area, Multan',
      phone: '+92 61 6510005',
      latitude: 30.1575,
      longitude: 71.5249,
    },
  ];

  for (const hub of hubsData) {
    await prisma.hub.upsert({
      where: { code: hub.code },
      update: hub,
      create: hub,
    });
  }

  // Fetch all active hubs currently in DB to dynamically drive matrix cities
  const allDbHubs = await prisma.hub.findMany({ where: { isActive: true } });
  const activeCities = Array.from(new Set(allDbHubs.map((h) => h.city.trim())));
  console.log(`Active Hub Cities in DB (${activeCities.length}): ${activeCities.join(', ')}`);

  // 3. Realistic Fictional Pricing Matrix (Section 3.9)
  // Build full target list of rules
  interface TargetRule {
    serviceType: ServiceType;
    originZone: string;
    destinationZone: string;
    baseFee: number;
    perKgFee: number;
    codFeeFlat: number;
    codFeePercent: number;
  }

  const targetRules: TargetRule[] = [];

  // A. Intra-city (same city) rules for each active city in DB
  for (const city of activeCities) {
    targetRules.push({
      serviceType: ServiceType.STANDARD,
      originZone: city,
      destinationZone: city,
      baseFee: 220,
      perKgFee: 60,
      codFeeFlat: 40,
      codFeePercent: 0.015,
    });
    targetRules.push({
      serviceType: ServiceType.EXPRESS,
      originZone: city,
      destinationZone: city,
      baseFee: 350,
      perKgFee: 90,
      codFeeFlat: 50,
      codFeePercent: 0.02,
    });
  }

  // B. Directional Intercity pairs (generate reciprocal rows automatically)
  for (const pair of FICTIONAL_INTERCITY_RATES) {
    // Only generate if both cities are active in the DB
    if (activeCities.includes(pair.cityA) && activeCities.includes(pair.cityB)) {
      // Forward: A -> B
      targetRules.push({
        serviceType: ServiceType.STANDARD,
        originZone: pair.cityA,
        destinationZone: pair.cityB,
        baseFee: pair.std.baseFee,
        perKgFee: pair.std.perKgFee,
        codFeeFlat: pair.std.codFeeFlat,
        codFeePercent: pair.std.codFeePercent,
      });
      targetRules.push({
        serviceType: ServiceType.EXPRESS,
        originZone: pair.cityA,
        destinationZone: pair.cityB,
        baseFee: pair.exp.baseFee,
        perKgFee: pair.exp.perKgFee,
        codFeeFlat: pair.exp.codFeeFlat,
        codFeePercent: pair.exp.codFeePercent,
      });

      // Reciprocal: B -> A
      targetRules.push({
        serviceType: ServiceType.STANDARD,
        originZone: pair.cityB,
        destinationZone: pair.cityA,
        baseFee: pair.std.baseFee,
        perKgFee: pair.std.perKgFee,
        codFeeFlat: pair.std.codFeeFlat,
        codFeePercent: pair.std.codFeePercent,
      });
      targetRules.push({
        serviceType: ServiceType.EXPRESS,
        originZone: pair.cityB,
        destinationZone: pair.cityA,
        baseFee: pair.exp.baseFee,
        perKgFee: pair.exp.perKgFee,
        codFeeFlat: pair.exp.codFeeFlat,
        codFeePercent: pair.exp.codFeePercent,
      });
    }
  }

  // C. Wildcard Fallback Rates (ANY <-> ANY)
  // Per Section 3.9: Must be priced at or above the most expensive mapped route
  // (Max mapped STANDARD base is 850; max mapped EXPRESS base is 1100)
  targetRules.push({
    serviceType: ServiceType.STANDARD,
    originZone: 'ANY',
    destinationZone: 'ANY',
    baseFee: 900,
    perKgFee: 150,
    codFeeFlat: 50,
    codFeePercent: 0.02,
  });
  targetRules.push({
    serviceType: ServiceType.EXPRESS,
    originZone: 'ANY',
    destinationZone: 'ANY',
    baseFee: 1200,
    perKgFee: 250,
    codFeeFlat: 70,
    codFeePercent: 0.025,
  });

  // D. Genuinely Idempotent Upsert & Drift Reconciliation
  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  for (const rule of targetRules) {
    const existing = await prisma.pricingRule.findFirst({
      where: {
        serviceType: rule.serviceType,
        originZone: rule.originZone,
        destinationZone: rule.destinationZone,
        isActive: true,
      },
    });

    if (!existing) {
      await prisma.pricingRule.create({
        data: {
          ...rule,
          isActive: true,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: null,
        },
      });
      createdCount++;
    } else {
      // Check if values have drifted
      const hasDrifted =
        existing.baseFee !== rule.baseFee ||
        existing.perKgFee !== rule.perKgFee ||
        existing.codFeeFlat !== rule.codFeeFlat ||
        Math.abs(existing.codFeePercent - rule.codFeePercent) > 0.0001;

      if (hasDrifted) {
        await prisma.pricingRule.update({
          where: { id: existing.id },
          data: {
            baseFee: rule.baseFee,
            perKgFee: rule.perKgFee,
            codFeeFlat: rule.codFeeFlat,
            codFeePercent: rule.codFeePercent,
          },
        });
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }
  }

  console.log(
    `Pricing rules seed complete: ${createdCount} created, ${updatedCount} updated, ${unchangedCount} unchanged.`
  );

  // 4. Tracking Counter for the current year
  const currentYear = new Date().getFullYear();
  await prisma.trackingCounter.upsert({
    where: { year: currentYear },
    update: {},
    create: { year: currentYear, lastSequence: 1000 },
  });
  console.log(`Tracking counter initialized for ${currentYear}.`);

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

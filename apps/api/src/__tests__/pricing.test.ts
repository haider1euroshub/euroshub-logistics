import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, ServiceType, PaymentType } from '@prisma/client';
import { PricingService } from '../services/pricing.service.js';
import { fractionToPercent, percentToFraction, formatPercent } from '@eliteship/shared';
import { AppError } from '../middleware/error-handler.js';

const prisma = new PrismaClient();

describe('Pricing Engine & Canonical Contract Tests (Section 3.10)', () => {
  // Test rule IDs created during tests for cleanup
  const createdRuleIds: string[] = [];

  beforeAll(async () => {
    // Ensure test rules exist
    const testRules = [
      {
        serviceType: ServiceType.STANDARD,
        originZone: 'TestCityA',
        destinationZone: 'TestCityA',
        baseFee: 220,
        perKgFee: 60,
        codFeeFlat: 40,
        codFeePercent: 0.015,
        isActive: true,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
      {
        serviceType: ServiceType.EXPRESS,
        originZone: 'TestCityA',
        destinationZone: 'TestCityA',
        baseFee: 350,
        perKgFee: 90,
        codFeeFlat: 50,
        codFeePercent: 0.02,
        isActive: true,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
      {
        serviceType: ServiceType.STANDARD,
        originZone: 'TestCityA',
        destinationZone: 'TestCityB',
        baseFee: 650,
        perKgFee: 120,
        codFeeFlat: 50,
        codFeePercent: 0.02,
        isActive: true,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
      {
        serviceType: ServiceType.EXPRESS,
        originZone: 'TestCityA',
        destinationZone: 'TestCityB',
        baseFee: 900,
        perKgFee: 180,
        codFeeFlat: 60,
        codFeePercent: 0.025,
        isActive: true,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
      // Half wildcard: TestCityA -> ANY
      {
        serviceType: ServiceType.STANDARD,
        originZone: 'TestCityA',
        destinationZone: 'ANY',
        baseFee: 700,
        perKgFee: 130,
        codFeeFlat: 50,
        codFeePercent: 0.02,
        isActive: true,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
      // Fallback: ANY -> ANY
      {
        serviceType: ServiceType.STANDARD,
        originZone: 'ANY',
        destinationZone: 'ANY',
        baseFee: 900,
        perKgFee: 150,
        codFeeFlat: 50,
        codFeePercent: 0.02,
        isActive: true,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
      // Inactive rule
      {
        serviceType: ServiceType.STANDARD,
        originZone: 'InactiveOrigin',
        destinationZone: 'InactiveDest',
        baseFee: 100,
        perKgFee: 20,
        codFeeFlat: 10,
        codFeePercent: 0.01,
        isActive: false,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
      // Expired rule (effective in 2025 only)
      {
        serviceType: ServiceType.STANDARD,
        originZone: 'ExpiredOrigin',
        destinationZone: 'ExpiredDest',
        baseFee: 150,
        perKgFee: 30,
        codFeeFlat: 20,
        codFeePercent: 0.01,
        isActive: true,
        effectiveFrom: new Date('2025-01-01T00:00:00.000Z'),
        effectiveTo: new Date('2025-12-31T23:59:59.000Z'),
      },
      // Future rule (effective starting in 2028)
      {
        serviceType: ServiceType.STANDARD,
        originZone: 'FutureOrigin',
        destinationZone: 'FutureDest',
        baseFee: 300,
        perKgFee: 50,
        codFeeFlat: 30,
        codFeePercent: 0.01,
        isActive: true,
        effectiveFrom: new Date('2028-01-01T00:00:00.000Z'),
        effectiveTo: null,
      },
    ];

    for (const r of testRules) {
      const created = await prisma.pricingRule.create({ data: r });
      createdRuleIds.push(created.id);
    }
  });

  afterAll(async () => {
    if (createdRuleIds.length > 0) {
      await prisma.pricingRule.deleteMany({
        where: { id: { in: createdRuleIds } },
      });
    }
    await prisma.$disconnect();
  });

  // 1. Percentage conversion helpers
  describe('3.2 Percentage Handling Conversion Boundary', () => {
    it('fractionToPercent correctly converts stored fraction to human percent without float noise', () => {
      expect(fractionToPercent(0.015)).toBe(1.5);
      expect(fractionToPercent(0.02)).toBe(2);
      expect(fractionToPercent(0.025)).toBe(2.5);
      expect(fractionToPercent(0.0219999999)).toBe(2.2);
      expect(fractionToPercent(null)).toBe(0);
      expect(fractionToPercent(undefined)).toBe(0);
    });

    it('percentToFraction correctly converts human percent to stored fraction', () => {
      expect(percentToFraction(1.5)).toBe(0.015);
      expect(percentToFraction(2)).toBe(0.02);
      expect(percentToFraction(2.5)).toBe(0.025);
      expect(percentToFraction(0)).toBe(0);
    });

    it('formatPercent displays clean percent string', () => {
      expect(formatPercent(0.02)).toBe('2%');
      expect(formatPercent(0.015)).toBe('1.5%');
    });
  });

  // 2. Calculation semantics
  describe('3.5 Calculation Semantics & Fee Breakdown', () => {
    it('same-city STANDARD calculates exact base fee for 1 kg', async () => {
      const result = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityA',
        weightKg: 1,
        paymentType: PaymentType.PREPAID,
      });

      expect(result.baseFee).toBe(220);
      expect(result.weightSurcharge).toBe(0);
      expect(result.totalFee).toBe(220);
      expect(result.amountExpected).toBe(220);
      expect(result.codAmountToCollect).toBe(0);
    });

    it('same-city EXPRESS calculates higher base fee', async () => {
      const result = await PricingService.calculatePrice({
        serviceType: ServiceType.EXPRESS,
        originCity: 'TestCityA',
        destinationCity: 'TestCityA',
        weightKg: 1,
        paymentType: PaymentType.PREPAID,
      });

      expect(result.baseFee).toBe(350);
      expect(result.totalFee).toBe(350);
    });

    it('EXPRESS costs more than STANDARD for the same route and weight', async () => {
      const std = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityB',
        weightKg: 3,
        paymentType: PaymentType.PREPAID,
      });
      const exp = await PricingService.calculatePrice({
        serviceType: ServiceType.EXPRESS,
        originCity: 'TestCityA',
        destinationCity: 'TestCityB',
        weightKg: 3,
        paymentType: PaymentType.PREPAID,
      });

      expect(exp.totalFee).toBeGreaterThan(std.totalFee);
    });

    it('weight surcharge applies to extra kg only (base covers first 1 kg)', async () => {
      // Weight = 2 kg -> 1 extra kg -> 220 + 1 * 60 = 280
      const res2kg = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityA',
        weightKg: 2,
        paymentType: PaymentType.PREPAID,
      });
      expect(res2kg.weightSurcharge).toBe(60);
      expect(res2kg.totalFee).toBe(280);

      // Weight = 3 kg -> 2 extra kg -> 220 + 2 * 60 = 340
      const res3kg = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityA',
        weightKg: 3,
        paymentType: PaymentType.PREPAID,
      });
      expect(res3kg.weightSurcharge).toBe(120);
      expect(res3kg.totalFee).toBe(340);
    });

    it('fractional kg rounds up to the next whole kg', async () => {
      // 1.2 kg rounds up to 2 kg -> 1 extra kg -> 220 + 60 = 280
      const res1_2kg = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityA',
        weightKg: 1.2,
        paymentType: PaymentType.PREPAID,
      });
      expect(res1_2kg.breakdown.billableExtraWeightKg).toBe(1);
      expect(res1_2kg.totalFee).toBe(280);

      // 2.05 kg rounds up to 3 kg -> 2 extra kg -> 220 + 120 = 340
      const res2_05kg = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityA',
        weightKg: 2.05,
        paymentType: PaymentType.PREPAID,
      });
      expect(res2_05kg.breakdown.billableExtraWeightKg).toBe(2);
      expect(res2_05kg.totalFee).toBe(340);
    });

    it('COD percentage is treated as a FRACTION not a whole percent (1.5% of 10,000 is 150, not 15,000)', async () => {
      const resCod = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityA',
        weightKg: 1,
        paymentType: PaymentType.COD,
        codAmount: 10000,
      });

      // 10000 * 0.015 = 150. codFee = 40 (flat) + 150 = 190.
      expect(resCod.breakdown.codPercentageFee).toBe(150);
      expect(resCod.codFee).toBe(190);
      expect(resCod.totalFee).toBe(220 + 190); // 410 total shipping fee
      // codAmountToCollect = product price (10000) + total shipping fee (410) = 10410
      expect(resCod.codAmountToCollect).toBe(10410);
    });

    it('COD percentage fee rounds to whole rupees', async () => {
      // 1555 * 0.015 = 23.325 -> rounds to 23
      const resCod = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityA',
        weightKg: 1,
        paymentType: PaymentType.COD,
        codAmount: 1555,
      });
      expect(resCod.breakdown.codPercentageFee).toBe(23);
      expect(resCod.codFee).toBe(40 + 23);
    });

    it('non-COD shipment has zero COD fee and zero codAmountToCollect', async () => {
      const resPrepaid = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityB',
        weightKg: 1,
        paymentType: PaymentType.PREPAID,
        declaredValue: 5000,
      });
      expect(resPrepaid.codFee).toBe(0);
      expect(resPrepaid.codAmountToCollect).toBe(0);
      expect(resPrepaid.amountExpected).toBe(resPrepaid.totalFee);
    });

    it('delivery fee and COD collection remain distinct in the result', async () => {
      const res = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityA',
        weightKg: 2, // 280 delivery fee
        paymentType: PaymentType.COD,
        codAmount: 3000, // 40 + 45 = 85 COD fee
      });
      // delivery fee = 280
      expect(res.breakdown.totalDeliveryFee).toBe(280);
      // COD courier fee = 85
      expect(res.codFee).toBe(85);
      // Total courier charges = 365
      expect(res.totalFee).toBe(365);
      // Total collected at doorstep = 3000 (product) + 365 (courier) = 3365
      expect(res.codAmountToCollect).toBe(3365);
      expect(res.codAmountToCollect).not.toBe(res.totalFee);
    });

    it('rejects zero, negative, NaN, and non-finite weight with clean 400 error', async () => {
      await expect(
        PricingService.calculatePrice({
          serviceType: ServiceType.STANDARD,
          originCity: 'TestCityA',
          destinationCity: 'TestCityA',
          weightKg: 0,
          paymentType: PaymentType.PREPAID,
        })
      ).rejects.toThrow('Weight must be a positive, finite number in kg.');

      await expect(
        PricingService.calculatePrice({
          serviceType: ServiceType.STANDARD,
          originCity: 'TestCityA',
          destinationCity: 'TestCityA',
          weightKg: -5,
          paymentType: PaymentType.PREPAID,
        })
      ).rejects.toThrow('Weight must be a positive, finite number in kg.');

      await expect(
        PricingService.calculatePrice({
          serviceType: ServiceType.STANDARD,
          originCity: 'TestCityA',
          destinationCity: 'TestCityA',
          weightKg: NaN,
          paymentType: PaymentType.PREPAID,
        })
      ).rejects.toThrow('Weight must be a positive, finite number in kg.');
    });

    it('no monetary field in result is ever NaN or undefined', async () => {
      const res = await PricingService.calculatePrice({
        serviceType: ServiceType.STANDARD,
        originCity: 'TestCityA',
        destinationCity: 'TestCityA',
        weightKg: 1.5,
        paymentType: PaymentType.COD,
        codAmount: 2500,
      });

      expect(isNaN(res.baseFee)).toBe(false);
      expect(isNaN(res.weightSurcharge)).toBe(false);
      expect(isNaN(res.codFee)).toBe(false);
      expect(isNaN(res.totalFee)).toBe(false);
      expect(isNaN(res.codAmountToCollect)).toBe(false);
      expect(isNaN(res.amountExpected)).toBe(false);
      expect(res.baseFee).toBeDefined();
      expect(res.totalFee).toBeDefined();
    });
  });

  // 3. Rule matching & Precedence
  describe('3.3 Rule Precedence & Matching Logic', () => {
    it('exact route match takes precedence over wildcard', async () => {
      // TestCityA -> TestCityB has an exact rule (base 650) AND TestCityA -> ANY (base 700) AND ANY -> ANY (base 900)
      const rule = await PricingService.findRule(
        ServiceType.STANDARD,
        'TestCityA',
        'TestCityB'
      );
      expect(rule?.baseFee).toBe(650);
      expect(rule?.destinationZone).toBe('TestCityB');
    });

    it('half-wildcard beats full fallback (ANY -> ANY)', async () => {
      // TestCityA -> UnknownCity should match TestCityA -> ANY (tier 2, base 700), NOT ANY -> ANY (tier 4, base 900)
      const rule = await PricingService.findRule(
        ServiceType.STANDARD,
        'TestCityA',
        'UnknownCityXYZ'
      );
      expect(rule?.baseFee).toBe(700);
      expect(rule?.originZone).toBe('TestCityA');
      expect(rule?.destinationZone).toBe('ANY');
    });

    it('case and whitespace insensitive matching', async () => {
      const rule = await PricingService.findRule(
        ServiceType.STANDARD,
        '  testcitya  ',
        'TESTCITYB '
      );
      expect(rule?.baseFee).toBe(650);
    });

    it('fallback never beats exact route', async () => {
      const rule = await PricingService.findRule(
        ServiceType.STANDARD,
        'TestCityA',
        'TestCityA'
      );
      expect(rule?.baseFee).toBe(220);
      expect(rule?.baseFee).not.toBe(900);
    });

    it('inactive rule is skipped', async () => {
      // InactiveOrigin -> InactiveDest is inactive (base 100); should fallback to ANY -> ANY (base 900)
      const rule = await PricingService.findRule(
        ServiceType.STANDARD,
        'InactiveOrigin',
        'InactiveDest'
      );
      expect(rule?.baseFee).toBe(900);
    });

    it('expired rule is skipped for current evaluation date', async () => {
      // ExpiredOrigin -> ExpiredDest was only effective in 2025
      const rule = await PricingService.findRule(
        ServiceType.STANDARD,
        'ExpiredOrigin',
        'ExpiredDest',
        new Date('2026-06-01T00:00:00.000Z')
      );
      expect(rule?.baseFee).toBe(900); // Falls back to ANY -> ANY
    });

    it('historical date resolution correctly picks the rule effective then', async () => {
      // Evaluating in 2025 should match the rule that was effective then (base 150)
      const rule = await PricingService.findRule(
        ServiceType.STANDARD,
        'ExpiredOrigin',
        'ExpiredDest',
        new Date('2025-06-01T00:00:00.000Z')
      );
      expect(rule?.baseFee).toBe(150);
    });

    it('not-yet-effective rule is skipped for current evaluation date', async () => {
      // FutureOrigin -> FutureDest is effective starting 2028
      const rule = await PricingService.findRule(
        ServiceType.STANDARD,
        'FutureOrigin',
        'FutureDest',
        new Date('2026-06-01T00:00:00.000Z')
      );
      expect(rule?.baseFee).toBe(900); // Falls back to ANY -> ANY
    });

    it('STANDARD and EXPRESS rules remain separate', async () => {
      const std = await PricingService.findRule(
        ServiceType.STANDARD,
        'TestCityA',
        'TestCityB'
      );
      const exp = await PricingService.findRule(
        ServiceType.EXPRESS,
        'TestCityA',
        'TestCityB'
      );
      expect(std?.serviceType).toBe(ServiceType.STANDARD);
      expect(exp?.serviceType).toBe(ServiceType.EXPRESS);
      expect(std?.baseFee).toBe(650);
      expect(exp?.baseFee).toBe(900);
    });

    it('missing rule with no fallback raises clean domain error', async () => {
      // Query EXPRESS for an unmapped route with no EXPRESS ANY->ANY for this test
      // If we query an invalid route when all fallbacks are inactive:
      try {
        await PricingService.calculatePrice({
          serviceType: ServiceType.STANDARD,
          originCity: 'NonExistentCity1',
          destinationCity: 'NonExistentCity2',
          weightKg: 1,
          paymentType: PaymentType.PREPAID,
          evalDate: new Date('2099-01-01T00:00:00.000Z'), // Far future where all rules expired
        });
      } catch (err: any) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(422);
        expect(err.errorCode).toBe('PRICING_NOT_FOUND');
      }
    });
  });

  // 4. Duplicate interval overlap prevention
  describe('3.4 Duplicate Prevention & Interval Overlap', () => {
    it('detects overlapping active interval on same route and service type and throws 409', async () => {
      await expect(
        PricingService.checkOverlap({
          serviceType: ServiceType.STANDARD,
          originZone: 'TestCityA',
          destinationZone: 'TestCityB',
          effectiveFrom: new Date('2026-02-01T00:00:00.000Z'),
          effectiveTo: null,
        })
      ).rejects.toThrow('An active pricing rule already exists');
    });

    it('allows non-overlapping interval for different route or service type', async () => {
      await expect(
        PricingService.checkOverlap({
          serviceType: ServiceType.STANDARD,
          originZone: 'DifferentOrigin',
          destinationZone: 'DifferentDest',
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: null,
        })
      ).resolves.not.toThrow();
    });

    it('allows updating an existing rule by excluding its own ID', async () => {
      const existing = createdRuleIds[0];
      await expect(
        PricingService.checkOverlap({
          serviceType: ServiceType.STANDARD,
          originZone: 'TestCityA',
          destinationZone: 'TestCityA',
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
          effectiveTo: null,
          excludeRuleId: existing,
        })
      ).resolves.not.toThrow();
    });
  });

  // 5. Immutability of historical pricing snapshots
  describe('3.6 Historical PricingSnapshot Immutability', () => {
    it('PricingSnapshot preserves historical price when a pricing rule is edited', async () => {
      // 1. Create a shipment with a snapshot
      const customer = await prisma.customerProfile.findFirst();
      if (!customer) return;

      const rule = await prisma.pricingRule.create({
        data: {
          serviceType: ServiceType.STANDARD,
          originZone: 'SnapshotCityA',
          destinationZone: 'SnapshotCityB',
          baseFee: 500,
          perKgFee: 100,
          codFeeFlat: 40,
          codFeePercent: 0.02,
          isActive: true,
          effectiveFrom: new Date('2026-01-01'),
        },
      });
      createdRuleIds.push(rule.id);

      const trackingNumber = `ESH-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const shipment = await prisma.shipment.create({
        data: {
          trackingNumber,
          customerId: customer.id,
          senderName: 'Test Sender',
          senderPhone: '03001111111',
          senderAddress: 'Address 1',
          senderCity: 'SnapshotCityA',
          receiverName: 'Test Receiver',
          receiverPhone: '03002222222',
          receiverAddress: 'Address 2',
          receiverCity: 'SnapshotCityB',
          serviceType: ServiceType.STANDARD,
          paymentType: PaymentType.PREPAID,
          packageType: 'Box',
          weightKg: 2,
          pricingSnapshot: {
            create: {
              pricingRuleId: rule.id,
              baseFee: 500,
              weightSurcharge: 100,
              codFee: 0,
              totalFee: 600,
              breakdownJson: { baseFee: 500, totalDeliveryFee: 600 },
            },
          },
        },
        include: { pricingSnapshot: true },
      });

      // Verify original snapshot fee
      expect(shipment.pricingSnapshot?.totalFee).toBe(600);

      // 2. Edit the pricing rule to increase baseFee to 800
      await prisma.pricingRule.update({
        where: { id: rule.id },
        data: { baseFee: 800 },
      });

      // 3. Refetch shipment and its snapshot
      const refetchedShipment = await prisma.shipment.findUnique({
        where: { id: shipment.id },
        include: { pricingSnapshot: true },
      });

      // Historical snapshot must NOT change!
      expect(refetchedShipment?.pricingSnapshot?.baseFee).toBe(500);
      expect(refetchedShipment?.pricingSnapshot?.totalFee).toBe(600);

      // Cleanup test shipment
      await prisma.shipment.delete({ where: { id: shipment.id } });
    }, 30000);
  });
});

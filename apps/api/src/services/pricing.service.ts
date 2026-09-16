import { Prisma, ServiceType, PaymentType, PricingRule } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';

export interface PricingCalculationResult {
  ruleId?: string;
  baseFee: number;
  weightSurcharge: number;
  codFee: number;
  totalFee: number;
  codAmountToCollect: number;
  amountExpected: number;
  breakdown: {
    serviceType: ServiceType;
    originZone: string;
    destinationZone: string;
    weightKg: number;
    baseFee: number;
    perKgFee: number;
    billableExtraWeightKg: number;
    weightSurcharge: number;
    paymentType: PaymentType;
    codFeeFlat: number;
    codFeePercent: number;
    codPercentageFee: number;
    codFee: number;
    declaredOrCodAmount: number;
    totalDeliveryFee: number;
  };
}

export class PricingService {
  /**
   * Normalizes a city/zone string for matching or storage.
   * Wildcard string "ANY" (case-insensitive) is stored/matched as canonical "ANY".
   */
  static normalizeZone(zone: string): string {
    const trimmed = zone.trim();
    if (trimmed.toUpperCase() === 'ANY') {
      return 'ANY';
    }
    return trimmed;
  }

  /**
   * Checks whether an active rule overlaps an existing active rule for the same route and service type.
   * Treats null effectiveTo as open-ended (+infinity).
   * Throws 409 Conflict if an overlap exists.
   */
  static async checkOverlap(params: {
    serviceType: ServiceType;
    originZone: string;
    destinationZone: string;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    excludeRuleId?: string;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const db = params.tx || prisma;
    const origin = this.normalizeZone(params.originZone).toUpperCase();
    const dest = this.normalizeZone(params.destinationZone).toUpperCase();
    const fromA = params.effectiveFrom;
    const toA = params.effectiveTo || null;

    const existingRules = await db.pricingRule.findMany({
      where: {
        serviceType: params.serviceType,
        isActive: true,
        ...(params.excludeRuleId ? { id: { not: params.excludeRuleId } } : {}),
      },
    });

    for (const rule of existingRules) {
      const rOrigin = this.normalizeZone(rule.originZone).toUpperCase();
      const rDest = this.normalizeZone(rule.destinationZone).toUpperCase();

      if (rOrigin !== origin || rDest !== dest) {
        continue;
      }

      const fromB = rule.effectiveFrom;
      const toB = rule.effectiveTo;

      // Intervals [fromA, toA] and [fromB, toB] overlap iff (toA is null or toA >= fromB) and (toB is null or toB >= fromA)
      const overlaps = (toA === null || toA >= fromB) && (toB === null || toB >= fromA);

      if (overlaps) {
        throw new AppError(
          `An active pricing rule already exists for ${params.serviceType} between "${params.originZone}" and "${params.destinationZone}" with an overlapping effective period.`,
          409,
          'PRICING_RULE_OVERLAP'
        );
      }
    }
  }

  /**
   * Find matching active PricingRule with strict 4-tier precedence:
   *  1. exact origin + exact destination
   *  2. exact origin + ANY destination
   *  3. ANY origin + exact destination
   *  4. ANY origin + ANY destination
   *
   * Only rules whose effective window contains evalDate are eligible:
   *  effectiveFrom <= evalDate && (effectiveTo === null || effectiveTo >= evalDate)
   *
   * Deterministic ordering applied for rule selection.
   */
  static async findRule(
    serviceType: ServiceType,
    originCity: string,
    destinationCity: string,
    evalDate: Date = new Date(),
    tx?: Prisma.TransactionClient
  ): Promise<PricingRule | null> {
    const db = tx || prisma;
    const origin = this.normalizeZone(originCity).toUpperCase();
    const destination = this.normalizeZone(destinationCity).toUpperCase();

    // Fetch all eligible active rules for this serviceType whose effective window contains evalDate
    const candidateRules = await db.pricingRule.findMany({
      where: {
        serviceType,
        isActive: true,
        effectiveFrom: { lte: evalDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: evalDate } },
        ],
      },
      orderBy: [
        { effectiveFrom: 'desc' },
        { createdAt: 'desc' },
        { id: 'asc' },
      ],
    });

    let bestRule: PricingRule | null = null;
    let bestTier = 5;

    for (const rule of candidateRules) {
      const rOrigin = this.normalizeZone(rule.originZone).toUpperCase();
      const rDest = this.normalizeZone(rule.destinationZone).toUpperCase();

      let tier = 5;
      if (rOrigin === origin && rDest === destination) {
        tier = 1;
      } else if (rOrigin === origin && rDest === 'ANY') {
        tier = 2;
      } else if (rOrigin === 'ANY' && rDest === destination) {
        tier = 3;
      } else if (rOrigin === 'ANY' && rDest === 'ANY') {
        tier = 4;
      }

      if (tier < bestTier) {
        bestTier = tier;
        bestRule = rule;
        if (bestTier === 1) break; // Highest possible precedence reached
      }
    }

    return bestRule;
  }

  /**
   * Authoritative calculation per Section 3
   */
  static async calculatePrice(params: {
    serviceType: ServiceType;
    originCity: string;
    destinationCity: string;
    weightKg: number;
    paymentType: PaymentType;
    codAmount?: number | null;
    declaredValue?: number | null;
    evalDate?: Date;
    tx?: Prisma.TransactionClient;
  }): Promise<PricingCalculationResult> {
    const {
      serviceType,
      originCity,
      destinationCity,
      weightKg,
      paymentType,
      codAmount,
      declaredValue,
      evalDate = new Date(),
      tx,
    } = params;

    // Validate weightKg strictly before touching DB
    if (
      weightKg === null ||
      weightKg === undefined ||
      isNaN(weightKg) ||
      !isFinite(weightKg) ||
      weightKg <= 0
    ) {
      throw new AppError('Weight must be a positive, finite number in kg.', 400, 'INVALID_WEIGHT');
    }

    const rule = await this.findRule(serviceType, originCity, destinationCity, evalDate, tx);
    if (!rule) {
      throw new AppError(
        `No pricing rule configured for route from ${originCity} to ${destinationCity} (${serviceType}).`,
        422,
        'PRICING_NOT_FOUND'
      );
    }

    // 1. Base fee covers the first billable kg; each additional whole kg is charged
    // Fractional weight rounded UP to next whole kg
    const baseFee = rule.baseFee;
    const billableExtraWeight = Math.max(0, Math.ceil(weightKg) - 1);
    const weightSurcharge = billableExtraWeight * rule.perKgFee;
    const totalDeliveryFee = baseFee + weightSurcharge;

    // 2. COD Fee: codFeeFlat + round(collected amount * codFeePercent)
    let codFee = 0;
    let codPercentageFee = 0;
    const declaredOrCodAmount = paymentType === PaymentType.COD
      ? (codAmount || declaredValue || 0)
      : (declaredValue || 0);

    if (paymentType === PaymentType.COD) {
      codPercentageFee = Math.round(declaredOrCodAmount * rule.codFeePercent);
      codFee = rule.codFeeFlat + codPercentageFee;
    }

    const totalFee = totalDeliveryFee + codFee;

    // 3. COD Total to collect vs Payment Expected
    // For COD: driver collects product price/declared value + total delivery fee + codFee at door
    // For PREPAID: sender pays total courier fee upfront
    const codAmountToCollect = paymentType === PaymentType.COD
      ? declaredOrCodAmount + totalFee
      : 0;

    const amountExpected = paymentType === PaymentType.COD
      ? codAmountToCollect
      : totalFee;

    return {
      ruleId: rule.id,
      baseFee,
      weightSurcharge,
      codFee,
      totalFee,
      codAmountToCollect,
      amountExpected,
      breakdown: {
        serviceType,
        originZone: rule.originZone,
        destinationZone: rule.destinationZone,
        weightKg,
        baseFee,
        perKgFee: rule.perKgFee,
        billableExtraWeightKg: billableExtraWeight,
        weightSurcharge,
        paymentType,
        codFeeFlat: rule.codFeeFlat,
        codFeePercent: rule.codFeePercent,
        codPercentageFee,
        codFee,
        declaredOrCodAmount,
        totalDeliveryFee,
      },
    };
  }
}

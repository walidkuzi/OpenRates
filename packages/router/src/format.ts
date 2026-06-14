import { formatRate, inverseRate } from "@openrates/core";
import type { ConversionResult, RateResult, SeriesResult } from "./types";

export type ResponseDetail = "compact" | "standard" | "full";

function safeInverse(rate: string): string | undefined {
  try {
    return formatRate(inverseRate(rate));
  } catch {
    return undefined;
  }
}

export function shapeRate(
  result: RateResult,
  detail: ResponseDetail = "standard",
): Record<string, unknown> {
  const rate = result.rate;
  const mainWarning = rate.warnings[0];

  if (detail === "compact") {
    return {
      base: rate.baseCurrency,
      quote: rate.quoteCurrency,
      rate: formatRate(rate.rate),
      rateType: rate.rateType,
      effectiveDate: rate.effectiveDate,
      provider: rate.providerId,
      freshness: rate.freshnessClass,
      isLive: rate.isLive,
      ...(mainWarning !== undefined ? { warning: mainWarning } : {}),
    };
  }

  const standard: Record<string, unknown> = {
    base: rate.baseCurrency,
    quote: rate.quoteCurrency,
    rate: formatRate(rate.rate),
    rateType: rate.rateType,
    mode: rate.mode,
    effectiveDate: rate.effectiveDate,
    freshness: rate.freshnessClass,
    isLive: rate.isLive,
    isStale: rate.isStale,
    calculationMethod: rate.calculationMethod,
    provider: rate.providerId,
    providerName: rate.providerName,
    confidence: { score: rate.confidenceScore, label: rate.confidenceLabel },
    fallbackUsed: result.route.fallbackUsed,
    warnings: rate.warnings,
  };

  if (detail === "standard") {
    return standard;
  }

  return {
    ...standard,
    rateFullPrecision: rate.rate,
    inverseRate: safeInverse(rate.rate),
    timestamps: {
      effectiveDate: rate.effectiveDate,
      observedAt: rate.observedAt,
      publishedAt: rate.publishedAt,
      retrievedAt: rate.retrievedAt,
    },
    freshnessSeconds: rate.freshnessSeconds,
    route: result.route,
    cache: result.cache,
    originalSourceIds: rate.originalSourceIds,
    crossCurrency: rate.crossCurrency,
    metadata: rate.metadata,
  };
}

export function shapeConversion(
  result: ConversionResult,
  detail: ResponseDetail = "standard",
): Record<string, unknown> {
  const conversion = result.conversion;
  const rate = conversion.rate;
  const mainWarning = rate.warnings[0];

  if (detail === "compact") {
    return {
      from: conversion.input.from,
      to: conversion.input.to,
      amount: conversion.input.amount,
      rate: formatRate(rate.rate),
      convertedAmount: conversion.result.roundedAmount,
      rateType: rate.rateType,
      effectiveDate: rate.effectiveDate,
      provider: rate.providerId,
      freshness: rate.freshnessClass,
      isLive: rate.isLive,
      ...(mainWarning !== undefined ? { warning: mainWarning } : {}),
    };
  }

  const standard: Record<string, unknown> = {
    from: conversion.input.from,
    to: conversion.input.to,
    amount: conversion.input.amount,
    rate: formatRate(rate.rate),
    convertedAmount: conversion.result.roundedAmount,
    rounding: { minorUnits: conversion.result.minorUnits, mode: conversion.result.roundingMode },
    rateType: rate.rateType,
    mode: rate.mode,
    effectiveDate: rate.effectiveDate,
    freshness: rate.freshnessClass,
    isLive: rate.isLive,
    isStale: rate.isStale,
    calculationMethod: rate.calculationMethod,
    provider: rate.providerId,
    providerName: rate.providerName,
    confidence: { score: rate.confidenceScore, label: rate.confidenceLabel },
    fallbackUsed: result.route.fallbackUsed,
    fees: conversion.fees,
    warnings: rate.warnings,
    disclaimer: conversion.disclaimer,
  };

  if (detail === "standard") {
    return standard;
  }

  return {
    ...standard,
    unroundedAmount: conversion.result.unroundedAmount,
    rateFullPrecision: rate.rate,
    inverseRate: safeInverse(rate.rate),
    timestamps: {
      effectiveDate: rate.effectiveDate,
      observedAt: rate.observedAt,
      publishedAt: rate.publishedAt,
      retrievedAt: rate.retrievedAt,
    },
    route: result.route,
    cache: result.cache,
  };
}

export function shapeSeries(
  result: SeriesResult,
  detail: ResponseDetail = "standard",
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    base: result.baseCurrency,
    quote: result.quoteCurrency,
    startDate: result.startDate,
    endDate: result.endDate,
    mode: result.mode,
    provider: result.provider,
    rateType: result.rateType,
    count: result.points.length,
    points: result.points,
  };
  if (detail === "full") {
    return { ...base, cache: result.cache };
  }
  return base;
}

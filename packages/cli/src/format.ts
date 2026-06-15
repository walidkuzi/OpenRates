import { formatRate } from "@openrates/core";
import type { ConversionResult, RateResult, SeriesResult } from "@openrates/router";

export function formatRateHuman(result: RateResult): string {
  const rate = result.rate;
  const lines = [
    `1 ${rate.baseCurrency} = ${formatRate(rate.rate)} ${rate.quoteCurrency}`,
    `  rate type:  ${rate.rateType}`,
    `  effective:  ${rate.effectiveDate}`,
    `  provider:   ${rate.providerId}`,
    `  freshness:  ${rate.freshnessClass} (live: ${rate.isLive})`,
    `  confidence: ${rate.confidenceLabel} (${rate.confidenceScore.toFixed(2)})`,
  ];
  for (const warning of rate.warnings) {
    lines.push(`  ! ${warning}`);
  }
  return lines.join("\n");
}

export function formatConversionHuman(result: ConversionResult): string {
  const conversion = result.conversion;
  const rate = conversion.rate;
  const lines = [
    `${conversion.input.amount} ${conversion.input.from} = ${conversion.result.roundedAmount} ${conversion.input.to}`,
    `  rate:       ${formatRate(rate.rate)} (${rate.rateType})`,
    `  effective:  ${rate.effectiveDate}`,
    `  provider:   ${rate.providerId}`,
    `  freshness:  ${rate.freshnessClass} (live: ${rate.isLive})`,
  ];
  if (conversion.fees?.estimatedReceivedAmount !== undefined) {
    lines.push(
      `  after fees: ${conversion.fees.estimatedReceivedAmount} ${conversion.input.to} (cost ${conversion.fees.totalEstimatedCost})`,
    );
  }
  for (const warning of rate.warnings) {
    lines.push(`  ! ${warning}`);
  }
  lines.push(`  note: ${conversion.disclaimer}`);
  return lines.join("\n");
}

export function formatSeriesHuman(result: SeriesResult): string {
  const lines = [
    `${result.baseCurrency}/${result.quoteCurrency} ${result.startDate}..${result.endDate} (${result.provider}, ${result.points.length} points)`,
  ];
  for (const point of result.points) {
    lines.push(`  ${point.date}  ${formatRate(point.rate)}${point.filled ? "  (filled)" : ""}`);
  }
  return lines.join("\n");
}

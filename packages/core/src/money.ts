import type { Fees, MoneyConversionResult, NormalizedRate } from "@openrates/schemas";
import { Decimal, type DecimalValue, HALF_EVEN } from "./decimal";
import { DEFAULT_DISCLAIMER } from "./disclaimer";

export const DEFAULT_MINOR_UNITS = 2;

export interface FeeInput {
  fixedFee?: string;
  percentageFee?: string;
  spreadPercentage?: string;
}

export interface ConvertMoneyInput {
  amount: string;
  rate: NormalizedRate;
  toMinorUnits: number | null | undefined;
  fees?: FeeInput;
}

export interface ConvertMoneyOptions {
  disclaimer?: string;
}

function resolveMinorUnits(minorUnits: number | null | undefined): {
  minorUnits: number;
  unknown: boolean;
} {
  if (minorUnits === null || minorUnits === undefined) {
    return { minorUnits: DEFAULT_MINOR_UNITS, unknown: true };
  }
  return { minorUnits, unknown: false };
}

function round(value: DecimalValue, minorUnits: number): DecimalValue {
  return value.toDecimalPlaces(minorUnits, HALF_EVEN);
}

function hasFeeInput(fees: FeeInput | undefined): fees is FeeInput {
  return (
    fees !== undefined &&
    (fees.fixedFee !== undefined ||
      fees.percentageFee !== undefined ||
      fees.spreadPercentage !== undefined)
  );
}

function computeFees(
  fees: FeeInput,
  gross: DecimalValue,
  roundedGross: DecimalValue,
  minorUnits: number,
): Fees {
  const hundred = new Decimal(100);
  let received = gross;
  const output: Fees = {};

  if (fees.spreadPercentage !== undefined) {
    const spread = new Decimal(fees.spreadPercentage);
    received = received.mul(hundred.minus(spread).div(hundred));
    output.spreadPercentage = fees.spreadPercentage;
  }
  if (fees.percentageFee !== undefined) {
    const percentage = new Decimal(fees.percentageFee);
    received = received.mul(hundred.minus(percentage).div(hundred));
    output.percentageFee = fees.percentageFee;
  }
  if (fees.fixedFee !== undefined) {
    received = received.minus(new Decimal(fees.fixedFee));
    output.fixedFee = fees.fixedFee;
  }

  const estimatedReceived = round(received, minorUnits);
  const totalCost = roundedGross.minus(estimatedReceived);

  output.estimatedReceivedAmount = estimatedReceived.toFixed(minorUnits);
  output.totalEstimatedCost = totalCost.toFixed(minorUnits);
  return output;
}

export function convertMoney(
  input: ConvertMoneyInput,
  options: ConvertMoneyOptions = {},
): MoneyConversionResult {
  const amount = new Decimal(input.amount);
  const rateValue = new Decimal(input.rate.rate);
  const { minorUnits, unknown } = resolveMinorUnits(input.toMinorUnits);

  const gross = amount.mul(rateValue);
  const roundedGross = round(gross, minorUnits);

  const warnings = [...input.rate.warnings];
  if (unknown) {
    warnings.push(
      `Minor units for ${input.rate.quoteCurrency} are unknown; defaulted to ${DEFAULT_MINOR_UNITS}.`,
    );
  }

  const rate: NormalizedRate =
    warnings.length === input.rate.warnings.length ? input.rate : { ...input.rate, warnings };

  const result: MoneyConversionResult = {
    input: {
      amount: input.amount,
      from: input.rate.baseCurrency,
      to: input.rate.quoteCurrency,
    },
    rate,
    result: {
      unroundedAmount: gross.toString(),
      roundedAmount: roundedGross.toFixed(minorUnits),
      minorUnits,
      roundingMode: "half_even",
    },
    disclaimer: options.disclaimer ?? DEFAULT_DISCLAIMER,
  };

  if (hasFeeInput(input.fees)) {
    result.fees = computeFees(input.fees, gross, roundedGross, minorUnits);
  }

  return result;
}

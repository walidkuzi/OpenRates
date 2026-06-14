import assert from "node:assert/strict";
import { type ErrorCode, OpenRatesError } from "@openrates/schemas";
import type { ExchangeRateProvider, ProviderRate } from "./types";

export interface ContractHarness {
  describe: (name: string, fn: () => void) => void;
  it: (name: string, fn: () => void | Promise<void>) => void;
}

export interface ProviderContractOptions {
  createProvider: () => ExchangeRateProvider;
  knownBase: string;
  knownQuote: string;
  historicalDate: string;
  unsupportedCurrency: string;
  faults?: {
    timeout?: () => ExchangeRateProvider;
    rateLimited?: () => ExchangeRateProvider;
    unavailable?: () => ExchangeRateProvider;
    malformed?: () => ExchangeRateProvider;
  };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function assertValidProviderRate(rate: ProviderRate): void {
  assert.match(rate.effectiveDate, DATE_PATTERN, "effectiveDate must be YYYY-MM-DD");
  assert.ok(Number(rate.rate) > 0, "rate must be a positive decimal string");
  assert.ok(rate.providerId.length > 0, "providerId must be set");
  assert.ok(["direct", "inverse", "cross"].includes(rate.calculationMethod));
}

async function expectErrorCode(promise: Promise<unknown>, code: ErrorCode): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof OpenRatesError, "error must be an OpenRatesError");
    assert.equal(error.code, code);
    return true;
  });
}

export function runProviderContractTests(
  harness: ContractHarness,
  options: ProviderContractOptions,
): void {
  const { describe, it } = harness;

  describe("provider contract", () => {
    it("reports capabilities", async () => {
      const capabilities = await options.createProvider().capabilities();
      assert.ok(Array.isArray(capabilities.supportedModes));
      assert.ok(capabilities.supportedModes.length > 0);
      assert.ok(Array.isArray(capabilities.supportedRateTypes));
    });

    it("reports health", async () => {
      const health = await options.createProvider().healthCheck();
      assert.ok(["healthy", "degraded", "unavailable"].includes(health.status));
      assert.match(health.checkedAt, /T/);
    });

    it("returns a latest rate", async () => {
      const rate = await options
        .createProvider()
        .getLatestRate({ base: options.knownBase, quote: options.knownQuote });
      assert.equal(rate.baseCurrency, options.knownBase);
      assert.equal(rate.quoteCurrency, options.knownQuote);
      assertValidProviderRate(rate);
    });

    it("returns a historical rate", async () => {
      const rate = await options.createProvider().getHistoricalRate({
        base: options.knownBase,
        quote: options.knownQuote,
        date: options.historicalDate,
        datePolicy: "previous_available",
      });
      assertValidProviderRate(rate);
    });

    it("returns a time series", async () => {
      const series = await options.createProvider().getTimeSeries({
        base: options.knownBase,
        quote: options.knownQuote,
        startDate: options.historicalDate,
        endDate: options.historicalDate,
      });
      assert.equal(series.baseCurrency, options.knownBase);
      assert.ok(Array.isArray(series.points));
    });

    it("lists currencies including the known base", async () => {
      const currencies = await options.createProvider().listCurrencies();
      assert.ok(currencies.some((currency) => currency.code === options.knownBase));
    });

    it("rejects an unsupported currency with a typed error", async () => {
      await assert.rejects(
        options.createProvider().getLatestRate({
          base: options.knownBase,
          quote: options.unsupportedCurrency,
        }),
        (error: unknown) => {
          assert.ok(error instanceof OpenRatesError);
          return true;
        },
      );
    });

    if (options.faults?.timeout) {
      const createTimeout = options.faults.timeout;
      it("maps a timeout to PROVIDER_TIMEOUT", async () => {
        await expectErrorCode(
          createTimeout().getLatestRate({ base: options.knownBase, quote: options.knownQuote }),
          "PROVIDER_TIMEOUT",
        );
      });
    }

    if (options.faults?.rateLimited) {
      const createRateLimited = options.faults.rateLimited;
      it("maps rate limiting to PROVIDER_RATE_LIMITED", async () => {
        await expectErrorCode(
          createRateLimited().getLatestRate({
            base: options.knownBase,
            quote: options.knownQuote,
          }),
          "PROVIDER_RATE_LIMITED",
        );
      });
    }

    if (options.faults?.unavailable) {
      const createUnavailable = options.faults.unavailable;
      it("maps a server error to PROVIDER_UNAVAILABLE", async () => {
        await expectErrorCode(
          createUnavailable().getLatestRate({
            base: options.knownBase,
            quote: options.knownQuote,
          }),
          "PROVIDER_UNAVAILABLE",
        );
      });
    }

    if (options.faults?.malformed) {
      const createMalformed = options.faults.malformed;
      it("maps a malformed response to a typed error", async () => {
        await assert.rejects(
          createMalformed().getLatestRate({
            base: options.knownBase,
            quote: options.knownQuote,
          }),
          (error: unknown) => {
            assert.ok(error instanceof OpenRatesError);
            return true;
          },
        );
      });
    }
  });
}

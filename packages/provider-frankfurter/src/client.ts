import { type FetchLike, type HttpGetOptions, httpGetJson } from "@openrates/provider-interface";
import Decimal from "decimal.js";
import { z } from "zod";
import { MalformedResponseError } from "./errors";

const Dec = Decimal.clone({ precision: 40, toExpNeg: -9e15, toExpPos: 9e15 });

export function rateToString(value: number): string {
  return new Dec(value).toString();
}

const latestResponseSchema = z.object({
  amount: z.number(),
  base: z.string(),
  date: z.string(),
  rates: z.record(z.number()),
});
export type LatestResponse = z.infer<typeof latestResponseSchema>;

const seriesResponseSchema = z.object({
  amount: z.number(),
  base: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  rates: z.record(z.record(z.number())),
});
export type SeriesResponse = z.infer<typeof seriesResponseSchema>;

const currenciesResponseSchema = z.record(z.string());
export type CurrenciesResponse = z.infer<typeof currenciesResponseSchema>;

export interface FrankfurterClientOptions {
  baseUrl: string;
  timeoutMs: number;
  retries: number;
  fetch?: FetchLike;
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

export class FrankfurterClient {
  private readonly options: FrankfurterClientOptions;

  constructor(options: FrankfurterClientOptions) {
    this.options = options;
  }

  private async get<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
    const httpOptions: HttpGetOptions = {
      timeoutMs: this.options.timeoutMs,
      retries: this.options.retries,
    };
    if (this.options.fetch) {
      httpOptions.fetch = this.options.fetch;
    }
    if (signal) {
      httpOptions.signal = signal;
    }

    const raw = await httpGetJson(url, httpOptions);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new MalformedResponseError(parsed.error.message);
    }
    return parsed.data;
  }

  getLatest(base: string, quote: string, signal?: AbortSignal): Promise<LatestResponse> {
    const url = `${this.options.baseUrl}/v1/latest?base=${enc(base)}&symbols=${enc(quote)}`;
    return this.get(url, latestResponseSchema, signal);
  }

  getHistorical(
    date: string,
    base: string,
    quote: string,
    signal?: AbortSignal,
  ): Promise<LatestResponse> {
    const url = `${this.options.baseUrl}/v1/${enc(date)}?base=${enc(base)}&symbols=${enc(quote)}`;
    return this.get(url, latestResponseSchema, signal);
  }

  getSeries(
    startDate: string,
    endDate: string,
    base: string,
    quote: string,
    signal?: AbortSignal,
  ): Promise<SeriesResponse> {
    const url = `${this.options.baseUrl}/v1/${enc(startDate)}..${enc(endDate)}?base=${enc(base)}&symbols=${enc(quote)}`;
    return this.get(url, seriesResponseSchema, signal);
  }

  getCurrencies(signal?: AbortSignal): Promise<CurrenciesResponse> {
    const url = `${this.options.baseUrl}/v1/currencies`;
    return this.get(url, currenciesResponseSchema, signal);
  }
}

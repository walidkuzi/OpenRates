import { type FetchLike, type HttpGetOptions, httpGetJson } from "@openrates/provider-interface";
import Decimal from "decimal.js";
import { z } from "zod";
import { MalformedResponseError } from "./errors";

const Dec = Decimal.clone({ precision: 40, toExpNeg: -9e15, toExpPos: 9e15 });

export function rateToString(value: number): string {
  return new Dec(value).toString();
}

const ratesResponseSchema = z.object({
  disclaimer: z.string().optional(),
  license: z.string().optional(),
  timestamp: z.number(),
  base: z.string(),
  rates: z.record(z.number()),
});
export type RatesResponse = z.infer<typeof ratesResponseSchema>;

const historicalResponseSchema = ratesResponseSchema;
export type HistoricalResponse = RatesResponse;

const timeSeriesResponseSchema = z.object({
  disclaimer: z.string().optional(),
  license: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  base: z.string(),
  rates: z.record(z.record(z.number())),
});
export type TimeSeriesResponse = z.infer<typeof timeSeriesResponseSchema>;

const currenciesSchema = z.record(z.string());
export type CurrenciesResponse = z.infer<typeof currenciesSchema>;

export interface OxrClientOptions {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  retries: number;
  fetch?: FetchLike;
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

export class OxrClient {
  private readonly options: OxrClientOptions;

  constructor(options: OxrClientOptions) {
    this.options = options;
  }

  private async get<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
    const httpOptions: HttpGetOptions = {
      timeoutMs: this.options.timeoutMs,
      retries: this.options.retries,
    };
    if (this.options.fetch) httpOptions.fetch = this.options.fetch;
    if (signal) httpOptions.signal = signal;

    const raw = await httpGetJson(url, httpOptions);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new MalformedResponseError(parsed.error.message);
    }
    return parsed.data;
  }

  async getLatest(base: string, quote: string, signal?: AbortSignal): Promise<RatesResponse> {
    const url = `${this.options.baseUrl}/latest.json?app_id=${enc(this.options.apiKey)}&base=${enc(base)}&symbols=${enc(quote)}`;
    return this.get(url, ratesResponseSchema, signal);
  }

  async getHistorical(
    date: string,
    base: string,
    quote: string,
    signal?: AbortSignal,
  ): Promise<HistoricalResponse> {
    const url = `${this.options.baseUrl}/historical/${enc(date)}.json?app_id=${enc(this.options.apiKey)}&base=${enc(base)}&symbols=${enc(quote)}`;
    return this.get(url, historicalResponseSchema, signal);
  }

  async getTimeSeries(
    start: string,
    end: string,
    base: string,
    quote: string,
    signal?: AbortSignal,
  ): Promise<TimeSeriesResponse> {
    const url = `${this.options.baseUrl}/time-series.json?app_id=${enc(this.options.apiKey)}&base=${enc(base)}&symbols=${enc(quote)}&start=${enc(start)}&end=${enc(end)}`;
    return this.get(url, timeSeriesResponseSchema, signal);
  }

  async getCurrencies(signal?: AbortSignal): Promise<CurrenciesResponse> {
    const url = `${this.options.baseUrl}/currencies.json`;
    return this.get(url, currenciesSchema, signal);
  }
}

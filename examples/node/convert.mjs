// Use the OpenRates TypeScript SDK from Node.
// Start the API first: pnpm --filter @openrates/api dev
// Then run: node examples/node/convert.mjs
import { OpenRatesClient } from "@openrates/sdk";

const client = new OpenRatesClient({
  baseUrl: process.env.OPENRATES_URL ?? "http://localhost:3000",
});

const result = await client.convert({
  amount: "1000.00",
  from: "USD",
  to: "EUR",
  mode: "official",
});

console.log(`${result.amount} ${result.from} = ${result.convertedAmount} ${result.to}`);
console.log(
  `rate ${result.rate} (${result.rateType}, effective ${result.effectiveDate}, ${result.provider})`,
);

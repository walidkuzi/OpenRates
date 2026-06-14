import DecimalJs from "decimal.js";

export const Decimal = DecimalJs.clone({
  precision: 50,
  rounding: DecimalJs.ROUND_HALF_EVEN,
  toExpNeg: -9e15,
  toExpPos: 9e15,
});

export type DecimalValue = InstanceType<typeof Decimal>;

export const HALF_EVEN = DecimalJs.ROUND_HALF_EVEN;

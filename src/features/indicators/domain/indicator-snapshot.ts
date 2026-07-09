export type IndicatorSnapshot = {
  close: number;
  ema6: number | null;
  ema13: number | null;
  ema42: number | null;
  marketDate: string;
  source: string;
  symbol: string;
};

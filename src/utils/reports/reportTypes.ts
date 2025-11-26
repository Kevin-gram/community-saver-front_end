export type ReportPeriod = "week" | "month" | "quarter" | "year" | "all";

export type ReportData = {
  users: any[];
  loans: any[];
  shares: any[];
  penalties: any[];
  timestamp: string;
  netContributions?: {
    netAvailable?: number;
    bestFutureBalance?: number;
  };
};

export type PeriodOption = {
  value: ReportPeriod;
  label: string;
  description: string;
};

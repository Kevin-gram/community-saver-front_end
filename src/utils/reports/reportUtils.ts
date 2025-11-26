import { ReportData, ReportPeriod, PeriodOption } from "./reportTypes";
import { en } from "../../i18n/en";

export const getPeriods = (t: (key: string) => string): PeriodOption[] => [
  {
    value: "week",
    label: t("reportPeriods.week"),
    description: t("reportPeriods.weekDescription"),
  },
  {
    value: "month",
    label: t("reportPeriods.month"),
    description: t("reportPeriods.monthDescription"),
  },
  {
    value: "quarter",
    label: t("reportPeriods.quarter"),
    description: t("reportPeriods.quarterDescription"),
  },
  {
    value: "year",
    label: t("reportPeriods.year"),
    description: t("reportPeriods.yearDescription"),
  },
  {
    value: "all",
    label: t("reportPeriods.all"),
    description: t("reportPeriods.allDescription"),
  },
];

// Default periods for backward compatibility (English)
export const periods: PeriodOption[] = [
  { value: "week", label: "Last 7 Days", description: "Weekly Report" },
  { value: "month", label: "Last 30 Days", description: "Monthly Report" },
  { value: "quarter", label: "Last 90 Days", description: "Quarterly Report" },
  { value: "year", label: "Last 365 Days", description: "Annual Report" },
  { value: "all", label: "All Time", description: "Complete History" },
];

export const filterDataByPeriod = (
  data: ReportData,
  period: ReportPeriod
): ReportData => {
  if (period === "all") {
    return {
      ...data,
      users: data.users.filter((user: any) => user.role !== "admin"),
    };
  }
  const now = new Date();
  const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
  const days = daysMap[period];
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    ...data,
    users: data.users.filter((user: any) => user.role !== "admin"),
    loans: data.loans.filter((loan) => {
      const loanDate = new Date(
        loan.requestDate || loan.createdAt || loan.date
      );
      return loanDate >= cutoffDate;
    }),
    penalties: data.penalties.filter((penalty) => {
      const penaltyDate = new Date(penalty.createdAt || penalty.date);
      return penaltyDate >= cutoffDate;
    }),
  };
};

export const matchMemberId = (id1: any, id2: any): boolean => {
  if (!id1 || !id2) return false;
  const str1 =
    typeof id1 === "object" ? id1._id || id1.toString() : id1.toString();
  const str2 =
    typeof id2 === "object" ? id2._id || id2.toString() : id2.toString();
  return str1 === str2;
};

export const getReportFileName = (period: ReportPeriod): string => {
  const periodMap: Record<ReportPeriod, string> = {
    week: "Weekly",
    month: "Monthly",
    quarter: "Quarterly",
    year: "Annual",
    all: "AllTime",
  };
  const dateStr = new Date().toISOString().split("T")[0];
  return `FinancialReport_${periodMap[period] || "Report"}_${dateStr}.pdf`;
};

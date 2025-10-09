import { User, Contribution } from "../types";

export const calculateAvailableBalance = (users: User[]): number => {
  const totalSavings = users
    .filter((user) => user.role === "member")
    .reduce(
      (sum, user) =>
        sum + (typeof user.totalContributions === "number" ? user.totalContributions : 0),
      0
    );

  const activeLoans = users
    .filter((user) => user.activeLoan)
    .reduce(
      (sum, user) =>
        sum +
        (user.activeLoan && typeof user.activeLoan.amount === "number"
          ? user.activeLoan.amount
          : 0),
      0
    );

  return totalSavings - activeLoans;
};

export const calculateFutureBalance = (
  contributions: Contribution[]
): number => {
  const totalContributions = contributions.reduce(
    (sum, contribution) => sum + contribution.amount,
    0
  );
  return totalContributions;
};

export const calculateMaxLoanAmount = (
  user: User,
  maxMultiplier: number,
  maxAmount: number
): number => {
  const calculatedMax = user.totalContributions * maxMultiplier;
  return Math.min(calculatedMax, maxAmount);
};

export const isEligibleForLoan = (user: User): boolean => {
  return (
    !user.activeLoan ||
    (user.activeLoan.status === "repaid" || user.activeLoan.status === "rejected")
  );
};

export const getGroupTheme = (group: string) => {
  const themes = {
    blue: {
      primary: "bg-blue-500",
      secondary: "bg-blue-100",
      text: "text-blue-600",
      border: "border-blue-200",
      hover: "hover:bg-blue-50",
    },
    yellow: {
      primary: "bg-yellow-500",
      secondary: "bg-yellow-100",
      text: "text-yellow-600",
      border: "border-yellow-200",
      hover: "hover:bg-yellow-50",
    },
    red: {
      primary: "bg-red-500",
      secondary: "bg-red-100",
      text: "text-red-600",
      border: "border-red-200",
      hover: "hover:bg-red-50",
    },
    purple: {
      primary: "bg-purple-500",
      secondary: "bg-purple-100",
      text: "text-purple-600",
      border: "border-purple-200",
      hover: "hover:bg-purple-50",
    },
  };

  return themes[group as keyof typeof themes] || themes.blue;
};

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Plus,
  History,
  Calculator,
  PiggyBank,
  Layers,
  BarChart,
  FileDown,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { calculateMaxLoanAmount } from "../../utils/calculations";
import LoanRequestForm from "./LoanRequestForm";
import ContributionHistory from "./ContributionHistory";
import FinancialReports from "./FinancialReports";
import {
  fetchMemberShares,
  fetchPenalties,
  fetchNetContributions,
  downloadLoanAgreement,
} from "../../utils/api";

const INITIAL_POLLING_INTERVAL = 30000; // 30 seconds
const MAX_POLLING_INTERVAL = 300000; // Max 5 minutes
const MIN_POLLING_INTERVAL = 30000; // Min 30 seconds
const LOADING_DELAY = 300; // 300ms delay for smoother transition

// Request Queue for deduplication
class RequestQueue {
  private queue: Map<string, { promise: Promise<any>; timestamp: number }> =
    new Map();

  async fetch(key: string, fetchFn: () => Promise<any>, ttl: number = 10000) {
    const cached = this.queue.get(key);
    const now = Date.now();

    // Return cached promise if still valid
    if (cached && now - cached.timestamp < ttl) {
      return cached.promise;
    }

    // Create new request
    const promise = fetchFn().finally(() => {
      setTimeout(() => this.queue.delete(key), ttl);
    });

    this.queue.set(key, { promise, timestamp: now });
    return promise;
  }
}

const requestQueue = new RequestQueue();

// Skeleton components
const LoanStatusSkeleton = () => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 max-w-md w-full animate-pulse">
    <div className="flex items-center">
      <div className="w-5 h-5 bg-emerald-200 rounded-full mr-3"></div>
      <div className="flex-1">
        <div className="h-4 bg-emerald-200 rounded w-24 mb-2"></div>
        <div className="space-y-2">
          <div className="h-3 bg-emerald-200 rounded w-32"></div>
          <div className="h-3 bg-emerald-200 rounded w-28"></div>
          <div className="h-3 bg-emerald-200 rounded w-36"></div>
        </div>
      </div>
    </div>
  </div>
);

const LoanInfoSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
    <div className="h-6 bg-emerald-200 rounded w-32 mb-4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <div className="h-5 bg-emerald-200 rounded w-28 mb-3"></div>
        <div className="h-8 bg-emerald-200 rounded w-24"></div>
      </div>
      <div>
        <div className="h-5 bg-emerald-200 rounded w-28 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-emerald-200 rounded w-36"></div>
          <div className="h-4 bg-emerald-200 rounded w-32"></div>
          <div className="h-4 bg-emerald-200 rounded w-40"></div>
        </div>
      </div>
    </div>
  </div>
);

const MemberDashboard: React.FC = () => {
  const { state } = useApp();
  const { users, currentUser: rawCurrentUser, groupRules, loans } = state;
  const [memberShares, setMemberShares] = useState<any>(null);
  const [memberPenalties, setMemberPenalties] = useState<number>(0);
  const [netContributions, setNetContributions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); // Consolidated loading state
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReportsPopup, setShowReportsPopup] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(
    INITIAL_POLLING_INTERVAL
  );
  const [errorCount, setErrorCount] = useState(0);
  const [isDownloadingAgreement, setIsDownloadingAgreement] = useState(false);

  const isMountedRef = useRef(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSuccessfulFetch = useRef<number>(Date.now());
  const lastFetchTime = useRef<number>(0);

  // Early return if no user data
  if (!rawCurrentUser) {
    return (
      <div className="p-8 text-center">
        <p>Loading user data...</p>
      </div>
    );
  }

  // Find current user with null check
  const currentUser =
    users?.find((u) => u._id === rawCurrentUser?.id) || rawCurrentUser;

  // Early return if not a member
  if (!currentUser || currentUser.role !== "member") {
    return (
      <div className="p-8 text-center">
        <p>Access denied. Member privileges required.</p>
      </div>
    );
  }

  const groupKey = currentUser.branch?.toLowerCase() || "";
  const rules = groupRules[groupKey] || {};

  // Use displayData for calculations to reflect updated values
  const displayData = memberShares || currentUser;

  // Recalculate maxLoanAmount based on the latest displayData
  const currentSavings =
    displayData?.totalContribution ?? displayData?.totalContributions ?? 0;
  const maxLoanAmount = rules
    ? calculateMaxLoanAmount(
        { ...currentUser, totalContributions: currentSavings },
        rules.maxLoanMultiplier,
        rules.maxLoanAmount
      )
    : 0;

  const availableBalance = state.users.reduce(
    (sum, user) => sum + user.totalContributions,
    0
  );
  const userSavings = currentUser.totalContributions;

  // Compose stats - include group-level cards and ensure same size via fixed height class
  const stats = [
    {
      id: "total-savings",
      title: "Total Savings",
      value: `€${currentSavings.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      id: "interest-received",
      title: "Interest Received",
      value: `€${(
        displayData?.interestEarned ??
        displayData?.interestReceived ??
        0
      ).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    ...(memberPenalties > 0
      ? [
          {
            id: "penalties",
            title: "Pending Penalties",
            value: `€${memberPenalties.toLocaleString()}`,
            icon: AlertTriangle,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
          },
        ]
      : []),
    {
      id: "max-loanable",
      title: "Max Loanable",
      value: `€${(maxLoanAmount ?? 0).toLocaleString()}`,
      icon: Calculator,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      id: "total-group-contribution",
      title: "Gross Contribution",
      value: `€${(netContributions?.netAvailable ?? 0).toLocaleString()}`,
      icon: PiggyBank,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      id: "future-gross-contribution",
      title: "Future Gross Contribution",
      value: `€${(netContributions?.bestFutureBalance ?? 0).toLocaleString()}`,
      icon: BarChart,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
  ];

  const userLoans =
    loans?.filter((loan) => {
      if (!loan || !currentUser) return false;
      if (typeof loan.member === "object") {
        return loan.member?._id === currentUser._id;
      }
      return loan.member === currentUser._id;
    }) || [];

  const latestLoan = userLoans[0];
  const eligible =
    !latestLoan ||
    (latestLoan.status && ["repaid", "rejected"].includes(latestLoan.status));

  // Fetch penalties - stable function with no state dependencies in callback
  const fetchPenaltiesData = useCallback(async (userId: string) => {
    try {
      const penaltiesArray = await requestQueue.fetch(
        "penalties",
        () => fetchPenalties(),
        15000 // Cache for 15 seconds
      );

      const userPendingPenalties = penaltiesArray.filter((penalty: any) => {
        const penaltyMemberId =
          penalty.member?._id || penalty.member?.id || penalty.member;
        const isPending = penalty.status === "pending";
        return isPending && String(penaltyMemberId) === String(userId);
      });

      const totalPendingAmount = userPendingPenalties.reduce(
        (sum: number, penalty: any) => sum + (penalty.amount || 0),
        0
      );

      if (isMountedRef.current) {
        setMemberPenalties(totalPendingAmount);
      }

      return totalPendingAmount;
    } catch (error: any) {
      console.error("Failed to fetch penalties:", error?.message || error);

      if (error?.response?.status === 429) {
        console.warn("Rate limit hit on penalties - backing off");
        setErrorCount((prev) => prev + 1);
        setPollingInterval((prev) => Math.min(prev * 2, MAX_POLLING_INTERVAL));
      }

      if (isMountedRef.current) {
        setMemberPenalties(0);
      }
      return 0;
    }
  }, []); // No dependencies - userId passed as parameter

  // Fetch member data - stable function with no state dependencies in callback
  const fetchMemberData = useCallback(
    async (userId: string, isInitialLoad = false) => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;

      // Prevent fetching if last fetch was too recent (unless initial load)
      if (!isInitialLoad && timeSinceLastFetch < 10000) {
        return;
      }

      try {
        lastFetchTime.current = now;

        // Batch requests using Promise.all with request queue
        const [sharesData, netData] = await Promise.all([
          requestQueue.fetch("member-shares", () => fetchMemberShares(), 15000),
          requestQueue.fetch(
            "net-contributions",
            () => fetchNetContributions(),
            15000
          ),
          // fetchPenaltiesData already called separately earlier
        ]);

        const sharesArray = Array.isArray(sharesData) ? sharesData : [];

        if (isMountedRef.current) {
          const currentShare = sharesArray.find(
            (share: any) => String(share.id || share._id) === String(userId)
          );

          // store net contributions
          setNetContributions(netData || null);

          // Only update state and stop loading after confirming loans are ready
          if (loans !== undefined) {
            // Add slight delay for smoother transition
            setTimeout(() => {
              if (isMountedRef.current) {
                setMemberShares(currentShare);
                setIsLoading(false);
              }
            }, LOADING_DELAY);
          } else {
            setMemberShares(currentShare);
            // Keep isLoading true until loans are ready
          }

          // Success - gradually decrease interval but not below minimum
          setErrorCount(0);
          setPollingInterval((prev) => {
            if (prev > MIN_POLLING_INTERVAL) {
              return Math.max(prev * 0.8, MIN_POLLING_INTERVAL);
            }
            return MIN_POLLING_INTERVAL;
          });
          lastSuccessfulFetch.current = now;
        }
      } catch (error: any) {
        console.error("Failed to fetch member data:", error?.message || error);

        // Handle errors with exponential backoff
        if (error?.response?.status === 429) {
          console.warn("Rate limit hit - backing off");
          setErrorCount((prev) => prev + 1);
          setPollingInterval((prev) =>
            Math.min(prev * 2, MAX_POLLING_INTERVAL)
          );
        } else {
          setPollingInterval((prev) =>
            Math.min(prev * 1.5, MAX_POLLING_INTERVAL)
          );
        }

        if (isMountedRef.current) {
          setMemberShares(null);
          setTimeout(() => {
            if (isMountedRef.current) {
              setIsLoading(false);
            }
          }, LOADING_DELAY);
        }
      }
    },
    [fetchPenaltiesData, loans]
  ); // Depend on loans to recheck readiness

  // Manual refresh
  const handleManualRefresh = useCallback(() => {
    setIsLoading(true);
    const userId = currentUser._id || currentUser.id;
    fetchMemberData(userId, true);
  }, [currentUser._id, currentUser.id, fetchMemberData]);

  // Smart polling effect - separated from data fetching
  useEffect(() => {
    isMountedRef.current = true;
    const userId = currentUser._id || currentUser.id;

    // Initial fetch
    fetchMemberData(userId, true);

    // Setup polling with current interval
    pollingIntervalRef.current = setInterval(() => {
      // Only fetch if tab is visible
      if (!document.hidden) {
        fetchMemberData(userId, false);
      }
    }, pollingInterval);

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // When tab becomes visible, fetch immediately if enough time has passed
        const timeSinceLastSuccess = Date.now() - lastSuccessfulFetch.current;
        if (timeSinceLastSuccess > pollingInterval) {
          fetchMemberData(userId, false);
        }
      }
    };

    // Check if loans are available and update isLoading if necessary
    if (loans !== undefined && memberShares !== null && isMountedRef.current) {
      setTimeout(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }, LOADING_DELAY);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [
    pollingInterval,
    currentUser._id,
    currentUser.id,
    fetchMemberData,
    loans,
    memberShares,
  ]);

  const loanInfoCard = latestLoan ? (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600">Loan Status</p>
          <p
            className={`text-lg font-semibold mt-1 ${
              latestLoan.status === "repaid"
                ? "text-emerald-600"
                : latestLoan.status === "pending"
                ? "text-orange-600"
                : latestLoan.status === "approved"
                ? "text-red-600"
                : "text-gray-900"
            }`}
          >
            {latestLoan.status.charAt(0).toUpperCase() +
              latestLoan.status.slice(1)}
          </p>
        </div>
        <div
          className={`rounded-lg p-3 ${
            latestLoan.status === "repaid"
              ? "bg-emerald-100"
              : latestLoan.status === "pending"
              ? "bg-orange-100"
              : latestLoan.status === "approved"
              ? "bg-red-100"
              : "bg-gray-100"
          }`}
        >
          <Clock
            className={`w-6 h-6 ${
              latestLoan.status === "repaid"
                ? "text-emerald-600"
                : latestLoan.status === "pending"
                ? "text-orange-600"
                : latestLoan.status === "approved"
                ? "text-red-600"
                : "text-gray-600"
            }`}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-900">Amount:</span> €
          {latestLoan.amount?.toLocaleString() || "N/A"}
        </p>
        <p>
          <span className="font-medium text-gray-900">Repayment:</span> €
          {latestLoan.repaymentAmount?.toLocaleString() ||
            latestLoan.totalAmount?.toLocaleString() ||
            "N/A"}
        </p>
        <p>
          <span className="font-medium text-gray-900">Rate per month:</span>{" "}
          {latestLoan.interestRate || 0}%
        </p>
        <p>
          <span className="font-medium text-gray-900">Duration:</span>{" "}
          {latestLoan.duration || "N/A"} months
        </p>
        <p>
          <span className="font-medium text-gray-900">Due Date:</span>{" "}
          {latestLoan.dueDate
            ? new Date(latestLoan.dueDate).toLocaleDateString()
            : "N/A"}
        </p>
        {latestLoan.approvedDate && (
          <p>
            <span className="font-medium text-gray-900">Approved Date:</span>{" "}
            {new Date(latestLoan.approvedDate).toLocaleDateString()}
          </p>
        )}
        {latestLoan.requestDate && (
          <p>
            <span className="font-medium text-gray-900">Request Date:</span>{" "}
            {new Date(latestLoan.requestDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  ) : null;

  // Future Interest Card
  const futureInterestCard = (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600">Future Interest</p>
          <p className="text-lg font-semibold mt-1 text-emerald-600">
            €
            {(displayData?.interestToBeEarned ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="rounded-lg p-3 bg-emerald-100">
          <Layers className="w-6 h-6 text-emerald-600" />
        </div>
      </div>
      <p className="text-sm text-gray-600">
        Expected interest to be earned from active loans/Penalties
      </p>
    </div>
  );

  const handleDownloadAgreement = async () => {
    const loanId = latestLoan?.id || latestLoan?._id;
    if (!loanId) return;
    setIsDownloadingAgreement(true);
    try {
      const res = await downloadLoanAgreement(loanId);
      const blob = new Blob([res.data], { type: res.data.type || "application/pdf" });
      // try to infer filename from content-disposition header
      const cd = res.headers && (res.headers["content-disposition"] || res.headers["Content-Disposition"]);
      let filename = `loan-agreement-${loanId}.pdf`;
      if (cd) {
        const match = /filename\*?=(?:UTF-8'')?["']?([^;"']+)/i.exec(cd);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        }
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download agreement:", err);
      // Optionally show a toast/alert here
    } finally {
      setIsDownloadingAgreement(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Member Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back,{" "}
            {displayData?.name ||
              `${displayData?.firstName || ""} ${
                displayData?.lastName || ""
              }`.trim() ||
              "Member"}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            onClick={() => setShowReportsPopup(true)}
            title="View Financial Reports"
          >
            <FileDown className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Reports</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(stats.length)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse min-h-[140px]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-emerald-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-emerald-200 rounded w-32"></div>
                </div>
                <div className="bg-emerald-100 rounded-lg p-3">
                  <div className="w-6 h-6 bg-emerald-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[140px]"
            >
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.bg} rounded-lg p-3`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loan Info and Future Interest */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoanInfoSkeleton />
          <LoanInfoSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loanInfoCard}
          {futureInterestCard}
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => setShowLoanForm(true)}
          disabled={!eligible || isLoading}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            eligible && !isLoading
              ? `bg-emerald-700 text-white hover:opacity-90 shadow-sm`
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Plus className="w-5 h-5 mr-2" />
          Request Loan
        </button>

        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center px-6 py-3 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <History className="w-5 h-5 mr-2" />
          View History
        </button>

        {/* Download Agreement — enabled only when latest loan is approved */}
        <button
          onClick={handleDownloadAgreement}
          disabled={
            isLoading ||
            !latestLoan ||
            latestLoan.status !== "approved" ||
            isDownloadingAgreement
          }
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            !isLoading &&
            latestLoan &&
            latestLoan.status === "approved" &&
            !isDownloadingAgreement
              ? `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <FileDown className="w-5 h-5 mr-2" />
          {isDownloadingAgreement ? "Downloading..." : "Download Agreement"}
        </button>
      </div>

      {isLoading ? (
        <LoanInfoSkeleton />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Loan Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                Eligibility Status
              </h4>
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  eligible
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {eligible ? "Eligible" : "Not Eligible"}
              </div>
              {!eligible && (
                <p className="text-sm text-gray-600 mt-2">
                  You must repay your current loan before requesting a new one.
                </p>
              )}
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                Loan Calculation
              </h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Savings: €{currentSavings?.toLocaleString() || "N/A"}</p>
                <p>Multiplier: {rules ? rules.maxLoanMultiplier : "N/A"}x</p>
                <p>
                  Maximum: €
                  {rules && rules.maxLoanAmount !== undefined
                    ? rules.maxLoanAmount.toLocaleString()
                    : "N/A"}
                </p>
                <p className="font-medium text-gray-900">
                  Your Max: €
                  {maxLoanAmount !== undefined && maxLoanAmount !== null
                    ? maxLoanAmount.toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLoanForm && (
        <LoanRequestForm
          onClose={() => setShowLoanForm(false)}
          maxAmount={maxLoanAmount}
          interestRate={rules.interestRate}
          availableBalance={availableBalance}
          userSavings={userSavings}
        />
      )}

      {showHistory && (
        <ContributionHistory onClose={() => setShowHistory(false)} />
      )}

      {showReportsPopup && (
        <FinancialReports
          open={showReportsPopup}
          onClose={() => setShowReportsPopup(false)}
        />
      )}
    </div>
  );
};

export default MemberDashboard;

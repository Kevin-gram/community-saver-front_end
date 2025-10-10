import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Plus,
  History,
  Calculator,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { calculateMaxLoanAmount } from "../../utils/calculations";
import LoanRequestForm from "./LoanRequestForm";
import ContributionHistory from "./ContributionHistory";
import { fetchMemberShares, fetchPenalties } from "../../utils/api";
import { Bars } from "react-loader-spinner";

const POLLING_INTERVAL = 10000; // 10 seconds

// Add skeleton components
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
  const { users, currentUser: rawCurrentUser, groupRules } = state;
  const [memberShares, setMemberShares] = useState<any>(null);
  const [memberPenalties, setMemberPenalties] = useState<number>(0);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const isMountedRef = useRef(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentUser =
    users.find((u) => u._id === rawCurrentUser?.id) || rawCurrentUser;

  if (!currentUser || currentUser.role !== "member") return null;

  // Normalize group key and check rules existence
  const groupKey = currentUser.branch?.toLowerCase();
  const rules = groupRules[groupKey];
  const maxLoanAmount = rules
    ? calculateMaxLoanAmount(
        currentUser,
        rules.maxLoanMultiplier,
        rules.maxLoanAmount
      )
    : 0;

  const availableBalance = state.users.reduce(
    (sum, user) => sum + user.totalContributions,
    0
  );
  const userSavings = currentUser.totalContributions;

  const displayData = memberShares || currentUser;

  const stats = [
    {
      id: "total-savings",
      title: "Total Savings",
      value: `€${(
        displayData?.totalContribution ??
        displayData?.totalContributions ??
        0
      ).toLocaleString()}`,
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
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    // Always show penalties card if there are pending penalties
    ...(memberPenalties > 0
      ? [
          {
            id: "penalties",
            title: "Pending Penalties",
            value: `€${memberPenalties.toLocaleString()}`,
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-100",
          },
        ]
      : []),
    {
      id: "max-loanable",
      title: "Max Loanable",
      value: `€${(maxLoanAmount ?? 0).toLocaleString()}`,
      icon: Calculator,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  const userLoans = state.loans.filter((loan) => {
    // loan.member could be an object or an ID
    if (typeof loan.member === "object") {
      return loan.member._id === currentUser._id;
    }
    return loan.member === currentUser._id;
  });

  const latestLoan = userLoans[0];
  const eligible =
    !latestLoan ||
    (latestLoan.status && ["repaid", "rejected"].includes(latestLoan.status));

  // Fetch penalties using the API utility
  const fetchPenaltiesData = useCallback(async () => {
    try {
      const penaltiesArray = await fetchPenalties();
      
      // Filter penalties for current user with pending status
      const userPendingPenalties = penaltiesArray.filter((penalty: any) => {
        const penaltyMemberId = penalty.member?._id || penalty.member?.id || penalty.member;
        const currentUserId = currentUser._id || currentUser.id;
        const isPending = penalty.status === "pending";

        return isPending && String(penaltyMemberId) === String(currentUserId);
      });

      // Calculate total pending penalties
      const totalPendingAmount = userPendingPenalties.reduce(
        (sum: number, penalty: any) => sum + (penalty.amount || 0),
        0
      );

      if (isMountedRef.current) {
        setMemberPenalties(totalPendingAmount);
      }

      return totalPendingAmount;
    } catch (error) {
      console.error("Failed to fetch penalties:", error);
      if (isMountedRef.current) {
        setMemberPenalties(0);
      }
      return 0;
    }
  }, [currentUser._id, currentUser.id]);

  // Convert getShares to a memoized callback
  const fetchMemberData = useCallback(async () => {
    try {
      // Fetch both shares and penalties in parallel
      const [sharesData, penaltiesAmount] = await Promise.all([
        fetchMemberShares(),
        fetchPenaltiesData(),
      ]);

      const sharesArray = Array.isArray(sharesData) ? sharesData : [];

      if (isMountedRef.current) {
        const currentShare = sharesArray.find(
          (share: any) =>
            String(share.id || share._id) === String(currentUser._id || currentUser.id)
        );
        
        
        setMemberShares(currentShare);
        setSectionsLoading(false);
      }
    } catch (error) {
      console.error("=== Failed to Fetch Member Data ===");
      console.error("Error:", error);
      if (isMountedRef.current) {
        setMemberShares(null);
        setSectionsLoading(false);
      }
    }
  }, [currentUser._id, currentUser.id, fetchPenaltiesData]);

  // Setup polling effect
  useEffect(() => {
    isMountedRef.current = true;    
    // Initial fetch with loading spinner
    fetchMemberData();

    // Setup polling interval for background updates - only if tab is visible
    const handleVisibilityChange = () => {
      if (document.hidden && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      } else if (!document.hidden && !pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(() => {
          fetchMemberData();
        }, POLLING_INTERVAL);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (!document.hidden) {
      pollingIntervalRef.current = setInterval(() => {
        fetchMemberData();
      }, POLLING_INTERVAL);
    }

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [fetchMemberData]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header and stats - always show */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Member Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome back,{" "}
          {displayData?.name ||
            `${displayData?.firstName || ""} ${displayData?.lastName || ""}`.trim() ||
            "Member"}
        </p>
      </div>

      {/* Stats Grid - always show */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
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

      {/* Loan Status Section */}
      {sectionsLoading ? (
        <LoanStatusSkeleton />
      ) : (
        latestLoan && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 max-w-md w-full">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <h3 className="font-medium text-blue-800">Loan Status</h3>
                <p className="text-sm text-gray-700 mt-1">
                  Status:{" "}
                  <span className="font-semibold">{latestLoan.status}</span>
                  <br />
                  Amount: €{latestLoan.amount.toLocaleString()}
                  <br />
                  Due Date: {new Date(latestLoan.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )
      )}

      {/* Action Buttons - always show */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => setShowLoanForm(true)}
          disabled={!eligible}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            eligible
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
      </div>

      {/* Loan Eligibility Info */}
      {sectionsLoading ? (
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
                <p>
                  Savings: €
                  {(
                    displayData?.totalContribution ??
                    displayData?.totalContributions ??
                    0
                  ).toLocaleString()}
                </p>
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

      {/* Modals */}
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
    </div>
  );
};

export default MemberDashboard;
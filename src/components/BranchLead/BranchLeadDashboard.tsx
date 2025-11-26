import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Edit,
  Plus,
  History,
  Clock,
  Calculator,
  PiggyBank,
  BarChart,
  FileDown,
  Euro,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  getGroupTheme,
  calculateMaxLoanAmount,
} from "../../utils/calculations";
import MemberDetails from "./MemberDetails";
import LoanRequestForm from "../Member/LoanRequestForm";
import ContributionHistory from "../Member/ContributionHistory";
import FinancialReports from "../Member/FinancialReports";
import {
  approveOrReject,
  updateUser,
  fetchMemberShares,
  fetchNetContributions,
  downloadLoanAgreement,
  sendLoanApprovalEmail,
  fetchContributionsByMember,
} from "../../utils/api";
import { Loan, User, MemberShare } from "../../types";

const POLLING_INTERVAL = 5000; // 5 seconds

// Skeleton components
const MemberCardSkeleton = () => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse">
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 rounded-full bg-emerald-200"></div>
      <div>
        <div className="h-4 bg-emerald-200 rounded w-24 mb-2"></div>
        <div className="h-3 bg-emerald-200 rounded w-32"></div>
      </div>
    </div>
    <div className="flex items-center space-x-2">
      <div className="h-6 bg-emerald-200 rounded w-32"></div>
      <div className="w-8 h-8 bg-emerald-200 rounded"></div>
    </div>
  </div>
);

const LoanCardSkeleton = () => (
  <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-emerald-200"></div>
        <div>
          <div className="h-4 bg-emerald-200 rounded w-24 mb-2"></div>
          <div className="h-3 bg-emerald-200 rounded w-32"></div>
        </div>
      </div>
      <div className="h-6 bg-emerald-200 rounded w-16"></div>
    </div>
    <div className="grid grid-cols-2 gap-4 mb-3">
      <div className="h-4 bg-emerald-200 rounded"></div>
      <div className="h-4 bg-emerald-200 rounded"></div>
    </div>
    <div className="flex space-x-2">
      <div className="flex-1 h-8 bg-emerald-200 rounded"></div>
      <div className="flex-1 h-8 bg-emerald-200 rounded"></div>
    </div>
  </div>
);

const BranchLeadDashboard: React.FC = () => {
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [memberShares, setMemberShares] = useState<MemberShare | null>(null);
  const [allShares, setAllShares] = useState<MemberShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(true);
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);
  const [netContributions, setNetContributions] = useState<any>(null);
  const [showReportsPopup, setShowReportsPopup] = useState(false);
  const [isDownloadingAgreement, setIsDownloadingAgreement] = useState(false);
  const [memberContributions, setMemberContributions] = useState<any[] | null>(
    null
  );
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [showEmailChoice, setShowEmailChoice] = useState(false);
  const [approvedLoanId, setApprovedLoanId] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const isMountedRef = useRef(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitiallyLoadedRef = useRef(false);

  const { state, dispatch } = useApp();
  const { currentUser: rawCurrentUser, users, loans, groupRules } = state;

  // Get current user from users array
  const currentUser =
    users.find((u) => u._id === rawCurrentUser?.id) || rawCurrentUser;

  if (!currentUser || currentUser.role !== "branch_lead") return null;

  // Filter members AND admins in the same branch
  const branchMembers = users.filter(
    (user) =>
      (user.role === "member" || user.role === "admin") &&
      user.branch === currentUser.branch
  );

  // Get loans for branch members (excluding branch lead's own loans)
  const branchLoans = loans.filter((loan) => {
    let loanMemberId: string | null = null;

    if (typeof loan.member === "object" && loan.member !== null) {
      loanMemberId = loan.member._id || loan.member.id;
    } else if (typeof loan.member === "string") {
      loanMemberId = loan.member;
    }

    if (!loanMemberId) return false;

    const currentUserId = currentUser._id || currentUser.id;
    const isCurrentUser = loanMemberId === currentUserId;

    if (isCurrentUser) return false;

    return branchMembers.some((member) => {
      const memberId = member.id || member._id;
      return memberId === loanMemberId || memberId === loan.memberId;
    });
  });

  const pendingLoans = branchLoans.filter(
    (loan) => loan.status === "pending"
  ).length;
  const activeLoans = branchLoans.filter(
    (loan) => loan.status === "active"
  ).length;

  // Total branch savings from shares data
  const totalBranchSavings = allShares
    .filter((share) => share.branch === currentUser.branch)
    .reduce((sum, share) => sum + (share.totalContribution || 0), 0);

  // Loan eligibility for branch lead
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
  const userSavings = currentUser.totalContributions || 0;

  // Get branch lead's own loans
  const userLoans = state.loans.filter((loan) => {
    if (typeof loan.member === "object" && loan.member !== null) {
      return (
        loan.member._id === currentUser._id ||
        loan.member._id === currentUser.id
      );
    }
    return loan.member === currentUser._id || loan.member === currentUser.id;
  });

  const latestLoan = userLoans[0];
  const eligible =
    !latestLoan ||
    (latestLoan.status && ["repaid", "rejected"].includes(latestLoan.status));

  const stats = [
    {
      title: "Branch Members",
      value: branchMembers.length.toString(),
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Total Branch Savings",
      value: `€${totalBranchSavings.toLocaleString()}`,
      icon: Euro,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Active Loans",
      value: activeLoans.toString(),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Pending Approvals",
      value: pendingLoans.toString(),
      icon: AlertCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    // Add group-level cards (distinct, relevant icons)
    {
      title: "Gross Contribution",
      value: `€${(netContributions?.netAvailable ?? 0).toLocaleString()}`,
      icon: PiggyBank,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Future Gross Contribution",
      value: `€${(netContributions?.bestFutureBalance ?? 0).toLocaleString()}`,
      icon: BarChart,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
  ];

  // Personal stats for branch lead
  const displayData = memberShares || currentUser;
  const personalStats = [
    {
      id: "total-savings",
      title: "Total Savings",
      value: `€${(
        displayData?.totalContribution || userSavings
      ).toLocaleString()}`,
      icon: Euro,
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
    ...(typeof currentUser.penalties === "object" &&
    !currentUser.penalties.isPaid &&
    currentUser.penalties.pending > 0
      ? [
          {
            id: "penalties",
            title: "Penalties",
            value: `€${(currentUser.penalties.pending ?? 0).toLocaleString()}`,
            icon: AlertTriangle,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
          },
        ]
      : []),
    {
      id: "max-loanable",
      title: "Max Loanable",
      value: `€${maxLoanAmount.toLocaleString()}`,
      icon: Calculator,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
  ];

  // Branch lead can always edit
  const getMemberUpdateAccess = () => true;

  const handleLoanAction = async (loan: Loan, action: "approve" | "reject") => {
    setProcessingLoanId(loan.id || loan._id || null);
    setSelectedLoan(loan);
    setActionType(action);

    try {
      const backendLoan = await approveOrReject(
        loan.id || (loan._id as string),
        action === "approve" ? "approved" : "rejected"
      );
      dispatch({ type: "UPDATE_LOAN", payload: backendLoan });

      if (action === "approve" && backendLoan.member) {
        const updatedMember: User = {
          ...backendLoan.member,
          activeLoan: { ...backendLoan, status: "active" as const },
        };
        const backendUser = await updateUser(updatedMember);
        if (backendUser) {
          dispatch({ type: "UPDATE_USER", payload: backendUser });
        }

        // Show popup asking whether to send approval email (approval already performed)
        const loanId = backendLoan.id || backendLoan._id;
        setApprovedLoanId(loanId || null);
        setShowEmailChoice(true);
      }
    } catch (error) {
      console.error("Failed to update loan/user in backend", error);
    } finally {
      setSelectedLoan(null);
      setActionType(null);
      setProcessingLoanId(null);
    }
  };

  // Handler for loan request submission
  const handleLoanRequestSubmit = async () => {
    setShowLoanForm(false);
    // Trigger a background refresh without showing loading
    fetchSharesData(false);
  };

  // Fetch shares data function
  const fetchSharesData = async (showLoading = true) => {
    if (showLoading) {
      setSharesLoading(true);
    }

    try {
      const [data, netData] = await Promise.all([
        fetchMemberShares(),
        fetchNetContributions(),
      ]);
      const sharesArray = Array.isArray(data) ? data : [];

      if (isMountedRef.current) {
        setAllShares(sharesArray);
        setNetContributions(netData || null);
        const currentUserId = currentUser._id || currentUser.id;
        const currentShare = sharesArray.find(
          (share: any) =>
            String(share.id || share._id) === String(currentUserId)
        );
        setMemberShares(currentShare);
      }
    } catch (error) {
      console.error("Failed to fetch member shares", error);
    } finally {
      if (isMountedRef.current && showLoading) {
        setSharesLoading(false);
      }
    }
  };

  // Fetch branch lead's contributions then open history modal (show up to 10 recent)
  const openHistory = async (memberId?: string) => {
    try {
      setContributionsLoading(true);
      const resolvedId = memberId || currentUser?._id || currentUser?.id;
      const contributionsRaw = await fetchContributionsByMember(String(resolvedId));
      // eslint-disable-next-line no-console
      const arr = Array.isArray(contributionsRaw) ? contributionsRaw : [];
      arr.sort((a: any, b: any) => {
        const da = new Date(a.contributionDate || a.createdAt || 0).getTime();
        const db = new Date(b.contributionDate || b.createdAt || 0).getTime();
        return db - da;
      });
      setMemberContributions(arr.slice(0, 10));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch branch lead contributions:", err);
      setMemberContributions([]);
    } finally {
      setContributionsLoading(false);
      setShowHistory(true);
    }
  };

  // Setup polling effect - ONLY RUNS ONCE
  useEffect(() => {
    isMountedRef.current = true;

    // Prevent double loading on mount
    if (hasInitiallyLoadedRef.current) {
      return;
    }
    hasInitiallyLoadedRef.current = true;

    // Initial fetch with loading state
    fetchSharesData(true);

    // Setup polling interval for background updates - only if tab is visible
    const handleVisibilityChange = () => {
      if (document.hidden && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      } else if (!document.hidden && !pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(() => {
          fetchSharesData(false);
        }, POLLING_INTERVAL);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (!document.hidden) {
      pollingIntervalRef.current = setInterval(() => {
        fetchSharesData(false);
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
  }, []); // Empty dependency array - only run once

  // Add a single loading state for all cards
  const allCardsLoading = sharesLoading;

  const handleDownloadAgreement = async () => {
    const loanId = latestLoan?.id || latestLoan?._id;
    if (!loanId) return;
    setIsDownloadingAgreement(true);
    try {
      const res = await downloadLoanAgreement(loanId);
      const blob = new Blob([res.data], {
        type: res.data.type || "application/pdf",
      });
      const cd =
        res.headers &&
        (res.headers["content-disposition"] ||
          res.headers["Content-Disposition"]);
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
    } finally {
      setIsDownloadingAgreement(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header - Always visible */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Branch Lead Dashboard
          </h1>
          <p className="text-gray-600">
            Managing {currentUser.branch} - {branchMembers.length} members
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

      {/* Branch Stats Grid - Skeleton */}
      {allCardsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(stats.length)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
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
          {stats.map((stat, index) => (
            <div
              key={index}
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

      {/* Personal Finance Section - Skeleton */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Your Personal Finance
        </h2>
        {allCardsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(personalStats.length)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {personalStats.map((stat) => (
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
        )}
      </div>

      {/* Loan Status Section - Skeleton */}
      {allCardsLoading ? (
        <LoanCardSkeleton />
      ) : (
        latestLoan && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 max-w-md w-full">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-emerald-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900">
                  Your Loan Status
                </h3>
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

      {/* Action Buttons - Always visible */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={() => setShowLoanForm(true)}
          disabled={!eligible || allCardsLoading}
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            eligible && !allCardsLoading
              ? `bg-emerald-700 text-white hover:opacity-90 shadow-sm`
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Plus className="w-5 h-5 mr-2" />
          Request Loan
        </button>

        <button
          onClick={() => openHistory()}
          className="flex items-center px-6 py-3 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <History className="w-5 h-5 mr-2" />
          View History
        </button>

        <button
          onClick={handleDownloadAgreement}
          disabled={
            allCardsLoading ||
            !latestLoan ||
            latestLoan.status !== "approved" ||
            isDownloadingAgreement
          }
          className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
            !allCardsLoading &&
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

      {/* Grid sections with loading states */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Branch Members */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Branch Members
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {allCardsLoading ? (
              <>
                <MemberCardSkeleton />
                <MemberCardSkeleton />
                <MemberCardSkeleton />
              </>
            ) : branchMembers.length > 0 ? (
              branchMembers.map((member) => {
                const memberTheme = getGroupTheme("green-200");
                const canEdit = currentUser.branch === member.branch;

                const memberShare = allShares.find(
                  (share) =>
                    String(share.id || share._id) ===
                    String(member.id || member._id)
                );
                const memberContribution =
                  memberShare?.totalContribution ||
                  member.totalContributions ||
                  0;

                return (
  <div
    key={member.id || member._id || `member-${member.email}`}
    className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-2"
  >
    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${memberTheme.primary} flex items-center justify-center bg-emerald-200 flex-shrink-0`}
      >
        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
          {member.firstName}{" "}
          {member.role === "admin" && (
            <span className="text-xs">(Admin)</span>
          )}
        </p>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500">
          <span className="whitespace-nowrap">
            €{memberContribution.toLocaleString()}
          </span>
          <span className="flex items-center whitespace-nowrap">
            <div
              className={`w-2 h-2 rounded-full mr-1 ${memberTheme.primary}`}
            />
            {member.branch}
          </span>
        </div>
      </div>
    </div>

    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
      {canEdit && (
        <>
          <span className="hidden md:inline-block px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 whitespace-nowrap">
            Add
          </span>
          <button
            onClick={() => {
              const memberId = member.id || member._id;
              if (memberId) {
                setSelectedMember(memberId);
              } else {
                console.error(
                  "No valid member ID found:",
                  member
                );
              }
            }}
            className="p-1.5 sm:p-1 rounded text-emerald-600 hover:bg-blue-100 cursor-pointer"
            disabled={!member.id && !member._id}
          >
            <Edit className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </>
      )}
      <button
        onClick={() => openHistory(member.id || member._id)}
        className="p-1.5 sm:p-1 rounded text-gray-700 hover:bg-gray-100"
        title="View member history"
      >
        <History className="w-5 h-5 sm:w-4 sm:h-4" />
      </button>
    </div>
  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No branch members</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Loan Requests */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Loan Requests
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {allCardsLoading ? (
              <>
                <LoanCardSkeleton />
                <LoanCardSkeleton />
              </>
            ) : (
              <>
                {branchLoans
                  .filter((loan) => loan.status === "pending")
                  .map((loan) => {
                    const member = branchMembers.find(
                      (m) => m.id === loan.memberId || m._id === loan.memberId
                    );
                    if (!member) return null;

                    const memberTheme = getGroupTheme(member.branch);
                    const isProcessing =
                      processingLoanId === (loan.id || loan._id);

                    return (
                      <div
                        key={
                          loan.id ||
                          loan._id ||
                          `loan-${loan.memberId}-${loan.amount}`
                        }
                        className="p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full ${memberTheme.primary} flex items-center justify-center bg-emerald-100`}
                            >
                              <Euro className="w-4 h-4 text-emerald-700 " />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.firstName}
                              </p>
                              <p className="text-sm text-gray-500">
                                €{loan.amount.toLocaleString()} requested
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            Pending
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-gray-600">Due:</span>
                            <span className="ml-1 font-medium">
                              {new Date(loan.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleLoanAction(loan, "reject")}
                            disabled={isProcessing}
                            className={`flex-1 px-3 py-1 border border-red-300 text-red-700 rounded text-sm transition-colors ${
                              isProcessing
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-red-50"
                            }`}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleLoanAction(loan, "approve")}
                            disabled={isProcessing}
                            className={`flex-1 px-3 py-1 rounded text-sm transition-colors flex items-center justify-center ${
                              isProcessing
                                ? "bg-emerald-400 text-white cursor-not-allowed"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                          >
                            {isProcessing ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Processing...
                              </>
                            ) : (
                              "Approve"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {branchLoans.filter((loan) => loan.status === "pending")
                  .length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No pending loan requests</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedMember && (
        <MemberDetails
          memberId={selectedMember}
          canEdit={getMemberUpdateAccess()}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {showLoanForm && (
        <LoanRequestForm
          onClose={() => setShowLoanForm(false)}
          maxAmount={maxLoanAmount}
          interestRate={rules?.interestRate}
          availableBalance={availableBalance}
          userSavings={userSavings}
          onSubmit={handleLoanRequestSubmit}
        />
      )}

      {showHistory && (
        <ContributionHistory
          onClose={() => setShowHistory(false)}
          contributions={memberContributions}
          contributionsLoading={contributionsLoading}
        />
      )}

      {/* Financial Reports popup (same as Member dashboard usage) */}
      {showReportsPopup && (
        <FinancialReports
          open={showReportsPopup}
          onClose={() => setShowReportsPopup(false)}
        />
      )}

      {/* Email choice modal (after approving a loan) */}
      {showEmailChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Send approval email?
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              Do you want to send an approval notification email to the member now?
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // Close without sending email
                  setShowEmailChoice(false);
                  setApprovedLoanId(null);
                }}
                disabled={isSendingEmail}
                className={`flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg ${
                  isSendingEmail ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!approvedLoanId) {
                    setShowEmailChoice(false);
                    return;
                  }
                  setIsSendingEmail(true);
                  try {
                    await sendLoanApprovalEmail(approvedLoanId);
                  } catch (err) {
                    console.error("Failed to send approval email:", err);
                  } finally {
                    setIsSendingEmail(false);
                    setShowEmailChoice(false);
                    setApprovedLoanId(null);
                  }
                }}
                disabled={isSendingEmail}
                className={`flex-1 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg ${
                  isSendingEmail ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-700"
                }`}
              >
                {isSendingEmail ? "Sending..." : "Send email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchLeadDashboard;

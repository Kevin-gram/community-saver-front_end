import React, { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Edit,
  Plus,
  History,
  Clock,
  Calculator,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getGroupTheme, calculateMaxLoanAmount } from "../../utils/calculations";
import MemberDetails from "./MemberDetails";
import LoanRequestForm from "../Member/LoanRequestForm";
import ContributionHistory from "../Member/ContributionHistory";
import { approveOrReject, updateUser, fetchMemberShares } from "../../utils/api";
import { Loan, User } from "../../types";
import { Bars } from "react-loader-spinner";

const BranchLeadDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const { currentUser: rawCurrentUser, users, loans, groupRules } = state;
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [memberShares, setMemberShares] = useState<any>(null);
  const [loading, setLoading] = useState(true); // Add loading state

  // Get current user from users array (similar to Member Dashboard)
  const currentUser =
    users.find((u) => u._id === rawCurrentUser?.id) || rawCurrentUser;

  if (!currentUser || currentUser.role !== "branch_lead") return null;

  // Filter members in the same branch
  const branchMembers = users.filter(
    (user) => user.role === "member" && user.branch === currentUser.branch
  );

  // Get loans for branch members (excluding branch lead's own loans)
  const branchLoans = loans.filter((loan) => {
    const loanMemberId = typeof loan.member === "object" ? loan.member._id : loan.member;
    const isCurrentUser = loanMemberId === currentUser._id || loanMemberId === currentUser.id;
    return !isCurrentUser && branchMembers.some((member) => 
      (member.id === loan.memberId || member._id === loan.memberId)
    );
  });

  const pendingLoans = branchLoans.filter(
    (loan) => loan.status === "pending"
  ).length;
  const activeLoans = branchLoans.filter(
    (loan) => loan.status === "active"
  ).length;
  
  // Total branch savings
  const totalBranchSavings = branchMembers.reduce(
    (sum, member) =>
      sum +
      (typeof member.totalContributions === "number"
        ? member.totalContributions
        : 0) +
      (typeof member.penalties === "number" ? member.penalties : 0),
    0
  );

  // Loan eligibility for branch lead (same as Member Dashboard)
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
  const interestReceived = currentUser.interestReceived || 0;

  // Get branch lead's own loans (same filtering as Member Dashboard)
  const userLoans = state.loans.filter((loan) => {
    if (typeof loan.member === "object") {
      return loan.member._id === currentUser._id;
    }
    return loan.member === currentUser._id;
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
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Total Branch Savings",
      value: `€${totalBranchSavings.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Active Loans",
      value: activeLoans.toString(),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      title: "Pending Approvals",
      value: pendingLoans.toString(),
      icon: AlertCircle,
      color: "text-emerald-700",
      bg: "bg-emerald-100",
    },
  ];

  // Personal stats for branch lead
  const displayData = memberShares || currentUser;
  const personalStats = [
    {
      title: "Total Savings",
      value: `€${userSavings.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
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
    {
      title: "Max Loanable",
      value: `€${maxLoanAmount.toLocaleString()}`,
      icon: Calculator,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  // Branch lead can always edit
  const getMemberUpdateAccess = (_memberId: string) => true;

  const handleLoanAction = (loan: Loan, action: "approve" | "reject") => {
    setSelectedLoan(loan);
    setActionType(action);
    setTimeout(() => confirmAction(), 0);
  };

  const confirmAction = async () => {
    if (!selectedLoan || !actionType || !currentUser) return;

    try {
      const backendLoan = await approveOrReject(
        selectedLoan.id || (selectedLoan._id as string),
        actionType === "approve" ? "approved" : "rejected"
      );
      dispatch({ type: "UPDATE_LOAN", payload: backendLoan });

      if (actionType === "approve" && backendLoan.member) {
        const updatedMember: User = {
          ...backendLoan.member,
          activeLoan: { ...backendLoan, status: "active" as const },
        };
        const backendUser = await updateUser(updatedMember);
        if (backendUser) {
          dispatch({ type: "UPDATE_USER", payload: backendUser });
        }
      }
    } catch (error) {
      console.error("Failed to update loan/user in backend", error);
    }

    setSelectedLoan(null);
    setActionType(null);
  };

  // Handler for loan request submission (same as MemberDashboard)
  const handleLoanRequestSubmit = async (loanData: any) => {
    // You may need to import and use the same API function as MemberDashboard
    // For example: import { requestLoan } from "../../utils/api";
    // await requestLoan(loanData);
    // After successful request, close the form and refresh loans if needed
    setShowLoanForm(false);
    // Optionally, refresh loans or show a success message
  };

  // Add useEffect to fetch shares data
  useEffect(() => {
    const getShares = async () => {
      setLoading(true);
      try {
        const data = await fetchMemberShares();
        const sharesArray = Array.isArray(data) ? data : [];
        const currentShare = sharesArray.find(
          (share: any) =>
            String(share.id || share._id) === String(currentUser._id || currentUser.id)
        );
        console.log("Branch Lead's share:", currentShare);
        setMemberShares(currentShare);
      } catch (error) {
        console.error("Failed to fetch member shares", error);
      }
      setLoading(false);
    };
    getShares();
  }, [currentUser._id, currentUser.id]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {loading && (
        <div className="fixed inset-0 flex justify-center items-center bg-white bg-opacity-70 z-50">
          <Bars
            height={50}
            width={50}
            color="#10b981"
            ariaLabel="bars-loading"
            wrapperStyle={{}}
            wrapperClass=""
            visible={true}
          />
        </div>
      )}
      {!loading && (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Branch Lead Dashboard
            </h1>
            <p className="text-gray-600">
              Managing {currentUser.branch} - {branchMembers.length} members
            </p>
          </div>

          {/* Branch Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
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

          {/* Personal Finance Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your Personal Finance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {personalStats.map((stat, index) => (
                <div
                  key={index}
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
          </div>

          {/* Loan Status Section */}
          {latestLoan && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 max-w-md w-full">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-medium text-blue-800">Your Loan Status</h3>
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
          )}

          {/* Action Buttons */}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Branch Members */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Branch Members
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {branchMembers.map((member) => {
                  const memberTheme = getGroupTheme("green-200");
                  const canEdit = currentUser.branch === member.branch;

                  return (
                    <div
                      key={member.id || member._id || `member-${member.email}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full ${memberTheme.primary} flex items-center justify-center bg-emerald-200`}
                        >
                          <Users className="w-4 h-4 text-emerald-700 " />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.firstName}
                          </p>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>
                              €
                              {typeof member.totalContributions === "number"
                                ? member.totalContributions.toLocaleString()
                                : 0}
                            </span>
                            <span className="flex items-center">
                              <div
                                className={`w-2 h-2 rounded-full mr-1 ${memberTheme.primary}`}
                              />
                              {member.branch}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {canEdit && (
                          <>
                            <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800">
                              Add Member Contribution
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
                              className="p-1 rounded text-emerald-600 hover:bg-blue-100 cursor-pointer"
                              disabled={!member.id && !member._id}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending Loan Requests */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Pending Loan Requests
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {branchLoans
                  .filter((loan) => loan.status === "pending")
                  .map((loan) => {
                    const member = branchMembers.find(
                      (m) => (m.id === loan.memberId || m._id === loan.memberId)
                    );
                    if (!member) return null;

                    const memberTheme = getGroupTheme(member.branch);

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
                              <DollarSign className="w-4 h-4 text-emerald-700 " />
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
                            className="flex-1 px-3 py-1 border border-red-300 text-red-700 rounded text-sm hover:bg-red-50 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleLoanAction(loan, "approve")}
                            className="flex-1 px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition-colors"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {branchLoans.filter((loan) => loan.status === "pending").length ===
                  0 && (
                  <div className="text-center py-4 text-gray-500">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No pending loan requests</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modals */}
          {selectedMember && (
            <MemberDetails
              memberId={selectedMember}
              canEdit={getMemberUpdateAccess(selectedMember)}
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
              onSubmit={handleLoanRequestSubmit} // Pass the submit handler
            />
          )}

          {showHistory && (
            <ContributionHistory onClose={() => setShowHistory(false)} />
          )}
        </>
      )}
    </div>
  );
};

export default BranchLeadDashboard;
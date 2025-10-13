import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  X,
  Clock,
  DollarSign,
  User as UserIcon,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Loan, User, NormalizedLoan } from "../../types";
import { getGroupTheme } from "../../utils/calculations";
import ConfirmDialog from "../Common/ConfirmDialog";
import {
  updateUser,
  fetchLoans,
  fetchUsers,
  approveOrReject,
  repayLoan,
} from "../../utils/api";

const ITEMS_PER_PAGE = 2; // Set to show only 2 items per page
const POLLING_INTERVAL = 5000; // Poll every 5 seconds

const LoanApproval: React.FC = () => {
  const { state, dispatch } = useApp();
  const { loans, users, currentUser } = state;
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [filterStatus, setFilterStatus] = useState("");
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [repayAmount, setRepayAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(
    null
  );
  const [isRepaying, setIsRepaying] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true); // Track initial loading state
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter and paginate loans
  const filteredLoans = loans.filter((loan) => {
    return !filterStatus || loan.status === filterStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredLoans.length / ITEMS_PER_PAGE);
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const fetchData = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [usersData, loansData] = await Promise.all([
        fetchUsers(),
        fetchLoans(),
      ]);
      const normalizedLoans = loansData.map((l: NormalizedLoan) => ({
        ...l,
        id: l.id || l._id,
      }));
      dispatch({ type: "LOAD_USERS", payload: usersData });
      dispatch({ type: "LOAD_LOANS", payload: normalizedLoans });
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true); // Initial fetch with loading skeleton

    // Setup polling interval
    pollingIntervalRef.current = setInterval(() => {
      fetchData(false); // Subsequent fetches without loading skeleton
    }, POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [dispatch]);

  const handleLoanAction = (loan: Loan, action: "approve" | "reject") => {
    setSelectedLoan(loan);
    setActionType(action);
  };

  const confirmAction = async () => {
    if (!selectedLoan || !actionType || !currentUser) return;

    setIsProcessing(true);
    try {
      const backendLoan = await approveOrReject(
        selectedLoan.id || (selectedLoan._id as string),
        actionType === "approve" ? "approved" : "rejected"
      );
      dispatch({ type: "UPDATE_LOAN", payload: backendLoan });

      // If approved, update the member's active loan (optional, if needed)
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
    } finally {
      setIsProcessing(false);
      setProcessingLoanId(null);
      setSelectedLoan(null);
      setActionType(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "repaid":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionMessage = () => {
    if (!selectedLoan || !actionType) return "";

    const member =
      typeof selectedLoan.member === "object" ? selectedLoan.member : undefined;

    const action = actionType === "approve" ? "approve" : "reject";

    return `Are you sure you want to ${action} the loan request of €${selectedLoan.amount.toLocaleString()} from ${
      member ? `${member.firstName} ${member.lastName}` : ""
    }?`;
  };

  const handleRepayClick = (loan: Loan) => {
    setSelectedLoan(loan);
    setRepayAmount(
      (loan.repaymentAmount ?? loan.totalAmount ?? 0) - (loan.paidAmount || 0)
    );
    setShowRepayModal(true);
  };

  const handleRepaySubmit = async () => {
    if (!selectedLoan) return;
    const loanId = selectedLoan._id || selectedLoan.id;
    if (!loanId) {
      console.error("No loan ID found for repayment.");
      return;
    }
    const paidSoFar = selectedLoan.paidAmount || 0;
    const repaymentTotal =
      selectedLoan.repaymentAmount ?? selectedLoan.totalAmount ?? 0;
    const newPaid = paidSoFar + repayAmount;
    const isFullyPaid = newPaid >= repaymentTotal;

    setIsRepaying(true); // Set loading state
    try {
      const backendLoan = await repayLoan(loanId, repayAmount);
      dispatch({ type: "UPDATE_LOAN", payload: backendLoan });
      if (isFullyPaid && backendLoan.member) {
        const backendUser = await updateUser({
          ...backendLoan.member,
          activeLoan: undefined,
        });
        if (backendUser) {
          dispatch({ type: "UPDATE_USER", payload: backendUser });
        }
      }
      setShowRepayModal(false);
      setSelectedLoan(null);
      setRepayAmount(0);
    } catch (error) {
      console.error("Failed to update loan/user in backend", error);
    } finally {
      setIsRepaying(false); // Reset loading state
    }
  };

  const LoanSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-10 h-10 bg-emerald-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-emerald-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-emerald-200 rounded w-24"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="h-16 bg-emerald-200 rounded"></div>
        <div className="h-16 bg-emerald-200 rounded"></div>
        <div className="h-16 bg-emerald-200 rounded"></div>
      </div>
      <div className="h-4 bg-emerald-200 rounded w-40 mb-2"></div>
      <div className="h-4 bg-emerald-200 rounded w-32"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Loan Approval</h2>
          <p className="text-sm text-gray-600">
            Review and approve loan requests from members
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="active">Active</option>
          <option value="repaid">Repaid</option>
        </select>
      </div>

      {/* Loans List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <LoanSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedLoans.map((loan) => {
            const member =
              typeof loan.member === "object"
                ? loan.member
                : users.find((u) => u.id === loan._id || u._id === loan.member);

            if (!member) return null;

            const theme = getGroupTheme(member.branch);
            const approver = loan.approvedBy
              ? users.find((u) => u.id === loan.approvedBy)
              : null;

            return (
              <div
                key={loan.id || loan._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center"
                        >
                          <UserIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {`${member.firstName} ${member.lastName}`}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{member.email}</span>
                            <span className="flex items-center">
                              <div className="w-2 h-2 rounded-full mr-1 bg-emerald-500" />
                              {member.branch} Group
                            </span>
                            {member.branch && <span>{member.branch}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Loan Amount
                            </span>
                            <DollarSign className="w-4 h-4 text-gray-400" />
                          </div>
                          <p className="text-xl font-bold text-gray-900 mt-1">
                            €{loan.amount.toLocaleString()}
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Repayment Amount
                            </span>
                            <DollarSign className="w-4 h-4 text-gray-400" />
                          </div>
                          <p className="text-xl font-bold text-gray-900 mt-1">
                            €{(loan.totalAmount ?? 0).toLocaleString()}
                          </p>
                        </div>

                        {/* <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Member Savings
                          </span>
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          ${(member?.totalContributions ?? 0).toLocaleString()}
                        </p>
                      </div> */}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            Requested:{" "}
                            {loan.requestDate
                              ? new Date(loan.requestDate).toLocaleDateString()
                              : "-"}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            Due:{" "}
                            {loan.dueDate
                              ? new Date(loan.dueDate).toLocaleDateString()
                              : "-"}
                          </span>
                        </div>
                        {loan.approvedDate && (
                          <div className="flex items-center">
                            <Check className="w-4 h-4 mr-2 text-emerald-500" />
                            <span>
                              Approved:{" "}
                              {new Date(loan.approvedDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {approver && (
                          <div className="flex items-center">
                            <UserIcon className="w-4 h-4 mr-2" />
                            <span>
                              Approved by:{" "}
                              {`${approver.firstName} ${approver.lastName}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Risk Assessment */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-emerald-900 mb-2">
                          Risk Assessment
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-emerald-700">
                              Loan to Savings Ratio:
                            </span>
                            <span className="font-medium ml-2">
                              {
                                (loan.riskAssessment)?.toFixed(1)}
                              %
                            </span>
                          </div>
                          <div>
                            <span className="text-emerald-700">
                              Interest Amount:
                            </span>
                            <span className="font-medium ml-2">
                              €
                              {(
                                (loan.totalAmount ?? 0) - loan.amount
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-3">
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeColor(
                          loan.status
                        )}`}
                      >
                        {loan.status.charAt(0).toUpperCase() +
                          loan.status.slice(1)}
                      </span>

                      {loan.status === "pending" && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleLoanAction(loan, "reject")}
                            disabled={
                              isProcessing && processingLoanId ===
                              (loan.id || loan._id)
                            }
                            className={`inline-flex items-center px-3 py-1 border border-red-300 text-red-700 rounded-lg transition-colors ${
                              isProcessing && processingLoanId ===
                              (loan.id || loan._id)
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-red-50"
                            }`}
                          >
                            {isProcessing && processingLoanId ===
                            (loan.id || loan._id) ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <X className="w-4 h-4 mr-1" />
                            )}
                            Reject
                          </button>
                          <button
                            onClick={() => handleLoanAction(loan, "approve")}
                            disabled={
                              isProcessing && processingLoanId ===
                              (loan.id || loan._id)
                            }
                            className={`inline-flex items-center px-3 py-1 bg-emerald-600 text-white rounded-lg transition-colors ${
                              isProcessing && processingLoanId ===
                              (loan.id || loan._id)
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-emerald-700"
                            }`}
                          >
                            {isProcessing && processingLoanId ===
                            (loan.id || loan._id) ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-1" />
                            )}
                            Approve
                          </button>
                        </div>
                      )}
                      {(loan.status === "approved" ||
                        loan.status === "active") && (
                        <button
                          onClick={() => handleRepayClick(loan)}
                          className="inline-flex items-center px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Repay Loan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredLoans.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {filterStatus
              ? `No ${filterStatus} loans found`
              : "No loan requests found"}
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredLoans.length > 0 && (
        <div className="flex items-center justify-end space-x-4 mt-6">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="flex items-center px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center px-4 py-2 text-sm text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {selectedLoan && actionType && (
        <ConfirmDialog
          title={`${actionType === "approve" ? "Approve" : "Reject"} Loan`}
          message={getActionMessage()}
          confirmText={
            isProcessing ? (
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {actionType === "approve" ? "Approving..." : "Rejecting..."}
              </div>
            ) : (
              actionType === "approve" ? "Approve" : "Reject"
            )
          }
          confirmVariant={actionType === "approve" ? "primary" : "danger"}
          onConfirm={confirmAction}
          onCancel={() => {
            setSelectedLoan(null);
            setActionType(null);
          }}
          isDisabled={isProcessing}
        />
      )}

      {/* Repay Modal */}
      {showRepayModal && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Repay Loan
            </h3>
            <p className="mb-2 text-sm text-gray-700">
              Member:{" "}
              <span className="font-bold">
                {(() => {
                  const member = selectedLoan.member;
                  // typeof selectedLoan.member === "object"
                  //   ? selectedLoan.member
                  //   : users.find(
                  //       (u) =>
                  //         u.id === selectedLoan.member ||
                  //         u._id === selectedLoan.member
                  //     );
                  return member ? `${member.firstName} ${member.lastName}` : "";
                })()}
              </span>
            </p>
            <p className="mb-2 text-sm text-gray-700">
              Total Repayment:{" "}
              <span className="font-bold">
                €
                {(
                  selectedLoan.repaymentAmount ??
                  selectedLoan.totalAmount ??
                  0
                ).toLocaleString()}
              </span>
            </p>
            <p className="mb-2 text-sm text-gray-700">
              Already Paid:{" "}
              <span className="font-bold">
                €{(selectedLoan.paidAmount || 0).toLocaleString()}
              </span>
            </p>
            <label className="text-sm font-medium text-gray-700">
              Amount to Repay
            </label>
            <input
              type="number"
              readOnly
              value={
                (selectedLoan.repaymentAmount ??
                  selectedLoan.totalAmount ??
                  0) - (selectedLoan.paidAmount || 0)
              }
              className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => setShowRepayModal(false)}
                disabled={isRepaying}
                className={`px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg w-1/2 
            ${isRepaying ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'} 
            transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleRepaySubmit}
                disabled={isRepaying}
                className={`inline-flex items-center justify-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg w-1/2
            ${isRepaying ? 'opacity-75 cursor-not-allowed' : 'hover:bg-emerald-700'} 
            transition-colors`}
              >
                {isRepaying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanApproval;

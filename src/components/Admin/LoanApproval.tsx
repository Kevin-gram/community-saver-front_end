import React, { useState, useEffect } from "react";
import {
  Check,
  X,
  Clock,
  DollarSign,
  User as UserIcon,
  Calendar,
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

  const filteredLoans = loans.filter((loan) => {
    return !filterStatus || loan.status === filterStatus;
  });

  const handleLoanAction = (loan: Loan, action: "approve" | "reject") => {
    setSelectedLoan(loan);
    setActionType(action);
  };

  const confirmAction = async () => {
    if (!selectedLoan || !actionType || !currentUser) return;

    try {
      const backendLoan = await approveOrReject(
        selectedLoan.id || (selectedLoan._id as string),
        actionType === "approve" ? "approved" : "rejected"
        // actionType === "reject" ? "Rejected by admin" : undefined
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
    }

    setSelectedLoan(null);
    setActionType(null);
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
    } catch (error) {
      console.error("Failed to update loan/user in backend", error);
    }
    setShowRepayModal(false);
    setSelectedLoan(null);
    setRepayAmount(0);
  };

  useEffect(() => {
    fetchUsers().then((users) => {
      dispatch({ type: "LOAD_USERS", payload: users });
    });
    fetchLoans().then((loans) => {
      // Normalize id for each loan
      const normalized = loans.map((l: NormalizedLoan) => ({
        ...l,
        id: l.id || l._id,
      }));
      dispatch({ type: "LOAD_LOANS", payload: normalized });
    });
  }, [dispatch]);

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
      <div className="space-y-4">
        {filteredLoans.map((loan) => {
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
                        className={`w-10 h-10 rounded-full ${theme.primary} flex items-center justify-center`}
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
                            <div
                              className={`w-2 h-2 rounded-full mr-1 ${theme.primary}`}
                            />
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
                          className="inline-flex items-center px-3 py-1 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleLoanAction(loan, "approve")}
                          className="inline-flex items-center px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <Check className="w-4 h-4 mr-1" />
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

      {filteredLoans.length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {filterStatus
              ? `No ${filterStatus} loans found`
              : "No loan requests found"}
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {selectedLoan && actionType && (
        <ConfirmDialog
          title={`${actionType === "approve" ? "Approve" : "Reject"} Loan`}
          message={getActionMessage()}
          confirmText={actionType === "approve" ? "Approve" : "Reject"}
          confirmVariant={actionType === "approve" ? "primary" : "danger"}
          onConfirm={confirmAction}
          onCancel={() => {
            setSelectedLoan(null);
            setActionType(null);
          }}
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
                onClick={() =>
                  setRepayAmount(
                    (selectedLoan.repaymentAmount ??
                      selectedLoan.totalAmount ??
                      0) - (selectedLoan.paidAmount || 0)
                  )
                }
                className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors w-1/2"
              >
                Pay All
              </button>
              <button
                onClick={handleRepaySubmit}
                className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors w-1/2"
              >
                Confirm
              </button>
            </div>
            <button
              onClick={() => setShowRepayModal(false)}
              className="mt-4 px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanApproval;

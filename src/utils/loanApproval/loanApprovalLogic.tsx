import React from "react";
import { Loader2 } from "lucide-react";
import { Loan, User } from "../../types";
import {
  updateUser,
  approveOrReject,
  repayLoan,
  sendLoanApprovalEmail,
} from "../../utils/api";

export const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-blue-100 text-blue-800";
    case "approved":
      return "bg-gold-100 text-gold-800";
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

export const getActionMessage = (selectedLoan: Loan | null, actionType: "approve" | "reject" | null) => {
  if (!selectedLoan || !actionType) return "";

  const member =
    typeof selectedLoan.member === "object" ? selectedLoan.member : undefined;

  const action = actionType === "approve" ? "approve" : "reject";

  return `Are you sure you want to ${action} the loan request of €${selectedLoan.amount.toLocaleString()} from ${
    member ? `${member.firstName} ${member.lastName}` : ""
  }?`;
};

export const handleLoanAction = (
  loan: Loan,
  action: "approve" | "reject",
  setSelectedLoan: (loan: Loan | null) => void,
  setActionType: (type: "approve" | "reject" | null) => void,
  setProcessingLoanId: (id: string | null) => void
) => {
  setSelectedLoan(loan);
  setActionType(action);
  setProcessingLoanId(loan.id || loan._id || null);
};

export const confirmAction = async (
  selectedLoan: Loan | null,
  actionType: "approve" | "reject" | null,
  currentUser: any,
  dispatch: any,
  setIsProcessing: (v: boolean) => void,
  setProcessingLoanId: (id: string | null) => void,
  setSelectedLoan: (loan: Loan | null) => void,
  setActionType: (type: "approve" | "reject" | null) => void,
  setApprovedLoanId: (id: string | null) => void,
  setShowEmailChoice: (v: boolean) => void
) => {
  if (!selectedLoan || !actionType || !currentUser) return;

  if (actionType === "reject") {
    setIsProcessing(true);
    setProcessingLoanId(selectedLoan.id || selectedLoan._id || null);
    try {
      const backendLoan = await approveOrReject(
        selectedLoan.id || (selectedLoan._id as string),
        "rejected"
      );
      dispatch({ type: "UPDATE_LOAN", payload: backendLoan });
    } catch (error) {
      console.error("Failed to reject loan in backend", error);
    } finally {
      setIsProcessing(false);
      setProcessingLoanId(null);
      setSelectedLoan(null);
      setActionType(null);
    }
    return;
  }

  if (actionType === "approve") {
    setIsProcessing(true);
    setProcessingLoanId(selectedLoan.id || selectedLoan._id || null);
    try {
      const backendLoan = await approveOrReject(
        selectedLoan.id || (selectedLoan._id as string),
        "approved"
      );
      dispatch({ type: "UPDATE_LOAN", payload: backendLoan });

      if (backendLoan.member) {
        const updatedMember: User = {
          ...backendLoan.member,
          activeLoan: { ...backendLoan, status: "active" as const },
        };
        const backendUser = await updateUser(updatedMember);
        if (backendUser) {
          dispatch({ type: "UPDATE_USER", payload: backendUser });
        }
      }

      const loanId = backendLoan.id || backendLoan._id;
      setApprovedLoanId(loanId || null);
      setShowEmailChoice(true);
    } catch (error) {
      console.error("Failed to approve loan in backend", error);
    } finally {
      setIsProcessing(false);
      setProcessingLoanId(null);
      setSelectedLoan(null);
      setActionType(null);
    }
  }
};

export const handleEmailChoice = async (
  approvedLoanId: string | null,
  sendEmail: boolean,
  setIsProcessing: (v: boolean) => void,
  setShowEmailChoice: (v: boolean) => void,
  setApprovedLoanId: (id: string | null) => void
) => {
  if (!approvedLoanId) {
    setShowEmailChoice(false);
    setApprovedLoanId(null);
    return;
  }

  if (!sendEmail) {
    setShowEmailChoice(false);
    setApprovedLoanId(null);
    return;
  }

  setIsProcessing(true);
  try {
    await sendLoanApprovalEmail(approvedLoanId);
  } catch (err) {
    console.error("Failed to send approval email:", err);
  } finally {
    setIsProcessing(false);
    setShowEmailChoice(false);
    setApprovedLoanId(null);
  }
};

export const handleRepayClick = (
  loan: Loan,
  setSelectedLoan: (loan: Loan | null) => void,
  setRepayAmount: (amount: number) => void,
  setShowRepayModal: (v: boolean) => void
) => {
  setSelectedLoan(loan);
  setRepayAmount(
    (loan.repaymentAmount ?? loan.totalAmount ?? 0) - (loan.paidAmount || 0)
  );
  setShowRepayModal(true);
};

export const handleRepaySubmit = async (
  selectedLoan: Loan | null,
  repayAmount: number,
  dispatch: any,
  setIsRepaying: (v: boolean) => void,
  setShowRepayModal: (v: boolean) => void,
  setSelectedLoan: (loan: Loan | null) => void,
  setRepayAmount: (amount: number) => void
) => {
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

  setIsRepaying(true);
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
    setIsRepaying(false);
  }
};

export const LoanSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 animate-pulse">
    <div className="flex items-center space-x-4 mb-4">
      <div className="w-10 h-10 bg-gold-200 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gold-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gold-200 rounded w-24"></div>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 mb-4">
      <div className="h-16 bg-gold-200 rounded"></div>
      <div className="h-16 bg-gold-200 rounded"></div>
      <div className="h-16 bg-gold-200 rounded"></div>
    </div>
  </div>
);

interface EmailChoiceModalProps {
  showEmailChoice: boolean;
  isProcessing: boolean;
  onEmailChoice: (sendEmail: boolean) => void;
}

export const EmailChoiceModal: React.FC<EmailChoiceModalProps> = ({
  showEmailChoice,
  isProcessing,
  onEmailChoice,
}) => {
  if (!showEmailChoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-sm mx-auto">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
          Send approval email?
        </h3>
        <p className="text-sm text-gray-700 mb-4">
          Do you want to send an approval notification email to the member
          after approving the loan?
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => onEmailChoice(false)}
            disabled={isProcessing}
            className={`flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg ${
              isProcessing
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-50"
            }`}
          >
            Cancel
          </button>

          <button
            onClick={() => onEmailChoice(true)}
            disabled={isProcessing}
            className={`flex-1 px-4 py-2 text-sm bg-gold-600 text-white rounded-lg ${
              isProcessing
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gold-700"
            }`}
          >
            Send email
          </button>
        </div>
      </div>
    </div>
  );
};

interface RepayModalProps {
  showRepayModal: boolean;
  selectedLoan: Loan | null;
  repayAmount: number;
  isRepaying: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const RepayModal: React.FC<RepayModalProps> = ({
  showRepayModal,
  selectedLoan,
  repayAmount,
  isRepaying,
  onClose,
  onSubmit,
}) => {
  if (!showRepayModal || !selectedLoan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-sm mx-auto">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          Repay Loan
        </h3>
        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-700">
            Member:{" "}
            <span className="font-bold">
              {(() => {
                const member = selectedLoan.member;
                return member
                  ? `${member.firstName} ${member.lastName}`
                  : "";
              })()}
            </span>
          </p>
          <p className="text-sm text-gray-700">
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
          <p className="text-sm text-gray-700">
            Already Paid:{" "}
            <span className="font-bold">
              €{(selectedLoan.paidAmount || 0).toLocaleString()}
            </span>
          </p>
        </div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Amount to Repay
        </label>
        <input
          type="number"
          readOnly
          value={repayAmount}
          className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-sm"
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onClose}
            disabled={isRepaying}
            className={`flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg 
            ${
              isRepaying ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
            } 
            transition-colors`}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isRepaying}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm bg-gold-600 text-white rounded-lg
            ${
              isRepaying
                ? "opacity-75 cursor-not-allowed"
                : "hover:bg-gold-700"
            } 
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
  );
};

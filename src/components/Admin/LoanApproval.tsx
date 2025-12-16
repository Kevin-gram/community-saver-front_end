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
  fetchLoans,
  fetchUsers,
} from "../../utils/api";
import {
  getStatusBadgeColor,
  getActionMessage,
  handleLoanAction,
  confirmAction,
  handleEmailChoice,
  handleRepayClick,
  handleRepaySubmit,
  LoanSkeleton,
  EmailChoiceModal,
  RepayModal,
} from "../../utils/loanApproval/loanApprovalLogic";
import { useLanguage } from "../../context/LanguageContext";

const ITEMS_PER_PAGE = 2;
const POLLING_INTERVAL = 5000;

const LoanApproval: React.FC = () => {
  const { t } = useLanguage();
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
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);
  const [isRepaying, setIsRepaying] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmailChoice, setShowEmailChoice] = useState(false);
  const [approvedLoanId, setApprovedLoanId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const filteredLoans = loans.filter((loan) => {
    return !filterStatus || loan.status === filterStatus;
  });

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
    fetchData(true);

    pollingIntervalRef.current = setInterval(() => {
      fetchData(false);
    }, POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t("admin.loanApproval")}
          </h2>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
        >
          <option value="">{t("admin.all")}</option>
          <option value="pending">{t("admin.pending")}</option>
          <option value="approved">{t("admin.approved")}</option>
          <option value="rejected">{t("admin.rejected")}</option>
          <option value="active">{t("admin.active")}</option>
          <option value="repaid">{t("admin.repaid")}</option>
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
                <div className="p-4 sm:p-6">
                  {/* Mobile: Stack everything vertically */}
                  <div className="flex flex-col space-y-4">
                    {/* Header Section - Member Info and Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gold-700 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                            {`${member.firstName} ${member.lastName}`}
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-500 gap-1 sm:gap-0">
                            <span className="truncate">{member.email}</span>
                            <span className="flex items-center">
                              <div className="w-2 h-2 rounded-full mr-1 bg-gold-700" />
                              {member.branch} Group
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex px-3 py-1 text-xs sm:text-sm font-semibold rounded-full self-start ${getStatusBadgeColor(
                          loan.status
                        )}`}
                      >
                        {t(`admin.${loan.status}`)}
                      </span>
                    </div>

                    {/* Amount Cards - Stack on mobile, grid on larger screens */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-gray-600">
                            {t("admin.loanAmount")}
                          </span>
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
                          €{loan.amount.toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-gray-600">
                            {t("admin.repaymentAmount")}
                          </span>
                          <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
                          €{(loan.totalAmount ?? 0).toLocaleString()}
                        </p>
                      </div>

                      {loan.paidAmount > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm text-gray-600">
                              {t("admin.alreadyPaid")}
                            </span>
                            <DollarSign className="w-4 h-4 text-gray-400" />
                          </div>
                          <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
                            €{(loan.paidAmount || 0).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Dates - Stack on mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>
                          {t("admin.requested")}:{" "}
                          {loan.requestDate
                            ? new Date(loan.requestDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>
                          {t("admin.due")}:{" "}
                          {loan.dueDate
                            ? new Date(loan.dueDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                      {loan.approvedDate && (
                        <div className="flex items-center">
                          <Check className="w-4 h-4 mr-2 text-gold-600 flex-shrink-0" />
                          <span>
                            {t("admin.approved")}:{" "}
                            {new Date(loan.approvedDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {approver && (
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {t("admin.approvedBy")}:{" "}
                            {`${approver.firstName} ${approver.lastName}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Risk Assessment */}
                    <div className="p-3 bg-gold-50 rounded-lg border border-gold-200">
                      <h4 className="font-medium text-gold-900 mb-2 text-sm sm:text-base">
                        {t("admin.riskAssessment")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                        <div>
                          <span className="text-gold-700">
                            {t("admin.loanToSavingsRatio")}:
                          </span>
                          <span className="font-medium ml-2">
                            {loan.riskAssessment?.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gold-700">
                            {t("admin.interestAmount")}:
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

                    {/* Action Buttons - Full width on mobile, side by side on larger screens */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      {loan.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleLoanAction(loan, "reject", setSelectedLoan, setActionType, setProcessingLoanId)}
                            disabled={
                              isProcessing &&
                              processingLoanId === (loan.id || loan._id)
                            }
                            className={`flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 rounded-lg transition-colors ${
                              isProcessing &&
                              processingLoanId === (loan.id || loan._id)
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-red-50"
                            }`}
                          >
                            {isProcessing &&
                            processingLoanId === (loan.id || loan._id) ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <X className="w-4 h-4 mr-2" />
                            )}
                            {t("admin.reject")}
                          </button>
                          <button
                            onClick={() => handleLoanAction(loan, "approve", setSelectedLoan, setActionType, setProcessingLoanId)}
                            disabled={
                              isProcessing &&
                              processingLoanId === (loan.id || loan._id)
                            }
                            className={`flex items-center justify-center px-4 py-2 bg-gold-600 text-white rounded-lg transition-colors ${
                              isProcessing &&
                              processingLoanId === (loan.id || loan._id)
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-gold-700"
                            }`}
                          >
                            {isProcessing &&
                            processingLoanId === (loan.id || loan._id) ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-2" />
                            )}
                            {t("admin.approve")}
                          </button>
                        </>
                      )}
                      {(loan.status === "approved" ||
                        loan.status === "active") && (
                        <button
                          onClick={() => handleRepayClick(loan, setSelectedLoan, setRepayAmount, setShowRepayModal)}
                          className="flex items-center justify-center px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          {t("admin.repayLoan")}
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
              ? t("admin.noLoans")
              : t("admin.noLoans")}
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredLoans.length > 0 && (
        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 mt-6">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{t("admin.paginationPrevious")}</span>
          </button>
          <span className="text-xs sm:text-sm text-gray-600">
            {t("admin.paginationPage")} {currentPage} {t("admin.paginationOf")} {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-white bg-gold-700 rounded-lg hover:bg-gold-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">{t("admin.paginationNext")}</span>
            <ChevronRight className="w-4 h-4 sm:ml-1" />
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {selectedLoan && actionType && !showEmailChoice && (
        <ConfirmDialog
          title={`${actionType === "approve" ? "Approve" : "Reject"} Loan`}
          message={getActionMessage(selectedLoan, actionType)}
          confirmText={
            isProcessing ? (
              <div className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {actionType === "approve" ? "Approving..." : "Rejecting..."}
              </div>
            ) : actionType === "approve" ? (
              "Approve"
            ) : (
              "Reject"
            )
          }
          confirmVariant={actionType === "approve" ? "primary" : "danger"}
          onConfirm={() => confirmAction(selectedLoan, actionType, currentUser, dispatch, setIsProcessing, setProcessingLoanId, setSelectedLoan, setActionType, setApprovedLoanId, setShowEmailChoice)}
          onCancel={() => {
            setSelectedLoan(null);
            setActionType(null);
          }}
          isDisabled={isProcessing}
        />
      )}

      <EmailChoiceModal
        showEmailChoice={showEmailChoice}
        isProcessing={isProcessing}
        onEmailChoice={(sendEmail) => handleEmailChoice(approvedLoanId, sendEmail, setIsProcessing, setShowEmailChoice, setApprovedLoanId)}
      />

      <RepayModal
        showRepayModal={showRepayModal}
        selectedLoan={selectedLoan}
        repayAmount={repayAmount}
        isRepaying={isRepaying}
        onClose={() => setShowRepayModal(false)}
        onSubmit={() => handleRepaySubmit(selectedLoan, repayAmount, dispatch, setIsRepaying, setShowRepayModal, setSelectedLoan, setRepayAmount)}
      />
    </div>
  );
};

export default LoanApproval;

import React, { useState, useEffect } from "react";
import { X, Calculator } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Loan } from "../../types";
import { addLoan, fetchNetContributions } from "../../utils/api";
import { useLanguage } from "../../context/LanguageContext";
import Toast from "../Common/Toast";

interface LoanRequestFormProps {
  onClose: () => void;
  maxAmount: number;
  interestRate: number;
  availableBalance: number;
  userSavings: number;
  onSubmit: () => Promise<void>;
}

const LoanRequestForm: React.FC<LoanRequestFormProps> = ({
  onClose,
  maxAmount,
  availableBalance, // Used directly — no local recalculation
  userSavings,
}) => {
  const { t } = useLanguage();
  const { state, dispatch } = useApp();
  const { currentUser } = state;

  const [amount, setAmount] = useState("");
  const [repaymentPeriod, setRepaymentPeriod] = useState(6);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [grossContribution, setGrossContribution] = useState<number | null>(
    null,
  );
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  // Load gross contribution (netAvailable) from backend on mount
  useEffect(() => {
    let mounted = true;
    const loadGross = async () => {
      try {
        const net = await fetchNetContributions();
        const value = net?.netAvailable ?? net?.net_available ?? null;
        if (mounted)
          setGrossContribution(typeof value === "number" ? value : null);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          console.warn("Not authorized to fetch net contributions");
        } else {
          console.error("Failed to load gross contribution:", err?.message || err);
        }
        if (mounted) setGrossContribution(null);
      }
    };
    loadGross();
    return () => {
      mounted = false;
    };
  }, []);

  if (!currentUser) return null;

  const loanAmount = parseFloat(amount) || 0;
  const monthlyInterestRate = 0.0125;
  const interestAmount = loanAmount * monthlyInterestRate * repaymentPeriod;
  const repaymentAmount = loanAmount + interestAmount;

  const maxLoanable = Math.min(userSavings * 3, maxAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      loanAmount <= 0 ||
      loanAmount > maxLoanable ||
      loanAmount > availableBalance ||
      repaymentPeriod <= 0
    )
      return;
    setIsSubmitting(true);

    const newLoan: Loan = {
      amount: loanAmount,
      requestDate: new Date(),
      status: "pending",
      interestRate: 1.25,
      repaymentAmount,
      dueDate: new Date(
        Date.now() + repaymentPeriod * 30 * 24 * 60 * 60 * 1000,
      ),
      duration: repaymentPeriod,
    };

    try {
      const backendLoan = await addLoan(newLoan);
      dispatch({ type: "ADD_LOAN", payload: backendLoan });
      
      // Show success toast
      setToast({
        type: "success",
        title: t("toast.loanRequestSuccess"),
        message: t("toast.loanRequestMessage"),
      });
      
      // Close form after toast displays
      setTimeout(() => {
        onClose();
      }, 3000);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Failed to submit loan request to backend", error);
      setToast({
        type: "error",
        title: t("toast.error"),
        message: t("loanRequestForm.submissionFailed"),
      });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
          duration={5000}
        />
      )}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("loanRequestForm.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label
              htmlFor="loanAmountInput"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t("loanRequestForm.loanAmount")}
            </label>
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
                aria-hidden="true"
              >
                €
              </span>
              <input
                id="loanAmountInput"
                name="loanAmount"
                type="number"
                min="1"
                max={Math.min(maxLoanable, availableBalance)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                placeholder="0"
                required
                data-testid="loan-amount-input"
                autoComplete="off"
                aria-label="Loan amount in euros"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t("loanRequestForm.maximumLoanable")}: €
              {maxLoanable.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("loanRequestForm.grossContributions")}: €
              {(grossContribution ?? availableBalance).toLocaleString()}
            </p>
            {loanAmount > maxLoanable && (
              <p className="text-xs text-red-500 mt-1">
                {t("loanRequestForm.exceedsLimit")}
              </p>
            )}
            {loanAmount > availableBalance && (
              <p className="text-xs text-red-500 mt-1">
                {t("loanRequestForm.exceedsSavings")}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="repaymentPeriod"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t("loanRequestForm.repaymentPeriod")}
            </label>
            <input
              id="repaymentPeriod"
              name="repaymentPeriod"
              type="number"
              min="1"
              max="24"
              value={repaymentPeriod}
              data-testid="repayment-period-input"
              onChange={(e) => setRepaymentPeriod(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              placeholder="Enter repayment period"
              required
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("loanRequestForm.defaultSixMonths")}
            </p>
          </div>

          {loanAmount > 0 && (
            <div className="bg-gold-50 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Calculator className="w-5 h-5 text-gold-600 mr-2" />
                <h3 className="font-medium text-gold-900">
                  {t("loanRequestForm.loanCalculation")}
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("loanRequestForm.principalAmount")}
                  </span>
                  <span className="font-medium">
                    €{loanAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {t("loanRequestForm.interest")} (1.25%{" "}
                    {t("loanRequestForm.perMonth")} x {repaymentPeriod}{" "}
                    {t("member.months")}):
                  </span>
                  <span className="font-medium">
                    €{interestAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gold-200 pt-2">
                  <span className="font-medium text-gray-900">
                    {t("loanRequestForm.totalRepayment")}:
                  </span>
                  <span className="font-bold text-gold-900">
                    €{repaymentAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              {t("loanRequestForm.cancel")}
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                loanAmount <= 0 ||
                loanAmount > maxLoanable ||
                loanAmount > availableBalance ||
                repaymentPeriod <= 0
              }
              className="flex-1 px-4 py-2 bg-gold-600 text-white rounded-lg font-medium hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? t("loanRequestForm.submitting")
                : t("loanRequestForm.submitRequest")}
            </button>
          </div>
        </form>
      </div>
    </div>
  </>
  );
};

export default LoanRequestForm;
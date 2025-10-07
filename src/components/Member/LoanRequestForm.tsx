import React, { useState } from "react";
import { X, Calculator } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { Loan } from "../../types";
import { addLoan } from "../../utils/api";

interface LoanRequestFormProps {
  onClose: () => void;
  maxAmount: number;
  interestRate: number;
  availableBalance: number;
  userSavings: number;
}

const LoanRequestForm: React.FC<LoanRequestFormProps> = ({
  onClose,
  maxAmount,
  userSavings,
}) => {
  const { state, dispatch } = useApp();
  const { users, loans, currentUser } = state;

  const totalSavings = users
    .filter((u) => u.role === "member")
    .reduce((sum, u) => sum + u.totalContributions, 0);
  const approvedLoans = loans.filter(
    (loan) => loan.status === "approved" || loan.status === "active"
  );
  const repaidLoans = loans.filter((loan) => loan.status === "repaid");

  const totalApprovedLoanAmount = approvedLoans.reduce(
    (sum, loan) => sum + loan.amount,
    0
  );
  const totalRepaidLoanAmount = repaidLoans.reduce(
    (sum, loan) => sum + loan.amount,
    0
  );

  const availableBalance =
    totalSavings - totalApprovedLoanAmount + totalRepaidLoanAmount;
  const [amount, setAmount] = useState("");
  const [repaymentPeriod, setRepaymentPeriod] = useState(6);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentUser) return null;

  const loanAmount = parseFloat(amount) || 0;
  // Monthly interest rate is 1.25%
  const monthlyInterestRate = 0.0125;
  const interestAmount = loanAmount * monthlyInterestRate * repaymentPeriod;
  const repaymentAmount = loanAmount + interestAmount;

  // Calculate the maximum loanable amount for the user
  const maxLoanable = Math.min(userSavings * 3, maxAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      loanAmount <= 0 ||
      loanAmount > maxLoanable || // Ensure the loan does not exceed the user's limit
      loanAmount > availableBalance || // Ensure the bank has enough funds
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
        Date.now() + repaymentPeriod * 30 * 24 * 60 * 60 * 1000
      ),
      duration: repaymentPeriod,
    };
    try {
      const backendLoan = await addLoan(newLoan); // <-- This sends data to backend
      dispatch({ type: "ADD_LOAN", payload: backendLoan });
    } catch (error) {
      console.error("Failed to submit loan request to backend", error);
    }

    setIsSubmitting(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Request Loan</h2>
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
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Loan Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                id="amount"
                type="number"
                min="1"
                max={Math.min(maxLoanable, availableBalance)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="0"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Maximum loanable: ${maxLoanable.toLocaleString()} (3x your
              savings)
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Bank's available balance: ${availableBalance.toLocaleString()}
            </p>
            {loanAmount > maxLoanable && (
              <p className="text-xs text-red-500 mt-1">
                Loan amount exceeds your maximum loanable limit.
              </p>
            )}
            {loanAmount > availableBalance && (
              <p className="text-xs text-red-500 mt-1">
                Loan amount exceeds the bank's available balance.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="repaymentPeriod"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Repayment Period (in months)
            </label>
            <input
              id="repaymentPeriod"
              type="number"
              min="1"
              max="24"
              value={repaymentPeriod}
              onChange={(e) => setRepaymentPeriod(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter repayment period"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Default is 6 months. Maximum is 24 months.
            </p>
          </div>

          {loanAmount > 0 && (
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Calculator className="w-5 h-5 text-emerald-600 mr-2" />
                <h3 className="font-medium text-emerald-900">
                  Loan Calculation
                </h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Principal Amount:</span>
                  <span className="font-medium">
                    ${loanAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Interest (1.25% per month x {repaymentPeriod} months):
                  </span>
                  <span className="font-medium">
                    ${interestAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-2">
                  <span className="font-medium text-gray-900">
                    Total Repayment:
                  </span>
                  <span className="font-bold text-emerald-900">
                    ${repaymentAmount.toLocaleString()}
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
              Cancel
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
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanRequestForm;

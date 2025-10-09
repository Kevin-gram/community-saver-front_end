import React, { useState, useEffect } from "react";
import { X, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { User } from "../../types";
import { addUser, updateUser, addLoan, updateLoan } from "../../utils/api";

interface UserFormProps {
  user?: User | null;
  onClose: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onClose }) => {
  const { state, dispatch } = useApp();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "member" as "admin" | "member" | "branch_lead",
    branch: "blue" as "blue" | "yellow" | "red" | "purple",
    group: "blue" as "blue" | "yellow" | "red" | "purple",
    totalSavings: 0,
    penalties: 0,
    contributionDate: "",
    loan: {
      amount: 0,
      status: "pending" as
        | "pending"
        | "approved"
        | "rejected"
        | "active"
        | "repaid",
      repaymentAmount: 0,
      paidAmount: 0,
      dueDate: "",
      months: 1,
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [passwordStrengthError, setPasswordStrengthError] = useState("");

  // Password strength validation function
  const isStrongPassword = (pwd: string) => {
    return (
      /[A-Z]/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd) &&
      pwd.length >= 9
    );
  };

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email,
        password: user.password,
        role: user.role,
        branch: user.branch,
        group: user.branch, // sync group with branch
        totalSavings: user.totalContributions,
        penalties: user.penalties || 0,
        contributionDate: user.contributionDate || "",
        loan: user.activeLoan
          ? {
              amount: user.activeLoan.amount,
              status: user.activeLoan.status,
              repaymentAmount: user.activeLoan.repaymentAmount,
              paidAmount: user.activeLoan.paidAmount || 0,
              dueDate: user.activeLoan.dueDate
                ? new Date(user.activeLoan.dueDate).toISOString().slice(0, 10)
                : "",
              months: user.activeLoan.duration || 1,
            }
          : {
              amount: 0,
              status: "pending",
              repaymentAmount: 0,
              paidAmount: 0,
              dueDate: "",
              months: 1,
            },
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user && confirmPassword && formData.password !== confirmPassword) {
      setPasswordMatchError("Passwords do not match");
    } else {
      setPasswordMatchError("");
    }
  }, [formData.password, confirmPassword, user]);

  useEffect(() => {
    if (!user && formData.password && !isStrongPassword(formData.password)) {
      setPasswordStrengthError(
        "Password must be at least 9 characters, include one uppercase letter and one special character."
      );
    } else {
      setPasswordStrengthError("");
    }
  }, [formData.password, user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    // Only require password if creating a new user
    if (!user) {
      if (!formData.password.trim()) {
        newErrors.password = "Password is required";
      } else if (!isStrongPassword(formData.password)) {
        newErrors.password =
          "Password must be at least 9 characters, include one uppercase letter and one special character.";
      }
      if (formData.password !== confirmPassword) {
        newErrors.password = "Passwords do not match";
      }
    }

    if (formData.totalSavings < 0) {
      newErrors.totalSavings = "Savings cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Prepare loan data only if amount > 0
    let activeLoan = undefined;
    if (formData.loan.amount > 0) {
      const repaymentAmount =
        formData.loan.amount * (1 + formData.loan.months * 0.0125);
      activeLoan = {
        id: user?.activeLoan?.id || `loan-${Date.now()}`,
        requestDate: user?.activeLoan?.requestDate || new Date(),
        amount: formData.loan.amount,
        status: formData.loan.status,
        repaymentAmount,
        paidAmount: formData.loan.paidAmount,
        dueDate: formData.loan.dueDate
          ? new Date(formData.loan.dueDate)
          : new Date(),
        memberId: user?.id || `user-${Date.now()}`,
        approvedDate: user?.activeLoan?.approvedDate,
        approvedBy: user?.activeLoan?.approvedBy,
        duration: formData.loan.months,
      };
    }

    // Calculate penalties and deduct from savings
    const penalties = formData.penalties || 0;
    const totalSavings = formData.totalSavings;

    // Get latest interestReceived from context/state
    let latestInterestReceived = 0;
    if (user?.id) {
      const latestUser = state.users.find((u) => u.id === user.id);
      latestInterestReceived = latestUser?.interestReceived || 0;
    }
    // Only send branch to backend, not group
    const userData: User = {
      id: user?.id || `user-${Date.now()}`,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      branch: formData.branch,
      contributionDate: formData.contributionDate,
      totalContributions: totalSavings,
      contributions: user?.contributions || [],
      penalties,
      interestReceived: latestInterestReceived,
      activeLoan,
    };

    try {
      
      if (user) {
        const backendUser = await updateUser(userData);
        if (backendUser) {
          // Map branch to group for frontend
          const userWithGroup = { ...backendUser, group: backendUser.branch };
          dispatch({ type: "UPDATE_USER", payload: userWithGroup });
        }
        if (activeLoan) {
          const backendLoan = await updateLoan(activeLoan);
          dispatch({ type: "UPDATE_LOAN", payload: backendLoan });
        }
      } else {
       
        const backendUser = await addUser(userData);
        if (backendUser) {
          // Map branch to group for frontend
          const userWithGroup = { ...backendUser, group: backendUser.branch };
          dispatch({ type: "ADD_USER", payload: userWithGroup });
        }
        if (activeLoan) {
          const backendLoan = await addLoan(activeLoan);
          dispatch({ type: "ADD_LOAN", payload: backendLoan });
        }
       }
    } catch (error) {
      
      console.error("Failed to update/add user/loan in backend", error);
    }

    setIsSubmitting(false);
    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith("loan.")) {
      const loanField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        loan: {
          ...prev.loan,
          [loanField]: value,
        },
      }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    } else if (field === "group") {
      setFormData((prev) => ({
        ...prev,
        group: value,
        branch: value, // keep branch in sync
      }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-full p-2">
              <UserIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user ? "Edit User" : "Add New User"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      errors.firstName
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-emerald-500"
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      errors.lastName
                        ? "border-red-300 focus:border-red-500"
                        : "border-gray-300 focus:border-emerald-500"
                    }`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  errors.email
                    ? "border-red-300 focus:border-red-500"
                    : "border-gray-300 focus:border-emerald-500"
                }`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            {!user && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        errors.password
                          ? "border-red-300 focus:border-red-500"
                          : "border-gray-300 focus:border-emerald-500"
                      }`}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordStrengthError && (
                    <p className="text-xs text-green-800 mt-1">{passwordStrengthError}</p>
                  )}
                  {errors.password && (
                    <p className="text-xs text-green-800 mt-1">{errors.password}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300 focus:border-emerald-500"
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordMatchError && (
                    <p className="text-xs text-green-800 mt-1">{passwordMatchError}</p>
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="member">Member</option>
                  <option value="branch_lead">Branch Lead</option>
                  {/* <option value="admin">Administrator</option> */}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group *
                </label>
                <select
                  value={formData.group}
                  onChange={(e) => handleInputChange("group", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="blue">Blue</option>
                  <option value="yellow">Yellow</option>
                  <option value="red">Red</option>
                  <option value="purple">Purple</option>
                </select>
              </div>
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Savings
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  value={formData.totalSavings}
                  onChange={(e) =>
                    handleInputChange(
                      "totalSavings",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.totalSavings
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-300 focus:border-emerald-500"
                  }`}
                  placeholder="0"
                  disabled={
                    formData.role === "admin" || formData.role === "branch_lead"
                  }
                />
              </div>
              {errors.totalSavings && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.totalSavings}
                </p>
              )}
            </div> */}

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contribution Date
              </label>
              <input
                type="date"
                value={formData.contributionDate || ""}
                onChange={(e) =>
                  handleInputChange("contributionDate", e.target.value)
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300 focus:border-emerald-500"
                required
                disabled={
                  formData.role === "admin" || formData.role === "branch_lead"
                }
              />
            </div> */}
          </div>

          {user?.role === "member" &&
            user?.activeLoan &&
            user.activeLoan.amount > 0 && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Loan Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.loan.amount}
                      onChange={(e) =>
                        handleInputChange(
                          "loan.amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Loan amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Months
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.loan.months}
                      onChange={(e) =>
                        handleInputChange(
                          "loan.months",
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Months"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.loan.status}
                      onChange={(e) =>
                        handleInputChange("loan.status", e.target.value)
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="active">Active</option>
                      <option value="repaid">Repaid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paid Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.loan.paidAmount}
                      onChange={(e) =>
                        handleInputChange(
                          "loan.paidAmount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Paid amount"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Repayment (with interest)
                    </label>
                    <div className="w-full px-3 py-2 border rounded-lg bg-gray-100">
                      {formData.loan.amount > 0 && formData.loan.months > 0
                        ? (
                            formData.loan.amount +
                            formData.loan.amount * 0.0125 * formData.loan.months
                          ).toFixed(2)
                        : "0.00"}
                    </div>
                  </div>
                </div>
              </div>
            )}

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? "Saving..."
                : user
                ? "Update User"
                : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default UserForm;

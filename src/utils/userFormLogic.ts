import { User } from "../types";
import { addUser, updateUser, addLoan, updateLoan } from "../utils/api";

export const isStrongPassword = (pwd: string) => {
  return /[A-Z]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd) && pwd.length >= 9;
};

export const validateForm = (
  formData: any,
  user: User | null,
  confirmPassword: string
) => {
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

  return newErrors;
};

export const handleSubmit = async (
  e: React.FormEvent,
  formData: any,
  user: User | null,
  confirmPassword: string,
  state: any,
  dispatch: any,
  setIsSubmitting: (v: boolean) => void,
  onClose: () => void
) => {
  e.preventDefault();

  const errors = validateForm(formData, user, confirmPassword);
  if (Object.keys(errors).length > 0) return;

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
    const latestUser = state.users.find((u: any) => u.id === user.id);
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

export const handleInputChange = (
  field: string,
  value: any,
  setFormData: (fn: (prev: any) => any) => void,
  errors: Record<string, string>,
  setErrors: (fn: (prev: Record<string, string>) => Record<string, string>) => void
) => {
  if (field.startsWith("loan.")) {
    const loanField = field.split(".")[1];
    setFormData((prev: any) => ({
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
    setFormData((prev: any) => ({
      ...prev,
      group: value,
      branch: value, // keep branch in sync
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  } else {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }
};

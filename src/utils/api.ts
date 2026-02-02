import { User, Loan, Contribution } from "../types";
import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE;

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchBranches = async () => {
  const res = await api.get("/branches");
  return res.data.data;
};

export const fetchUsers = async () => {
  const res = await api.get("/users");
  return res.data.data.users;
};

export const fetchUserByEmail = async (email: string) => {
  const users = await fetchUsers();
  return users.find((u: any) => u.email === email);
};

export const fetchMemberShares = async () => {
  const res = await api.get("users/shares");
  return res.data.data;
};

export const addUser = async (user: User) => {
  const res = await api.post("/users", user);
  return res.data.data.users;
};

export const updateUser = async (user: Partial<User> & { id: string }) => {
  const res = await api.put(`/users/${user.id}`, user);
  return res.data.data.user;
};

export const deleteUser = async (userId: string) => {
  const res = await api.delete(`/users/${userId}`);
  return res.data.data;
};

export const approveUser = async (userId: string) => {
  const res = await api.post(`/users/${userId}/approve`, {
    status: "approved",
  });
  return res.data.data.user;
};

export const rejectUser = async (userId: string) => {
  const res = await api.post(`/users/${userId}/approve`, {
    status: "rejected",
  });
  return res.data.data.user;
};

export const fetchLoans = async () => {
  const res = await api.get("/loans");
  return res.data.data.loans;
};

export const addLoan = async (loan: Loan) => {
  const res = await api.post("/loans", loan);
  return res.data.data.loan;
};

export const approveOrReject = async (
  loanId: string,
  status: "approved" | "rejected"
) => {
  const body: any = { status };
  const res = await api.post(`/loans/${loanId}/approve`, body);
  return res.data.data.loan;
};

export const updateLoan = async (loan: Loan) => {
  const res = await api.put(`/loans/${loan._id}`, loan);
  return res.data;
};

export const deleteLoan = async (loanId: string) => {
  const res = await api.delete(`/loans/${loanId}`);
  return res.data;
};

export const repayLoan = async (loanId: string, amount: number) => {
  const res = await api.post(`/loans/${loanId}/disburse`, { amount });
  return res.data.data.loan;
};

export const sendLoanApprovalEmail = async (loanId: string) => {
  const res = await api.post(`/loans/${loanId}/send-approval-email`);
  return res.data;
};

export const downloadLoanAgreement = async (loanId: string) => {
  // Fetch the PDF template from public folder
  const response = await fetch('/loan-agreement-template.pdf');
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF template: ${response.statusText}`);
  }
  const blob = await response.blob();
  return {
    data: blob,
    headers: {},
  };
};

export const fetchContributions = async () => {
  const res = await api.get("/contributions");
  return res.data.data.contributions;
};

export const fetchContributionsByMember = async (memberId: string) => {
  const extractContributions = (res: any) => {
    if (!res) return undefined;
    return res.data?.data?.contributions ?? res.data?.contributions ?? res.data;
  };

  try {
    const res = await api.get("/contributions", { params: { memberId } });
    const contributions = extractContributions(res);

    if (contributions !== undefined) {
      if (Array.isArray(contributions)) return contributions;
      if (typeof contributions === "object" && contributions !== null) {
        if (Array.isArray((contributions as any).contributions)) {
          return (contributions as any).contributions;
        }
        return [contributions];
      }
      return [];
    }
  } catch (err) {
    console.warn("fetchContributionsByMember primary attempt failed for memberId:", memberId, err?.message || err);
  }

  try {
    const allRes = await api.get("/contributions");
    const all = allRes.data?.data?.contributions ?? allRes.data;

    if (!Array.isArray(all)) return [];

    const filtered = all.filter((c: any) => {
      const ids: string[] = [];
      const push = (v: any) => {
        if (v === undefined || v === null) return;
        if (Array.isArray(v)) return v.forEach(push);
        ids.push(String(v));
      };
      push(c.memberId?._id);
      push(c.memberId?.id);
      push(c.member?._id);
      push(c.member?.id);
      push(c.memberId);
      push(c.member);
      return ids.includes(String(memberId));
    });

    return filtered;
  } catch (err) {
    console.error("fetchContributionsByMember final fallback failed:", err?.message || err);
    return [];
  }
};

export const addContribution = async (contribution: Contribution) => {
  const res = await api.post("/contributions", contribution);
  return res.data.data;
};

export const updateContribution = async (contribution: Contribution) => {
  const res = await api.put(`/contributions/${contribution.id}`, contribution);
  return res.data;
};

export const deleteContribution = async (contributionId: string) => {
  const res = await api.delete(`/contributions/${contributionId}`);
  return res.data;
};

export const fetchNetContributions = async () => {
  const res = await api.get("/contributions/net");
  return res.data.data;
};

export const fetchPenalties = async () => {
  const res = await api.get("/penalties");
  return res.data.data.penalties;
};

export const updatePenalty = async (penaltyId: string, updates: any) => {
  const res = await api.post(`/penalties/${penaltyId}/pay`, updates);
  return res.data.data.penalty;
};

export const deletePenalty = async (penaltyId: string) => {
  const res = await api.delete(`/penalties/${penaltyId}`);
  return res.data;
};

export const createPenalty = async (penaltyData: {
  member: string;
  amount: number;
  reason: string;
  description: string;
  assignedBy: string;
  status: string;
  assignedDate: string;
  branch: string;
}) => {
  try {
    const res = await api.post("/penalties", penaltyData);
    return res.data.data.penalty;
  } catch (error) {
    console.error("Penalty creation error:", error);
    throw error;
  }
};

export const registerUser = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  branch?: string;
  role: string;
}) => {
  const res = await api.post("/auth/register", userData);
  return res.data.data;
};

export const loginUser = async (credentials: {
  email: string;
  password: string;
}) => {
  const res = await api.post("/auth/login", credentials);
  if (res.data && res.data.token) {
    localStorage.setItem("token", res.data.token);
  }
  return res.data;
};

export const forgotPassword = async (email: string) => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const res = await api.post("/auth/reset-password", { token, newPassword });
  return res.data;
};
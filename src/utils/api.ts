export const fetchBranches = async () => {
  const res = await api.get("/branches");
  return res.data.data;
};

import { User, Loan, Contribution } from "../types";
import axios from "axios";

export const API_BASE = "https://golden-lion.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

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

// CONTRIBUTIONS
export const fetchContributions = async () => {
  const res = await api.get("/contributions");
  return res.data.data.contributions;
};

// New: fetch contributions for a single member via query param ?memberId=...
export const fetchContributionsByMember = async (memberId: string) => {
	// Log entry for easier tracing
	// eslint-disable-next-line no-console
	// Helper to normalise contributions from axios response
	const extractContributions = (res: any) => {
		if (!res) return undefined;
		// Backend may return { data: { contributions: [...] } } or { contributions: [...] } or array directly
		return res.data?.data?.contributions ?? res.data?.contributions ?? res.data;
	};

	// First, try the canonical single query (server should support this)
	try {
		const res = await api.get("/contributions", { params: { memberId } });
		const contributions = extractContributions(res);

		// eslint-disable-next-line no-console
		console.debug("fetchContributionsByMember primary attempt:", {
			memberId,
			contribPreview: Array.isArray(contributions) ? contributions.length : typeof contributions,
			raw: res?.data,
		});

		if (contributions !== undefined) {
			// Normalize to array
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
		// eslint-disable-next-line no-console
		console.warn("fetchContributionsByMember primary attempt failed for memberId:", memberId, err?.message || err);
	}

	// Fallback: fetch all contributions and filter client-side.
	// This is defensive and should be rare.
	try {
		const allRes = await api.get("/contributions");
		const all = allRes.data?.data?.contributions ?? allRes.data;
		// eslint-disable-next-line no-console
		console.debug("fetchContributionsByMember fallback: total contributions fetched:", Array.isArray(all) ? all.length : typeof all);

		if (!Array.isArray(all)) return [];

		const filtered = all.filter((c: any) => {
			// match any common nested id fields
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

		// eslint-disable-next-line no-console
		console.debug(`fetchContributionsByMember: client-side filtered ${filtered.length} of ${all.length} for id=${memberId}`);
		return filtered;
	} catch (err) {
		// eslint-disable-next-line no-console
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

// GET all penalties
export const fetchPenalties = async () => {
  const res = await api.get("/penalties");
  return res.data.data.penalties;
};

// PUT (update) a penalty
export const updatePenalty = async (penaltyId: string, updates: any) => {
  const res = await api.post(`/penalties/${penaltyId}/pay`, updates);
  return res.data.data.penalty;
};

export const repayLoan = async (loanId: string, amount: number) => {
  const res = await api.post(`/loans/${loanId}/disburse`, { amount });
  return res.data.data.loan;
};

// DELETE a penalty
export const deletePenalty = async (penaltyId: string) => {
  const res = await api.delete(`/penalties/${penaltyId}`);
  return res.data;
};

export const fetchNetContributions = async () => {
  const res = await api.get("/contributions/net");
  return res.data.data;
};

// New: trigger approval email for a loan
export const sendLoanApprovalEmail = async (loanId: string) => {
  const res = await api.post(`/loans/${loanId}/send-approval-email`);
  return res.data;
};

export const downloadLoanAgreement = async (loanId: string) => {
  // Call backend endpoint to get the agreement as a blob.
  // Endpoint: GET /loans/loan-agreement?loanId=...
  const res = await api.get(`/loans/loan-agreement`, {
    responseType: "blob",
    params: { loanId },
  });
  return res; // axios response with res.data (Blob) and res.headers
};
// AUTH
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
  // Store token in localStorage if present
  if (res.data && res.data.token) {
    localStorage.setItem("token", res.data.token);
  }
  return res.data;
};

export const createPenalty = async (penaltyData: {
  member: string; // Just the member ID
  amount: number;
  reason: string;
  description: string;
  assignedBy: string; // Just the assigner ID
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

export const forgotPassword = async (email: string) => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const res = await api.post("/auth/reset-password", { token, newPassword });
  return res.data;
};

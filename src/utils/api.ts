
export const fetchBranches = async () => {
  const res = await api.get("/branches");
  return res.data.data;
};

import { User, Loan, Contribution } from "../types";
import axios from "axios";

const API_BASE = "https://community-saver-quyb.onrender.com/api";

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
  const res = await api.post(`/users/${userId}/approve`, { status: "approved" });
  return res.data.data.user;
};

export const rejectUser = async (userId: string) => {
  const res = await api.post(`/users/${userId}/approve`, { status: "rejected" });
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
  status: "approved" | "rejected",
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
}
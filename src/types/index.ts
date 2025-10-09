export interface User {
  id: string;
  _id?:string;
  email: string;
  password: string;
  role: "admin" | "member" | "branch_lead";
  firstName: string;
  lastName: string;
  branch: "blue" | "yellow" | "red" | "purple";
  totalContributions: number;
  contributionDate?: string;
  activeLoan?: Loan;
  contributions: Contribution[];
  penalties: number | MemberPenalties;
  totalPenalties?:number;//to be cleaned
  isActive?: boolean;
  interestReceived: number;
  status?:string;
}

export interface Loan {
  _id?: string;
  id?: string;
  memberId?: string;
  amount: number;
  requestDate: Date;
  approvedDate?: Date;
  status: "pending" | "approved" | "rejected" | "active" | "repaid";
  approvedBy?: string;
  repaymentAmount: number;
  totalAmount?: number;
  paidAmount?: number;
  interestRate?: number;
  dueDate: Date;
  createdAt?: Date;
  riskAssessment?: number;
  member?: User;
  appliedDate?: Date;
  duration: number;
  // Add this line for compatibility with backend responses
  [key: string]: any; // <-- allows extra properties like _id, id, etc.
}

export type NormalizedLoan = Loan & { _id?: string; id?: string };

export interface Contribution {
  id: string;
  userId: string;
  memberId: string | { _id: string };
  amount: number;
  contributionDate: string;
  month: string;
  type: "regular" | "penalty" | "interest"| "adjustment";
}

export interface GroupRules {
  maxLoanMultiplier: number;
  maxLoanAmount: number;
  interestRate: number;
  penaltyFee: number;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  loans: Loan[];
  contributions: Contribution[];
  groupRules: Record<string, GroupRules>;
  bankBalance: number;
  paidPenalties: string[];
}

export interface NetContributions {
  netAvailable: number;
  bestFutureBalance: number;
  totalPaidPenalties: number;
  // add other properties if your API returns more
}
export interface AppState {
    currentUser: User | null;
  users: User[];
  loans: Loan[];
  contributions: Contribution[];
  groupRules: Record<string, GroupRules>;
  bankBalance: number;
  paidPenalties: string[];
  memberShares: any[];  
  loading: boolean;     
}
export type AppError = string | null;
export type InputValue = string | number;

// Add type for member penalties
export interface MemberPenalties {
  isPaid: boolean;
  paid: number;
  pending: number;
  total: number;
}

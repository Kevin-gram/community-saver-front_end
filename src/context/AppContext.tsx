import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from "react";
import { AppState, User, Loan, Contribution, GroupRules } from "../types";
import { fetchUsers, fetchLoans, fetchContributions, fetchMemberShares } from "../utils/api";

type AppAction =
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "ADD_USER"; payload: User }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "DELETE_USER"; payload: string }
  | { type: "ADD_LOAN"; payload: Loan }
  | { type: "UPDATE_LOAN"; payload: Loan }
  | { type: "ADD_CONTRIBUTION"; payload: Contribution }
  | {
      type: "UPDATE_GROUP_RULES";
      payload: { group: string; rules: GroupRules };
    }
  | { type: "LOAD_USERS"; payload: User[] }
  | { type: "LOAD_LOANS"; payload: Loan[] }
  | { type: "LOAD_CONTRIBUTIONS"; payload: Contribution[] }
  | { type: "LOAD_MEMBER_SHARES"; payload: any[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "ADD_PAID_PENALTY"; payload: string };

const getInitialUser = () => {
  const userStr = localStorage.getItem("currentUser");
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

const initialState: AppState = {
  currentUser: getInitialUser(),
  users: [],
  loans: [],
  contributions: [],
  memberShares: [],
  loading: true,
  groupRules: {
    blue: {
      maxLoanMultiplier: 3,
      maxLoanAmount: 25000,
      interestRate: 0.1,
      penaltyFee: 500,
    },
    yellow: {
      maxLoanMultiplier: 3,
      maxLoanAmount: 25000,
      interestRate: 0.12,
      penaltyFee: 600,
    },
    red: {
      maxLoanMultiplier: 3,
      maxLoanAmount: 25000,
      interestRate: 0.08,
      penaltyFee: 400,
    },
    purple: {
      maxLoanMultiplier: 3,
      maxLoanAmount: 25000,
      interestRate: 0.15,
      penaltyFee: 750,
    },
  },
  bankBalance: 0,
  paidPenalties: [],
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };

    case "LOAD_MEMBER_SHARES":
      return {
        ...state,
        memberShares: action.payload,
      };

    case "ADD_PAID_PENALTY":
      return {
        ...state,
        paidPenalties: [...state.paidPenalties, action.payload],
      };

    case "LOGIN": {
      localStorage.setItem("currentUser", JSON.stringify(action.payload));
      return { ...state, currentUser: action.payload };
    }

    case "LOGOUT": {
      localStorage.removeItem("currentUser");
      return { ...state, currentUser: null };
    }

    case "ADD_USER":
      return { ...state, users: [...state.users, action.payload] };

    case "UPDATE_USER":
      if (!action.payload || !action.payload.id) {
        console.warn("UPDATE_USER called with invalid payload", action.payload);
        return state;
      }
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === action.payload.id ? action.payload : user
        ),
      };

    case "DELETE_USER":
      return {
        ...state,
        users: state.users.filter((user) => user.id !== action.payload),
      };

    case "ADD_LOAN":
      return { ...state, loans: [...state.loans, action.payload] };

    case "UPDATE_LOAN": {
      if (!action.payload) {
        console.warn("UPDATE_LOAN called with invalid payload", action.payload);
        return state;
      }
      // Normalize id
      const id = action.payload.id || action.payload._id;
      // Normalize memberId
      let memberId = action.payload.memberId;
      if (
        !memberId &&
        action.payload.member &&
        typeof action.payload.member === "object"
      ) {
        memberId = action.payload.member.id || action.payload.member._id;
      }
      if (!id || !memberId) {
        console.warn(
          "UPDATE_LOAN: Could not determine id or memberId",
          action.payload
        );
        return state;
      }
      let updatedUsers = state.users;
      let newBankBalance = state.bankBalance;
      if (action.payload.status === "approved") {
        updatedUsers = state.users.map((user) =>
          user.id === memberId
            ? { ...user, activeLoan: { ...action.payload, id } }
            : user
        );
      } else if (action.payload.status === "rejected") {
        updatedUsers = state.users.map((user) =>
          user.id === memberId && user.activeLoan?.id === id
            ? { ...user, activeLoan: undefined }
            : user
        );
      } else if (
        action.payload.status === "repaid" &&
        action.payload.paidAmount
      ) {
        newBankBalance += action.payload.paidAmount;
        const repaidLoan = action.payload;
        const interest = repaidLoan.repaymentAmount - repaidLoan.amount;
        const allMembers = state.users.filter((u) => u.role === "member");
        const totalSavings = allMembers.reduce(
          (sum, u) => sum + u.totalContributions,
          0
        );
        updatedUsers = state.users.map((user) => {
          if (user.role === "member" && totalSavings > 0) {
            const percent = user.totalContributions / totalSavings;
            const interestShare = interest * percent;
            return {
              ...user,
              interestReceived: (user.interestReceived || 0) + interestShare,
            };
          }
          return user;
        });
      }
      return {
        ...state,
        loans: state.loans.map((loan) =>
          (loan.id || loan._id) === id ? { ...action.payload, id } : loan
        ),
        users: updatedUsers,
        bankBalance: newBankBalance,
        currentUser: state.currentUser
          ? updatedUsers.find((u) => u.id === state.currentUser?.id) ||
            state.currentUser
          : null,
      };
    }

    case "ADD_CONTRIBUTION":
      if (
        !action.payload ||
        (typeof action.payload.memberId === "undefined" &&
          typeof action.payload.userId === "undefined")
      ) {
        console.warn(
          "ADD_CONTRIBUTION called with invalid payload",
          action.payload
        );
        return state;
      }

      // Type guard for memberId to avoid TS error
      let normalizedMemberId: string;
      if (
        action.payload.memberId &&
        typeof action.payload.memberId === "object" &&
        "_id" in action.payload.memberId
      ) {
        normalizedMemberId = (action.payload.memberId as { _id: string })._id;
      } else {
        normalizedMemberId = action.payload.memberId;
      }

      return {
        ...state,
        contributions: [
          ...state.contributions,
          { ...action.payload, memberId: normalizedMemberId },
        ],
        users: state.users.map((user) => {
          if (user.id !== normalizedMemberId) return user;
          let newSavings =
            (user.totalContributions || 0) + (action.payload.amount || 0);
          let newPenalties = user.penalties || 0;
          if (action.payload.type === "penalty") {
            // newPenalties += 25;
          }
          return {
            ...user,
            totalContributions: newSavings,
            penalties: newPenalties,
            contributions: [
              ...(user.contributions || []),
              { ...action.payload, memberId: normalizedMemberId },
            ],
          };
        }),
      };

    case "UPDATE_GROUP_RULES":
      return {
        ...state,
        groupRules: {
          ...state.groupRules,
          [action.payload.group]: action.payload.rules,
        },
      };

    case "LOAD_USERS":
      return { ...state, users: action.payload };

    case "LOAD_LOANS":
      return { ...state, loans: action.payload };

    case "LOAD_CONTRIBUTIONS":
      return { ...state, contributions: action.payload };

    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load all data from backend API on mount
  useEffect(() => {
    const loadData = async () => {
      dispatch({ type: "SET_LOADING", payload: true });
      
      try {
        const [users, loans, contributions, memberSharesData] = await Promise.all([
          fetchUsers(),
          fetchLoans(),
          fetchContributions(),
          fetchMemberShares(),
        ]);

        // Extract shares array from response
        const sharesArray = memberSharesData.data || memberSharesData.shares || memberSharesData;
        
        // Try to re-match currentUser from localStorage with loaded users
        const userStr = localStorage.getItem("currentUser");
        let matchedUser = null;
        if (userStr) {
          try {
            const storedUser = JSON.parse(userStr);
            matchedUser =
              users.find((u: User) => u.id === storedUser.id) || null;
          } catch {}
        }

        dispatch({ type: "LOAD_USERS", payload: users });
        dispatch({ type: "LOAD_LOANS", payload: loans });
        dispatch({ type: "LOAD_CONTRIBUTIONS", payload: contributions });
        dispatch({ type: "LOAD_MEMBER_SHARES", payload: Array.isArray(sharesArray) ? sharesArray : [] });
        
        if (matchedUser) {
          dispatch({ type: "LOGIN", payload: matchedUser });
        }
      } catch (error) {
        console.error("Failed to load initial data from backend", error);
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };
    
    loadData();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};
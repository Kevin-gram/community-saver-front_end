import { fetchNetContributions, fetchUsers, fetchLoans } from "../utils/api";

// Constants
export const POLLING_INTERVAL = 10000; // 10 seconds
export const MAX_RECENT_LOANS = 5;
export const BRANCHES = ["blue", "yellow", "red", "purple"] as const;

// Utility functions
export const getBranchColorClass = (branch: string): string => {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
  };
  return colorMap[branch] || "bg-gray-500";
};

// Fetch functions
export const fetchTotalMembers = async (showLoader = false, setTotalMembers: (v: number) => void, setTotalMembersLoading: (v: boolean) => void) => {
  try {
    if (showLoader) setTotalMembersLoading(true);
    const fetchedUsers = await fetchUsers();
    const members = Array.isArray(fetchedUsers)
      ? fetchedUsers.filter(
          (u: any) =>
            (u.role === "member" || u.role === "branch_lead") &&
            u.status === "approved"
        )
      : [];
    setTotalMembers(members.length);
  } catch (e) {
    setTotalMembers(0);
  } finally {
    if (showLoader) setTotalMembersLoading(false);
  }
};

export const fetchNetData = async (
  showLoader: boolean,
  setNetContributionsLoading: (v: boolean) => void,
  setNetContributions: (v: any) => void,
  isMountedRef: React.MutableRefObject<boolean>
) => {
  try {
    if (showLoader) {
      setNetContributionsLoading(true);
    }
    
    const net = await fetchNetContributions();
    
    // Only update state if component is still mounted
    if (isMountedRef.current) {
      setNetContributions(net);
      // keep any UI error state untouched (don't show retry banner)
    }
  } catch (err) {
    console.error("Failed to fetch net contributions:", err);
    
    if (isMountedRef.current) {
      // Do not surface a retry banner to the user. Optionally clear loader-only state.
      if (showLoader) {
        setNetContributions(null);
      }
    }
  } finally {
    if (isMountedRef.current && showLoader) {
      setNetContributionsLoading(false);
    }
  }
};

export const getOverviewLoans = async (setOverviewLoans: (v: any[]) => void, setOverviewLoansLoading: (v: boolean) => void, mounted: boolean) => {
  try {
    setOverviewLoansLoading(true);
    const fetchedLoans = await fetchLoans();
    if (mounted && Array.isArray(fetchedLoans)) {
      setOverviewLoans(fetchedLoans);
    }
  } catch (e) {
    console.error("Failed to fetch overview loans:", e);
    if (mounted) setOverviewLoans([]);
  } finally {
    if (mounted) setOverviewLoansLoading(false);
  }
};

export const getOverviewUsers = async (setOverviewUsers: (v: any[]) => void, setOverviewUsersLoading: (v: boolean) => void, mounted: boolean) => {
  try {
    setOverviewUsersLoading(true);
    const fetchedUsers = await fetchUsers();
    if (mounted && Array.isArray(fetchedUsers)) {
      setOverviewUsers(fetchedUsers);
    }
  } catch (e) {
    console.error("Failed to fetch overview users:", e);
    if (mounted) setOverviewUsers([]);
  } finally {
    if (mounted) setOverviewUsersLoading(false);
  }
};

// Configurations
export const getStats = (
  totalMembers: number,
  netContributions: any,
  pendingLoans: number,
  financialDataLoading: boolean,
  netContributionsLoading: boolean
) => [
  {
    title: "Total Members",
    value: totalMembers.toString(),
    icon: "Users",
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    loading: financialDataLoading,
  },
  {
    title: "Available Balance",
    value: netContributions
      ? `€${netContributions.netAvailable.toLocaleString()}`
      : "-",
    icon: "DollarSign",
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    loading: financialDataLoading,
  },
  {
    title: "Future Balance",
    value: netContributions
      ? `€${netContributions.bestFutureBalance.toLocaleString()}`
      : "-",
    icon: "TrendingUp",
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    loading: financialDataLoading,
  },
  {
    title: "Pending Loans",
    value: pendingLoans.toString(),
    icon: "AlertCircle",
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    loading: financialDataLoading,
  },
  {
    title: "Total Penalties Collected",
    value: netContributions
      ? `€${netContributions.totalPaidPenalties.toLocaleString()}`
      : "-",
    icon: "AlertCircle",
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    loading: netContributionsLoading,
  },
];

export const tabs = [
  { id: "overview", label: "Overview", icon: "TrendingUp" },
  { id: "users", label: "User Management", icon: "Users" },
  { id: "loans", label: "Loan Approval", icon: "CheckCircle" },
  { id: "groupshares", label: "Group Shares & Interest", icon: "DollarSign" },
  { id: "penalties", label: "Penalties", icon: "AlertCircle" },
  { id: "registrations", label: "Registration Approval", icon: "UserCheck" },
];

// Helper functions
export const getValidLoans = (overviewLoans: any[], overviewUsers: any[]) => {
  return overviewLoans.filter(loan => {
    return loan.member && 
           loan.member._id && 
           loan.amount && 
           loan.status &&
           overviewUsers.some(user => user._id === loan.member?._id);
  });
};

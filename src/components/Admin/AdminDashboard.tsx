import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  UserCheck,
  AlertOctagon,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { NetContributions } from "../../types";
import { Bars } from "react-loader-spinner";

import UserManagement from "./UserManagement";
import LoanApproval from "./LoanApproval";
import GroupShares from "./GroupShares";
import Penalties from "./Penalties";
import { fetchNetContributions } from "../../utils/api";
import RegistrationApproval from "./RegistrationApproval";

// Constants
const POLLING_INTERVAL = 10000; // 30 seconds instead of 5 seconds
const MAX_RECENT_LOANS = 5;
const BRANCHES = ["blue", "yellow", "red", "purple"] as const;

const AdminDashboard: React.FC = () => {
  const { state } = useApp();
  const { users, loans } = state;
  
  // State management
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [netContributions, setNetContributions] = useState<NetContributions | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup
  const isMountedRef = useRef(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized calculations
  const pendingLoans = loans.filter((loan) => loan.status === "pending").length;
  const totalMembers = users.filter(
    (user) => user.role === "member" && user.status === "approved"
  ).length;
  const pendingRegistrations = users.filter((user) => user.status === "pending").length;

  // Fetch net contributions with error handling
  const fetchNetData = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      
      const net = await fetchNetContributions();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setNetContributions(net);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch net contributions:", err);
      
      if (isMountedRef.current) {
        setError("Failed to load financial data. Retrying...");
        // Don't clear existing data on subsequent failures
        if (showLoader) {
          setNetContributions(null);
        }
      }
    } finally {
      if (isMountedRef.current && showLoader) {
        setLoading(false);
      }
    }
  }, []);

  // Setup polling effect
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch with loading spinner
    fetchNetData(true);

    // Setup polling interval for background updates - only if tab is visible
    const handleVisibilityChange = () => {
      if (document.hidden && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      } else if (!document.hidden && !pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(() => {
          fetchNetData(false);
        }, POLLING_INTERVAL);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    if (!document.hidden) {
      pollingIntervalRef.current = setInterval(() => {
        fetchNetData(false);
      }, POLLING_INTERVAL);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [fetchNetData]);

  // Stats configuration
  const stats = [
    {
      title: "Total Members",
      value: totalMembers.toString(),
      icon: Users,
      color: "text-emerald-600",
      bg: "bg-blue-100",
    },
    {
      title: "Available Balance",
      value: netContributions
        ? `€${netContributions.netAvailable.toLocaleString()}`
        : "-",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      title: "Future Balance",
      value: netContributions
        ? `€${netContributions.bestFutureBalance.toLocaleString()}`
        : "-",
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      title: "Pending Loans",
      value: pendingLoans.toString(),
      icon: AlertCircle,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Total Penalties Collected",
      value: netContributions
        ? `€${netContributions.totalPaidPenalties.toLocaleString()}`
        : "-",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-100",
    },
  ];

  // Tabs configuration
  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "registrations", label: "Registration Approval", icon: UserCheck },
    { id: "users", label: "User Management", icon: Users },
    { id: "loans", label: "Loan Approval", icon: CheckCircle },
    { id: "groupshares", label: "Group Shares & Interest", icon: DollarSign },
    { id: "penalties", label: "Penalties", icon: AlertCircle },
  ];

  // Get branch color classes
  const getBranchColorClass = (branch: string): string => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-500",
      yellow: "bg-yellow-500",
      red: "bg-red-500",
      purple: "bg-purple-500",
    };
    return colorMap[branch] || "bg-gray-500";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {loading && (
        <div className="fixed inset-0 flex justify-center items-center bg-white bg-opacity-70 z-50">
          <Bars
            height={50}
            width={50}
            color="#10b981"
            ariaLabel="bars-loading"
            wrapperStyle={{}}
            wrapperClass=""
            visible={true}
          />
        </div>
      )}
      {!loading && (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-700 mb-2">
              Admin Dashboard
            </h1>
            {error && (
              <div className="mt-2 text-sm text-amber-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {error}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.bg} rounded-lg p-3`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-emerald-700 text-emerald-700"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                >
                  <tab.icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Loans */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recent Loan Requests
                  </h3>
                  <div className="space-y-4">
                    {loans.length === 0 ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse"
                          >
                            <div className="flex-1">
                              <div className="h-4 bg-emerald-200 rounded w-32 mb-2"></div>
                              <div className="h-3 bg-emerald-200 rounded w-20"></div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-emerald-200 rounded-full"></div>
                              <div className="h-6 bg-emerald-200 rounded-full w-16"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      loans.slice(0, MAX_RECENT_LOANS).map((loan) => {
                        const member = users.find((u) => u._id === loan.member?._id);
                        return (
                          <div
                            key={loan._id || loan.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {member?.firstName || "Unknown Member"}
                              </p>
                              <p className="text-sm text-gray-500">
                                €{loan.amount.toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center">
                              {loan.status === "pending" ? (
                                <Clock className="w-4 h-4 text-blue-500 mr-2" />
                              ) : loan.status === "approved" ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                              )}
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  loan.status === "pending"
                                    ? "bg-blue-100 text-blue-800"
                                    : loan.status === "approved"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Branch Overview */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Branch Distribution
                  </h3>
                  <div className="space-y-4">
                    {users.length === 0 ? (
                      <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse"
                          >
                            <div className="flex items-center flex-1">
                              <div className="w-4 h-4 bg-emerald-200 rounded-full mr-3"></div>
                              <div className="h-4 bg-emerald-200 rounded w-24"></div>
                            </div>
                            <div className="text-right">
                              <div className="h-4 bg-emerald-200 rounded w-20 mb-2"></div>
                              <div className="h-3 bg-emerald-200 rounded w-16"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      BRANCHES.map((branch) => {
                        const groupMembers = users.filter(
                          (u) => u.branch === branch && u.role === "member"
                        );
                        const totalSavings = groupMembers.reduce(
                          (sum, u) => sum + (u.totalContributions || 0),
                          0
                        );

                        return (
                          <div
                            key={branch}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center">
                              <div
                                className={`w-4 h-4 rounded-full mr-3 ${getBranchColorClass(branch)}`}
                                aria-hidden="true"
                              />
                              <span className="font-medium text-gray-900 capitalize">
                                {branch} Branch
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                {groupMembers.length} {groupMembers.length === 1 ? "member" : "members"}
                              </p>
                              <p className="text-sm text-gray-500">
                                €{totalSavings.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "registrations" && <RegistrationApproval />}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "loans" && <LoanApproval />}
          {activeTab === "groupshares" && <GroupShares />}
          {activeTab === "penalties" && <Penalties />}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
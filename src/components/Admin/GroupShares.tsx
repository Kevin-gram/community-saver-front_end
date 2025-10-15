import React, { useEffect, useState, useCallback, useRef } from "react";
import { fetchMemberShares } from "../../utils/api";
import { AlertCircle, ChevronLeft, ChevronRight, TrendingUp, PiggyBank } from "lucide-react";

type MemberShare = {
  id: string;
  name: string;
  branch: string;
  totalContribution: number;
  sharePercentage: number;
  interestEarned: number;
  interestToBeEarned: number;
};

const SharesTableSkeleton = () => (
  <div className="animate-pulse">
    {/* Stats Skeleton */}
    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
      <div>
        <div className="h-6 w-48 bg-emerald-100 rounded mb-2"></div>
        <div className="h-8 w-32 bg-emerald-100 rounded"></div>
      </div>
      <div>
        <div className="h-6 w-48 bg-emerald-100 rounded mb-2"></div>
        <div className="h-8 w-32 bg-emerald-100 rounded"></div>
      </div>
    </div>

    {/* Table Skeleton */}
    <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {[...Array(6)].map((_, i) => (
              <th key={i} className="text-left py-3 px-4">
                <div className="h-4 w-24 bg-emerald-100 rounded"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(8)].map((_, idx) => (
            <tr
              key={idx}
              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              {[...Array(6)].map((_, cellIdx) => (
                <td key={cellIdx} className="py-3 px-4">
                  <div className="h-4 w-20 bg-emerald-200 rounded"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ITEMS_PER_PAGE = 6;

const GroupShares: React.FC = () => {
  const [globalStats, setGlobalStats] = useState<MemberShare[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const cachedDataRef = useRef<{data: MemberShare[] | null, timestamp: number}>({
    data: null,
    timestamp: 0
  });

  const CACHE_DURATION = 5000; // 5 seconds cache
  const REQUEST_TIMEOUT = 8000; // 8 seconds timeout

  const fetchData = useCallback(async () => {
    // Use cached data if available and fresh
    const now = Date.now();
    if (cachedDataRef.current.data && 
        (now - cachedDataRef.current.timestamp) < CACHE_DURATION) {
      setGlobalStats(cachedDataRef.current.data);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      // Only set loading true if it's the initial load
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      const data = await fetchMemberShares();
      
      // Cache the new data
      cachedDataRef.current = {
        data,
        timestamp: Date.now()
      };
      
      setGlobalStats(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch member shares", err);
      // Use cached data as fallback if available
      if (cachedDataRef.current.data) {
        setGlobalStats(cachedDataRef.current.data);
      } else {
        setError(err.message || "Failed to load shares data");
      }
    } finally {
      clearTimeout(timeoutId);
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  }, [isInitialLoad]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup polling for updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Modify the loading condition in the render
  if (loading && isInitialLoad) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-extrabold mb-8 text-emerald-700 text-center drop-shadow">
          Group Shares & Interest
        </h2>
        <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 rounded-xl shadow-lg border border-gray-200 p-8">
          <SharesTableSkeleton />
          <div className="mt-4 text-center text-sm text-gray-500">
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-extrabold mb-8 text-emerald-700 text-center drop-shadow">
          Global Shares & Interest
        </h2>
        <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Failed to Load Data
            </h3>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              {error}
            </p>
            <button
              onClick={fetchData}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!globalStats || globalStats.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-3xl font-extrabold mb-8 text-emerald-700 text-center drop-shadow">
          Global Shares & Interest
        </h2>
        <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-600 text-center">
              No member shares data available yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalSavings = globalStats.reduce((sum, member) => sum + member.totalContribution, 0);
  const totalInterest = globalStats.reduce((sum, member) => sum + member.interestEarned, 0);

  // Calculate pagination values
  const totalPages = Math.ceil(globalStats.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMembers = globalStats.slice(startIndex, endIndex);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-3xl font-extrabold mb-8 text-emerald-700 text-center drop-shadow">
        Global Shares & Interest
      </h2>
      <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Total Member Savings
            </p>
            <div className="text-2xl font-bold text-emerald-700">
              €{totalSavings.toLocaleString()}
            </div>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Total Interest Distributed
            </p>
            <div className="text-2xl font-bold text-emerald-700">
              €{totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        <div className="mt-6">
          <h4 className="text-xl font-semibold mb-4 text-emerald-700">
            Member Shares ({globalStats.length} members)
          </h4>
          <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Group
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Shares
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Percent
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      Interest
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      Future Interest
                      <PiggyBank className="w-4 h-4 text-emerald-600" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentMembers.map((member: MemberShare, idx: number) => (
                  <tr
                    key={member.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="py-3 px-4 text-gray-700 font-semibold capitalize">
                      {member.branch}
                    </td>
                    <td className="py-3 px-4">
                      €{member.totalContribution.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {member.sharePercentage.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">
                      €{member.interestEarned.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">
                      €{member.interestToBeEarned.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modern Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center px-4 py-2 text-sm text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupShares;
import React, { useEffect, useState, useCallback, useRef } from "react";
import { fetchMemberShares } from "../../utils/api";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PiggyBank,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

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
        <div className="h-6 w-48 bg-gold-100 rounded mb-2"></div>
        <div className="h-8 w-32 bg-gold-100 rounded"></div>
      </div>
      <div>
        <div className="h-6 w-48 bg-gold-100 rounded mb-2"></div>
        <div className="h-8 w-32 bg-gold-100 rounded"></div>
      </div>
    </div>

    {/* Card Skeleton for Mobile */}
    <div className="md:hidden space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="h-5 w-32 bg-gold-100 rounded mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gold-100 rounded"></div>
            <div className="h-4 w-3/4 bg-gold-100 rounded"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Table Skeleton for Desktop */}
    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-100 bg-white shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {[...Array(6)].map((_, i) => (
              <th key={i} className="text-left py-3 px-4">
                <div className="h-4 w-24 bg-gold-100 rounded"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(6)].map((_, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {[...Array(6)].map((_, cellIdx) => (
                <td key={cellIdx} className="py-3 px-4">
                  <div className="h-4 w-20 bg-gold-200 rounded"></div>
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
  const { t } = useLanguage();
  const [globalStats, setGlobalStats] = useState<MemberShare[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const cachedDataRef = useRef<{
    data: MemberShare[] | null;
    timestamp: number;
  }>({
    data: null,
    timestamp: 0,
  });

  const CACHE_DURATION = 5000;
  const REQUEST_TIMEOUT = 8000;

  const fetchData = useCallback(async () => {
    const now = Date.now();
    if (
      cachedDataRef.current.data &&
      now - cachedDataRef.current.timestamp < CACHE_DURATION
    ) {
      setGlobalStats(cachedDataRef.current.data);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      const data = await fetchMemberShares();

      cachedDataRef.current = {
        data,
        timestamp: Date.now(),
      };

      setGlobalStats(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch member shares", err);
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && isInitialLoad) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-6 sm:mb-8 text-black text-center drop-shadow">
          {t("admin.groupSharesInterest")}
        </h2>
        <div className="bg-gradient-to-br from-gold-50 via-blue-50 to-purple-50 rounded-xl shadow-lg border border-gray-200 p-4 sm:p-8">
          <SharesTableSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-6 sm:mb-8 text-black text-center drop-shadow">
          {t("admin.groupSharesInterest")}
        </h2>
        <div className="bg-gradient-to-br from-gold-50 via-blue-50 to-purple-50 rounded-xl shadow-lg border border-gray-200 p-4 sm:p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              {t("admin.failedToLoadData")}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6 text-center max-w-md px-4">
              {error}
            </p>
            <button
              onClick={fetchData}
              className="px-4 sm:px-6 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors text-sm sm:text-base"
            >
              {t("admin.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!globalStats || globalStats.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold mb-6 sm:mb-8 text-black text-center drop-shadow">
          {t("admin.groupSharesInterest")}
        </h2>
        <div className="bg-gradient-to-br from-gold-50 via-blue-50 to-purple-50 rounded-xl shadow-lg border border-gray-200 p-4 sm:p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-600 text-center text-sm sm:text-base">
              {t("admin.noMembersSharesData")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalSavings = globalStats.reduce(
    (sum, member) => sum + member.totalContribution,
    0
  );
  const totalInterest = globalStats.reduce(
    (sum, member) => sum + member.interestEarned,
    0
  );

  const totalPages = Math.ceil(globalStats.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMembers = globalStats.slice(startIndex, endIndex);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-700 text-center drop-shadow">
        {t("admin.groupSharesInterest")}
      </h2>
      <div className="bg-gradient-to-br from-gold-50 via-blue-50 to-purple-50 rounded-xl shadow-lg border border-gray-200 p-4 sm:p-8">
        {/* Stats Section - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("admin.totalMemberSavings")}
            </p>
            <div className="text-xl sm:text-2xl font-bold text-gold-700">
              €{totalSavings.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("admin.totalInterestDistributed")}
            </p>
            <div className="text-xl sm:text-2xl font-bold text-gold-700">
              €
              {totalInterest.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-lg sm:text-xl font-semibold mb-4 text-gold-700">
            {t("admin.memberShares")} ({globalStats.length}{" "}
            {t("admin.members")})
          </h4>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {currentMembers.map((member: MemberShare) => (
              <div
                key={member.id}
                className="bg-white rounded-lg p-4 shadow border border-gray-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h5 className="font-semibold text-gray-900 text-sm">
                      {member.name}
                    </h5>
                    <p className="text-xs text-gray-600 capitalize mt-0.5">
                      {member.branch}
                    </p>
                  </div>
                  <span className="text-xs font-medium bg-gold-100 text-gold-700 px-2 py-1 rounded">
                    {member.sharePercentage.toFixed(2)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-600 mb-1">{t("admin.shares")}</p>
                    <p className="font-semibold text-gray-900">
                      €{member.totalContribution.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {t("admin.interest")}
                    </p>
                    <p className="font-bold text-gold-700">
                      €
                      {member.interestEarned.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600 mb-1 flex items-center gap-1">
                      <PiggyBank className="w-3 h-3" />
                      {t("admin.futureInterest")}
                    </p>
                    <p className="font-bold text-gold-700">
                      €
                      {member.interestToBeEarned.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-100 bg-white shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t("admin.member")}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t("admin.branchMembers")}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t("admin.shares")}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    {t("admin.percent")}
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      {t("admin.interest")}
                      <TrendingUp className="w-4 h-4 text-gold-600" />
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      {t("admin.futureInterest")}
                      <PiggyBank className="w-4 h-4 text-gold-600" />
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
                    <td className="py-3 px-4 text-gold-700 font-bold">
                      €
                      {member.interestEarned.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-gold-700 font-bold">
                      €
                      {member.interestToBeEarned.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - Responsive */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 mt-6">
              <span className="text-xs sm:text-sm text-gray-600">
                {t("admin.paginationPage")} {currentPage} {t("admin.paginationOf")} {totalPages}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t("admin.paginationPrevious")}</span>
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-white bg-gold-700 rounded-lg hover:bg-gold-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">{t("admin.paginationNext")}</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 sm:ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupShares;

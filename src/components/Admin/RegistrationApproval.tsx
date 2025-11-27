import React, { useEffect, useState } from "react";
import { fetchUsers, updateUser } from "../../utils/api";
import { User } from "../../types";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const RegistrationSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-3 bg-gray-50 rounded-lg animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-48 bg-emerald-200 rounded"></div>
            <div className="h-3 w-32 bg-emerald-200 rounded"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-emerald-200 rounded"></div>
            <div className="h-8 w-20 bg-emerald-200 rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const ITEMS_PER_PAGE = 6;

const RegistrationApproval: React.FC = () => {
  const { t } = useLanguage();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [processing, setProcessing] = useState<{
    userId: string | null;
    action: "approve" | "reject" | null;
  }>({ userId: null, action: null });
  const [fadingOutUserId, setFadingOutUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const allUsers: User[] = await fetchUsers();
      setPendingUsers(allUsers.filter((u) => u.status === "pending" && u._id));
      setApprovedUsers(
        allUsers.filter((u) => u.status === "approved" && u._id)
      );
      setRejectedUsers(
        allUsers.filter((u) => u.status === "rejected" && u._id)
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load users.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleApprove = async (userId: string) => {
    setProcessing({ userId, action: "approve" });
    setError(null);
    try {
      await updateUser({ id: userId, status: "approved" });
      setFadingOutUserId(userId);
      setTimeout(() => {
        const user = pendingUsers.find((u) => u._id === userId);
        if (user) {
          setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
          setApprovedUsers((prev) => [
            ...prev,
            { ...user, status: "approved" },
          ]);
        }
        setProcessing({ userId: null, action: null });
        setFadingOutUserId(null);
      }, 300);
    } catch (err: unknown) {
      setProcessing({ userId: null, action: null });
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to approve user.");
      }
    }
  };

  const handleReject = async (userId: string) => {
    setProcessing({ userId, action: "reject" });
    setError(null);
    try {
      await updateUser({ id: userId, status: "rejected" });
      setFadingOutUserId(userId);
      setTimeout(() => {
        const user = pendingUsers.find((u) => u._id === userId);
        if (user) {
          setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
          setRejectedUsers((prev) => [
            ...prev,
            { ...user, status: "rejected" },
          ]);
        }
        setProcessing({ userId: null, action: null });
        setFadingOutUserId(null);
      }, 300);
    } catch (err: unknown) {
      setProcessing({ userId: null, action: null });
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to reject user.");
      }
    }
  };

  let usersToShow: User[] = [];
  let tabTitle = "";
  if (activeTab === "pending") {
    usersToShow = pendingUsers;
    tabTitle = t("admin.pendingUserRegistrations");
  } else if (activeTab === "approved") {
    usersToShow = approvedUsers;
    tabTitle = t("admin.approvedUsers");
  } else {
    usersToShow = rejectedUsers;
    tabTitle = t("admin.rejectedUsers");
  }

  // Pagination calculations
  const totalPages = Math.ceil(usersToShow.length / ITEMS_PER_PAGE);
  const paginatedUsers = usersToShow.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          {tabTitle}
        </h3>
        <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm flex-1 sm:flex-none ${
              activeTab === "pending"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            {t("admin.pending")}
          </button>
          <button
            className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm flex-1 sm:flex-none ${
              activeTab === "approved"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setActiveTab("approved")}
          >
            {t("admin.approved")}
          </button>
          <button
            className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm flex-1 sm:flex-none ${
              activeTab === "rejected"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setActiveTab("rejected")}
          >
            {t("admin.rejected")}
          </button>
        </div>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? (
        <RegistrationSkeleton />
      ) : usersToShow.length === 0 ? (
        <p className="text-gray-500">
          {activeTab === "pending"
            ? t("admin.noPendingApprovals")
            : activeTab === "approved"
            ? t("admin.noApprovedUsers")
            : t("admin.noRejectedUsers")}
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedUsers.map((user) => (
              <div
                key={user._id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg transition-all duration-300 gap-2 sm:gap-0 ${
                  fadingOutUserId === user._id
                    ? "opacity-0 scale-95"
                    : "opacity-100 scale-100"
                }`}
              >
                <div className="w-full sm:w-auto">
                  <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
                {activeTab === "pending" && (
                  <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
                    <button
                      className="flex-1 sm:flex-none px-2 sm:px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs sm:text-sm"
                      onClick={() => handleApprove(user._id!)}
                      disabled={processing.userId === user._id}
                    >
                      {processing.userId === user._id &&
                      processing.action === "approve" ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          <span className="hidden sm:inline">
                            {t("admin.approving")}
                          </span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        t("admin.approve")
                      )}
                    </button>
                    <button
                      className="flex-1 sm:flex-none px-2 sm:px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 text-xs sm:text-sm"
                      onClick={() => handleReject(user._id!)}
                      disabled={processing.userId === user._id}
                    >
                      {processing.userId === user._id &&
                      processing.action === "reject" ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          <span className="hidden sm:inline">
                            {t("admin.rejecting")}
                          </span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        t("admin.reject")
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4 mt-4 sm:mt-6">
              <span className="text-xs sm:text-sm text-gray-600">
                {t("admin.paginationPage")} {currentPage}{" "}
                {t("admin.paginationOf")} {totalPages}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="flex items-center px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">
                    {t("admin.paginationPrevious")}
                  </span>
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="flex items-center px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">
                    {t("admin.paginationNext")}
                  </span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 sm:ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RegistrationApproval;

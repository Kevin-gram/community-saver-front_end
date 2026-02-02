import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { User } from "../../types";
import { getGroupTheme } from "../../utils/calculations";
import UserForm from "./UserForm";
import ConfirmDialog from "../Common/ConfirmDialog";
import MemberDetails from "../BranchLead/MemberDetails";
import { deleteUser, fetchUsers, fetchPenalties } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";

const ITEMS_PER_PAGE = 5; // Set to display 5 users per page

const UserManagement: React.FC = () => {
  const { t } = useLanguage();
  const { state, dispatch } = useApp();
  // Only show users whose status is "approved" and role is "member" or "branch_lead"
  const users = state.users.filter(
    (user) =>
      user.role !== "admin" &&
      (user.role === "member" || user.role === "branch_lead") &&
      user.status === "approved"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [userPendingPenalties, setUserPendingPenalties] = useState<
    Record<string, boolean>
  >({});
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const loadUsers = async () => {
      try {
        // Fetch users from backend
        const usersFromBackend = await fetchUsers();
        // Map branch to group for frontend
        const mappedUsers = usersFromBackend.map((user: User) => ({
          ...user,
          id: user.id || user._id, // Ensure every user has an id property
          group: user.branch,
        }));
        dispatch({ type: "LOAD_USERS", payload: mappedUsers });
      } catch (err) {
        console.error("Failed to fetch users from backend", err);
      }
    };
    loadUsers();
  }, [token, navigate, dispatch]);

  useEffect(() => {
    const loadPenalties = async () => {
      try {
        const response = await fetchPenalties();
        const penalties =
          response.data?.penalties || response.penalties || response;

        // Create a map of userId -> hasPendingPenalties (only count pending penalties)
        const penaltyMap: Record<string, boolean> = {};
        penalties.forEach((penalty: any) => {
          // Only count pending penalties
          if (penalty.status === "pending") {
            const userId =
              penalty.member?.id ||
              penalty.member?._id ||
              penalty.userId ||
              penalty.user;
            if (userId) {
              penaltyMap[userId] = true;
            }
          }
        });
        setUserPendingPenalties(penaltyMap);
      } catch (err) {
        console.error("Failed to fetch penalties", err);
      }
    };
    loadPenalties();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.firstName &&
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = !filterRole || user.role === filterRole;
    const matchesGroup = !filterGroup || user.branch === filterGroup;

    return matchesSearch && matchesRole && matchesGroup;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, filterGroup]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = (user: User) => {
    const hasPendingPenalties = userPendingPenalties[user.id];

    // Check if user has contributions or pending penalties
    if ((user.totalContributions || 0) > 0 || hasPendingPenalties) {
      // Don't allow deletion if user has contributions or pending penalties
      return;
    }
    setDeletingUser(user);
  };

  const confirmDelete = async () => {
    if (deletingUser && !isConfirming) {
      setIsConfirming(true);
      try {
        await deleteUser(deletingUser.id);
        dispatch({ type: "DELETE_USER", payload: deletingUser.id });
      } catch (error) {
        console.error("Failed to delete user in backend", error);
      } finally {
        setIsConfirming(false);
        setDeletingUser(null);
      }
    }
  };

  const handleAddMoney = async (user: User) => {
    try {
      setLoadingUserId(user.id);
      setSelectedMemberId(user.id);
      setShowMemberDetails(true);
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleFormClose = () => {
    setShowUserForm(false);
    setEditingUser(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "branch_lead":
        return "bg-gold-100 text-gold-800";
      case "member":
        return "bg-gold-100 text-gold-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "admin":
        return t("userManagement.administrator");
      case "branch_lead":
        return t("userManagement.branchLead");
      case "member":
        return t("userManagement.member");
      default:
        return role;
    }
  };

  // Adding this helper function to ensure unique IDs
  const getUserUniqueId = (user: User): string => {
    return user.id || user._id || `user-${user.email}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t("userManagement.title")}
          </h2>
        </div>
        <button
          onClick={() => setShowUserForm(true)}
          className="inline-flex items-center px-4 py-2 bg-gold-700 text-white rounded-lg hover:text-gold-700 hover:bg-white hover:border border-gold-600 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("userManagement.addUser")}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t("userManagement.searchUsers")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          >
            <option value="">{t("userManagement.allRoles")}</option>
            <option value="admin">{t("userManagement.administrator")}</option>
            <option value="branch_lead">{t("userManagement.branchLead")}</option>
            <option value="member">{t("userManagement.member")}</option>
          </select>

          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          >
            <option value="">{t("userManagement.allGroups")}</option>
            <option value="blue">{t("userManagement.blueGroup")}</option>
            <option value="yellow">{t("userManagement.yellowGroup")}</option>
            <option value="red">{t("userManagement.redGroup")}</option>
            <option value="purple">{t("userManagement.purpleGroup")}</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("userManagement.tableUser")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("userManagement.tableRole")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("userManagement.tableGroup")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("userManagement.tableSavings")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("userManagement.tablePenalties")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("userManagement.tableStatus")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("userManagement.tableActions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => {
                const theme = getGroupTheme(
                  (user.branch || "blue").toLowerCase()
                );
                const uniqueId = getUserUniqueId(user);
                const hasPendingPenalties = userPendingPenalties[user.id];

                return (
                  <tr key={uniqueId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                        {user.branch && (
                          <div className="text-xs text-gray-400">
                            {user.branch}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs text-gold-700 font-semibold rounded-full ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {getRoleDisplay(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-2 ${theme.primary}`}
                        />
                        <span className="text-sm text-gray-900 capitalize">
                          {user.branch}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof user.totalContributions === "number"
                        ? user.totalContributions.toLocaleString()
                        : "0"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          hasPendingPenalties
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {hasPendingPenalties ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.activeLoan?.status
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gold-100 text-gold-800"
                        }`}
                      >
                        {user.activeLoan?.status ? "Has Loan" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-gold-600 hover:text-gold-900 p-1"
                          title={t("userManagement.editUser")}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={
                            (user.totalContributions || 0) > 0 ||
                            hasPendingPenalties
                          }
                          className={`p-1 ${
                            (user.totalContributions || 0) > 0 ||
                            hasPendingPenalties
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-red-600 hover:text-red-900"
                          }`}
                          title={
                            (user.totalContributions || 0) > 0
                              ? t("userManagement.cannotDeleteWithContributions")
                              : hasPendingPenalties
                              ? t("userManagement.cannotDeleteWithPenalties")
                              : t("userManagement.deleteUser")
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAddMoney(user)}
                          className="text-gold-600 hover:text-gold-900 p-1"
                          title={t("userManagement.addMoney")}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-4 p-4 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t("userManagement.previous")}
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              className="flex items-center px-4 py-2 text-sm text-white bg-gold-700 rounded-lg hover:bg-gold-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t("userManagement.next")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingUser && (
        <ConfirmDialog
          title={t("userManagement.confirmDeleteTitle")}
          message={
            (deletingUser.totalContributions || 0) > 0
              ? t("userManagement.cannotDeleteMessage")
                  .replace("{name}", deletingUser.firstName)
                  .replace(
                    "${amount}",
                    (deletingUser.totalContributions || 0).toLocaleString()
                  )
              : userPendingPenalties[deletingUser.id]
              ? t("userManagement.cannotDeletePenaltiesMessage").replace(
                  "{name}",
                  deletingUser.firstName
                )
              : t("userManagement.confirmDeleteMessage").replace(
                  "{name}",
                  deletingUser.firstName
                )
          }
          confirmText={
            (deletingUser.totalContributions || 0) > 0 ||
            userPendingPenalties[deletingUser.id]
              ? t("userManagement.okText")
              : isConfirming
              ? t("userManagement.deletingText")
              : t("userManagement.deleteConfirmText")
          }
          confirmVariant={
            (deletingUser.totalContributions || 0) > 0 ||
            userPendingPenalties[deletingUser.id]
              ? "primary"
              : "danger"
          }
          onConfirm={
            (deletingUser.totalContributions || 0) > 0 ||
            userPendingPenalties[deletingUser.id]
              ? () => setDeletingUser(null)
              : confirmDelete
          }
          onCancel={() => !isConfirming && setDeletingUser(null)}
          isDisabled={isConfirming}
        />
      )}

      {showUserForm && (
        <UserForm user={editingUser} onClose={handleFormClose} />
      )}
      {deletingUser && (
        <ConfirmDialog
          title={t("userManagement.confirmDeleteTitle")}
          message={
            (deletingUser.totalContributions || 0) > 0
              ? t("userManagement.cannotDeleteMessage")
                  .replace("{name}", deletingUser.firstName)
                  .replace(
                    "${amount}",
                    (deletingUser.totalContributions || 0).toLocaleString()
                  )
              : userPendingPenalties[deletingUser.id]
              ? t("userManagement.cannotDeletePenaltiesMessage").replace(
                  "{name}",
                  deletingUser.firstName
                )
              : t("userManagement.confirmDeleteMessage").replace(
                  "{name}",
                  deletingUser.firstName
                )
          }
          confirmText={
            (deletingUser.totalContributions || 0) > 0 ||
            userPendingPenalties[deletingUser.id]
              ? t("userManagement.okText")
              : isConfirming
              ? t("userManagement.deletingText")
              : t("userManagement.deleteConfirmText")
          }
          confirmVariant={
            (deletingUser.totalContributions || 0) > 0 ||
            userPendingPenalties[deletingUser.id]
              ? "primary"
              : "danger"
          }
          onConfirm={
            (deletingUser.totalContributions || 0) > 0 ||
            userPendingPenalties[deletingUser.id]
              ? () => setDeletingUser(null)
              : confirmDelete
          }
          onCancel={() => !isConfirming && setDeletingUser(null)}
          isDisabled={isConfirming}
        />
      )}

      {showMemberDetails && selectedMemberId && (
        <MemberDetails
          memberId={selectedMemberId}
          canEdit={true}
          onClose={() => setShowMemberDetails(false)}
        />
      )}
    </div>
  );
};

export default UserManagement;
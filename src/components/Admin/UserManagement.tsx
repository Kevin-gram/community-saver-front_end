import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Filter, Loader2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { User } from "../../types";
import { getGroupTheme } from "../../utils/calculations";
import UserForm from "./UserForm";
import ConfirmDialog from "../Common/ConfirmDialog";
import MemberDetails from "../BranchLead/MemberDetails";
import { deleteUser, fetchUsers } from "../../utils/api";
import { useNavigate } from "react-router-dom";

const UserManagement: React.FC = () => {
  const { state, dispatch } = useApp();
  const users = state.users.filter((user) => user.role !== "admin");
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

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleDeleteUser = (user: User) => {
   
    // Check if user has contributions
    if ((user.totalContributions || 0) > 0) {
      // Don't allow deletion if user has contributions
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
        return "bg-emerald-100 text-emarald-800";
      case "member":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "branch_lead":
        return "Branch Lead";
      case "member":
        return "Member";
      default:
        return role;
    }
  };

  // Add this helper function to ensure unique IDs
  const getUserUniqueId = (user: User): string => {
    return user.id || user._id || `user-${user.email}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            User Management
          </h2>
          <p className="text-sm text-gray-600">
            Manage system users and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowUserForm(true)}
          className="inline-flex items-center px-4 py-2 bg-emerald-700 text-white rounded-lg hover:text-emerald-700 hover:bg-white hover:border border-emerald-600 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="branch_lead">Branch Lead</option>
            <option value="member">Member</option>
          </select>

          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Groups</option>
            <option value="blue">blue Group</option>
            <option value="yellow">Yellow Group</option>
            <option value="red">Red Group</option>
            <option value="purple">Purple Group</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Savings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const theme = getGroupTheme(
                  (user.branch || "blue").toLowerCase()
                );
                const uniqueId = getUserUniqueId(user);

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
                        className={`inline-flex px-2 py-1 text-xs text-emerald-700 font-semibold rounded-full ${getRoleBadgeColor(
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
                          user.activeLoan?.status
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {user.activeLoan?.status ? "Has Loan" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-emerald-600 hover:text-emerald-900 p-1"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={(user.totalContributions || 0) > 0}
                          className={`p-1 ${
                            (user.totalContributions || 0) > 0
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-red-600 hover:text-red-900"
                          }`}
                          title={
                            (user.totalContributions || 0) > 0
                              ? "Cannot delete user with contributions"
                              : "Delete user"
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAddMoney(user)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Add Money"
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

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              No users found matching your criteria
            </p>
          </div>
        )}
      </div>

      {showUserForm && (
        <UserForm user={editingUser} onClose={handleFormClose} />
      )}

      {deletingUser && (
        <ConfirmDialog
          title="Delete User"
          message={
            (deletingUser.totalContributions || 0) > 0
              ? `Cannot delete ${
                  deletingUser.firstName
                } because they have contributions of $${(
                  deletingUser.totalContributions || 0
                ).toLocaleString()}. Users with contributions cannot be deleted.`
              : `Are you sure you want to delete ${deletingUser.firstName}? This action cannot be undone.`
          }
          confirmText={
            (deletingUser.totalContributions || 0) > 0 
              ? "OK" 
              : isConfirming 
                ? "Deleting..." 
                : "Delete"
          }
          confirmVariant={
            (deletingUser.totalContributions || 0) > 0 ? "primary" : "danger"
          }
          onConfirm={
            (deletingUser.totalContributions || 0) > 0
              ? () => setDeletingUser(null)
              : confirmDelete
          }
          onCancel={() => !isConfirming && setDeletingUser(null)}
          disabled={isConfirming}
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

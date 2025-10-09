import React, { useEffect, useState } from "react";
import { fetchUsers, updateUser } from "../../utils/api";
import { User } from "../../types";

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

const RegistrationApproval: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const allUsers: User[] = await fetchUsers();
      setPendingUsers(allUsers.filter(u => u.status === "pending" && u._id));
      setApprovedUsers(allUsers.filter(u => u.status === "approved" && u._id));
      setRejectedUsers(allUsers.filter(u => u.status === "rejected" && u._id));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to reject user.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      await updateUser({ id: userId, status: "approved" });
      loadUsers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to reject user.");
      }
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await updateUser({ id: userId, status: "rejected" });
      loadUsers();
    } catch (err: unknown) {
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
    tabTitle = "Pending User Registrations";
  } else if (activeTab === "approved") {
    usersToShow = approvedUsers;
    tabTitle = "Approved Users";
  } else {
    usersToShow = rejectedUsers;
    tabTitle = "Rejected Users";
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {tabTitle}
        </h3>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded ${activeTab === "pending" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending
          </button>
          <button
            className={`px-3 py-1 rounded ${activeTab === "approved" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setActiveTab("approved")}
          >
            Approved
          </button>
          <button
            className={`px-3 py-1 rounded ${activeTab === "rejected" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setActiveTab("rejected")}
          >
            Rejected
          </button>
        </div>
      </div>
      {error && (
        <div className="text-red-600 mb-2">{error}</div>
      )}
      {loading ? (
        <RegistrationSkeleton />
      ) : usersToShow.length === 0 ? (
        <p className="text-gray-500">
          {activeTab === "pending"
            ? "No users pending approval."
            : activeTab === "approved"
            ? "No approved users."
            : "No rejected users."}
        </p>
      ) : (
        <div className="space-y-4">
          {usersToShow.map((user) => (
            <div
              key={user._id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              {activeTab === "pending" && (
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    onClick={() => handleApprove(user._id!)}
                  >
                    Approve
                  </button>
                  <button
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => handleReject(user._id!)}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegistrationApproval;

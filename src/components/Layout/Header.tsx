import React, { useState } from "react";
import { LogOut, User as UserIcon, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getGroupTheme } from "../../utils/calculations";

const Header: React.FC = () => {
  const { state, dispatch } = useApp();
  const { currentUser } = state;
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (!currentUser) return null;

  const theme = getGroupTheme("green-200");

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    setShowLogoutModal(false);
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

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-full ${theme.primary} flex items-center justify-center bg-emerald-700`}
              >
                <UserIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-emerald-700">
                  Financial Management
                </h1>
                <p className="text-sm text-gray-500">
                  {getRoleDisplay(currentUser.role)} Portal
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {currentUser
                    ? `${currentUser.firstName} ${currentUser.lastName}`
                    : ""}
                </p>
                {(currentUser.role === "member" ||
                  currentUser.role === "branch_lead") && (
                  <p className="text-xs uppercase font-medium text-emerald-700">
                    {currentUser.branch} Group
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="p-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Logout
              </h3>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
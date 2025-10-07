import React from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getGroupTheme } from "../../utils/calculations";

const Header: React.FC = () => {
  const { state, dispatch } = useApp();
  const { currentUser } = state;

  if (!currentUser) return null;

  const theme = getGroupTheme("green-200");

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 rounded-full ${theme.primary} flex items-center justify-center bg-emerald-700 `}
            >
              <UserIcon className="w-4 h-4 text-white " />
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
                <p className={`text-xs uppercase font-medium ${theme.text}`}>
                  {currentUser.branch} Group
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

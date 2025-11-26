import React, { useState } from "react";
import { LogOut, User, X, Globe } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useLanguage } from "../../context/LanguageContext";
import { getGroupTheme } from "../../utils/calculations";

const Header: React.FC = () => {
  const { state, dispatch } = useApp();
  const { currentUser } = state;
  const { language, setLanguage, t } = useLanguage();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  if (!currentUser) return null;

  const theme = getGroupTheme("green-200");

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    setShowLogoutModal(false);
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "admin":
        return t("header.adminPortal");
      case "branch_lead":
        return t("header.branchLeadPortal");
      case "member":
        return t("header.memberPortal");
      default:
        return role;
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4 gap-2 sm:gap-4">
            {/* Left Section - Logo & Title */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${theme.primary} flex items-center justify-center bg-emerald-700 flex-shrink-0`}
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-emerald-700 truncate">
                  {t("header.title")}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {getRoleDisplay(currentUser.role)}
                </p>
              </div>
            </div>

            {/* Right Section - Language Selector, User Info & Logout */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="p-1.5 sm:p-2 text-gray-600 hover:text-emerald-700 transition-colors flex items-center space-x-1"
                  title={t("header.changeLanguage")}
                >
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm font-medium uppercase">
                    {language}
                  </span>
                </button>

                {/* Language Dropdown */}
                {showLanguageMenu && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    {["en", "fr", "de"].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang as "en" | "fr" | "de");
                          setShowLanguageMenu(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          language === lang
                            ? "bg-emerald-100 text-emerald-700 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {lang === "en"
                          ? "English"
                          : lang === "fr"
                          ? "Français"
                          : "Deutsch"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop: Show full name */}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[150px] lg:max-w-none">
                  {currentUser
                    ? `${currentUser.firstName} ${currentUser.lastName}`
                    : ""}
                </p>
                {(currentUser.role === "member" ||
                  currentUser.role === "branch_lead") && (
                  <p className="text-xs uppercase font-medium text-emerald-700 truncate">
                    {currentUser.branch} {t("header.group")}
                  </p>
                )}
              </div>

              {/* Mobile: Show initials instead of full name */}
              <div className="text-right sm:hidden">
                <p className="text-xs font-medium text-gray-900">
                  {currentUser
                    ? `${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`
                    : ""}
                </p>
                {(currentUser.role === "member" ||
                  currentUser.role === "branch_lead") && (
                  <p className="text-[10px] uppercase font-medium text-emerald-700">
                    {currentUser.branch}
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowLogoutModal(true)}
                className="p-1.5 sm:p-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors flex-shrink-0"
                title={t("header.logout")}
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                {t("header.confirmLogout")}
              </h3>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-sm sm:text-base text-gray-600">
                {t("header.logoutMessage")}
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t("header.cancel")}
              </button>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
              >
                {t("header.logout")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
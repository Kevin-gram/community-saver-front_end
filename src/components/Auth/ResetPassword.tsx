import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // ✅ FIXED: Get BOTH token and email from URL
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";  // ← ADDED THIS!
  
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Log for debugging
  React.useEffect(() => {
    
    if (!token || !email) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!token) {
      setError("Invalid or missing token.");
      return;
    }
    
    if (!email) {
      setError("Invalid or missing email.");
      return;
    }
    
    if (!password || password.length < 6) {  // Changed to 6 to match backend
      setError("Password must be at least 6 characters.");
      return;
    }
    
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      
      // ✅ FIXED: Include email in the request
      const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        email,           // ← ADDED THIS!
        newPassword: password,
      });
      

      
      setSuccess("Password reset successful! You can now log in.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      console.error("❌ Password reset error:", err);
      setError(
        err?.response?.data?.message ||
        "Failed to reset password. Please try again or request a new link."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            Reset Your Password
          </h2>
          <p className="text-gray-600 mb-4">
            Enter your new password below.
          </p>
          {/* Debug info - remove in production */}
        </div>
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="New password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 pr-10"
                disabled={isLoading || !token || !email}
                minLength={6}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-2"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword
                  ? <EyeOff size={18} color="#6B7280" />
                  : <Eye size={18} color="#6B7280" />
                }
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                required
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 pr-10"
                disabled={isLoading || !token || !email}
                minLength={6}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-2"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm
                  ? <EyeOff size={18} color="#6B7280" />
                  : <Eye size={18} color="#6B7280" />
                }
              </button>
            </div>
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}
          
          {success && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-3">
              {success}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !token || !email}
            className="w-full py-2 px-4 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-all font-medium flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>
        
        <div className="text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-emerald-700 hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
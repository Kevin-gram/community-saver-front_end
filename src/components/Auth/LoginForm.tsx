import React, { useState } from "react";
import { LogIn, Eye, EyeOff, MailCheck, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import RegisterForm from "./RegisterForm";
import { loginUser, forgotPassword } from "../../utils/api";

const LoginForm: React.FC = () => {
  const { dispatch } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [forgotError, setForgotError] = useState("");

  if (showRegister) {
    return <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await loginUser({ email, password });
      
      if (data && data.data && data.data.token) {
        localStorage.setItem("token", data.data.token);
      } else {
        console.warn("No token found in login response");
      }
      const user = data?.data?.user;
      if (user) {
        dispatch({ type: "LOGIN", payload: user });
      } else {
        setError(data?.message || "Invalid email or password");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to connect to backend");
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = () => {
    // Use dynamic API URL from environment variable
    const API_URL = import.meta.env.VITE_API_URL;
    if (!API_URL) {
      console.error("VITE_API_URL environment variable is not set");
      setError("Configuration error. Please contact support.");
      return;
    }

    // Get the current frontend URL (where the user is right now)
    const currentUrl = window.location.origin;
    
    // Pass it as returnUrl so backend knows where to redirect
    const googleAuthUrl = `${API_URL}/api/auth/google?returnUrl=${encodeURIComponent(currentUrl)}`;
    window.location.href = googleAuthUrl;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus("sending");
    setForgotError("");
    try {
      await forgotPassword(forgotEmail);
      setForgotStatus("sent");
    } catch {
      setForgotStatus("error");
      setForgotError("Failed to send reset email. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-400 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="text-center">
          <div className="bg-emerald-700 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-700">Welcome Back</h2>
          <p className="mt-2 text-gray-600">Sign in to your financial portal</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  className="text-xs text-emerald-700 hover:underline focus:outline-none"
                  onClick={() => setShowForgot(true)}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 mr-2" />
              Sign in with Google
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-emerald-700 underline"
            onClick={() => setShowRegister(true)}
          >
            Don't have an account? Register
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setShowForgot(false);
                setForgotStatus("idle");
                setForgotEmail("");
                setForgotError("");
              }}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center mb-4">
              <MailCheck className="w-10 h-10 text-emerald-700 mb-2" />
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Reset your password</h3>
              <p className="text-sm text-gray-500 text-center">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                disabled={forgotStatus === "sending" || forgotStatus === "sent"}
              />
              {forgotError && (
                <div className="text-sm text-red-600">{forgotError}</div>
              )}
              {forgotStatus === "sent" ? (
                <div className="text-sm text-emerald-700 text-center">
                  Password reset link sent! Please check your email.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={forgotStatus === "sending"}
                  className="w-full py-2 px-4 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-all font-medium flex justify-center items-center disabled:opacity-50"
                >
                  {forgotStatus === "sending" ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
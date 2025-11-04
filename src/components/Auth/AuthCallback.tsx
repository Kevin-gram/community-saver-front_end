import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useApp } from "../../context/AppContext";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dispatch } = useApp();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      // Get token and error from URL parameters
      const token = searchParams.get("token");
      const errorParam = searchParams.get("error");

      // Handle error from backend
      if (errorParam) {
        setError("Google authentication failed. Please try again.");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
        return;
      }

      // Handle missing token
      if (!token) {
        setError("Authentication failed. No token received.");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
        return;
      }

      try {
        // Store token in localStorage FIRST
        localStorage.setItem("token", token);

        // Get API URL from environment variable
        const API_URL = import.meta.env.VITE_API_URL;

        // Fetch user data with the token
        const response = await fetch(`${API_URL}/api/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();

        // Update app context with user data
        if (data.status === "success" && data.data && data.data.user) {
          const user = data.data.user;
          dispatch({ type: "LOGIN", payload: user });

          // Navigate based on user role
          switch (user.role) {
            case "admin":
              navigate("/admin");
              break;
            case "branch_lead":
              navigate("/branch_lead");
              break;
            case "member":
              navigate("/member");
              break;
            default:
              navigate("/login");
          }
        } else {
          throw new Error("Invalid user data received");
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError("Failed to complete authentication. Please try again.");
        localStorage.removeItem("token");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, dispatch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-700 via-emerald-500 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="text-center">
          {error ? (
            <>
              <div className="bg-red-100 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">
                Authentication Failed
              </h2>
              <p className="text-gray-600">{error}</p>
              <p className="text-sm text-gray-500 mt-2">
                Redirecting to login page...
              </p>
            </>
          ) : (
            <>
              <div className="bg-emerald-700 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">
                Completing Sign In
              </h2>
              <p className="text-gray-600">
                Please wait while we authenticate your account...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;

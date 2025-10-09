import React, { useState } from "react";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { useApp } from "../../context/AppContext";
import RegisterForm from "./RegisterForm";
import { loginUser } from "../../utils/api";

const LoginForm: React.FC = () => {
  const { dispatch } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

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

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="bg-emerald-800 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4">
=======
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 from-50% via-white via-80% to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-[rgba(0,_0,_0,_0.25)_0px_25px_50px_-12px]">
        <div className="text-center">
          <div className="bg-emerald-700 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4">
>>>>>>> b84e3c10cad8558e88ea7cc9459886eb053d1dd4
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-700">Welcome Back</h2>
          <p className="mt-2 text-gray-600">Sign in to your financial portal</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
<<<<<<< HEAD
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
=======
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
>>>>>>> b84e3c10cad8558e88ea7cc9459886eb053d1dd4
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
<<<<<<< HEAD
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm transition-colors"
=======
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium text-gray-700 placeholder-gray-400 shadow-[rgba(0,_0,_0,_0.15)_0px_2px_8px] hover:shadow-[rgba(0,_0,_0,_0.25)_0px_8px_15px_-5px] transition-shadow"
>>>>>>> b84e3c10cad8558e88ea7cc9459886eb053d1dd4
                placeholder="Enter your email"
              />
            </div>

            <div>
<<<<<<< HEAD
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1 relative">
=======
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
>>>>>>> b84e3c10cad8558e88ea7cc9459886eb053d1dd4
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
<<<<<<< HEAD
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm transition-colors"
=======
                  className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium text-gray-700 placeholder-gray-400 shadow-[rgba(0,_0,_0,_0.15)_0px_2px_8px] hover:shadow-[rgba(0,_0,_0,_0.25)_0px_8px_15px_-5px] transition-shadow"
>>>>>>> b84e3c10cad8558e88ea7cc9459886eb053d1dd4
                  placeholder="Enter your password"
                />
                <button
                  type="button"
<<<<<<< HEAD
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
=======
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-20"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
>>>>>>> b84e3c10cad8558e88ea7cc9459886eb053d1dd4
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

<<<<<<< HEAD
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-700 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <div className="mt-8"></div>

        <div className="mt-6 text-center">
=======
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-700 text-white py-2 rounded-lg hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center shadow-[rgba(0,_0,_0,_0.15)_0px_2px_8px] hover:shadow-[rgba(0,_0,_0,_0.25)_0px_8px_15px_-5px] transition-all"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="text-center">
>>>>>>> b84e3c10cad8558e88ea7cc9459886eb053d1dd4
          <button
            type="button"
            className="text-emerald-700 underline"
            onClick={() => setShowRegister(true)}
          >
            Don't have an account? Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;


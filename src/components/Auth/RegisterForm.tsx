import React, { useState, useRef, useEffect } from "react";
import { LogIn, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { registerUser } from "../../utils/api";

const RegisterForm: React.FC<{ onSwitchToLogin: () => void }> = ({
  onSwitchToLogin,
}) => {
  const { state, dispatch } = useApp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "branch_lead">(
    "member"
  );
  const [group, setGroup] = useState<"blue" | "yellow" | "red" | "purple">(
    "blue"
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [passwordStrengthError, setPasswordStrengthError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const roleOptions: ("member" | "admin" | "branch_lead")[] = ["member"];
  const groupOptions: ("blue" | "yellow" | "red" | "purple")[] = [
    "blue",
    "yellow",
    "red",
    "purple",
  ];

  const roleRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false);
      }
      if (
        groupRef.current &&
        !groupRef.current.contains(event.target as Node)
      ) {
        setGroupDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordMatchError("Passwords do not match");
    } else {
      setPasswordMatchError("");
    }
  }, [password, confirmPassword]);

  // Password strength validation function
  const isStrongPassword = (pwd: string) => {
    // At least one uppercase, one special char, min 9 chars
    return (
      /[A-Z]/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd) &&
      pwd.length >= 9
    );
  };

  // Show password strength error as user types
  useEffect(() => {
    if (password && !isStrongPassword(password)) {
      setPasswordStrengthError(
        "Password must be at least 9 characters, include one uppercase letter and one special character."
      );
    } else {
      setPasswordStrengthError("");
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsRegistering(true);

    if (state.users.some((u) => u.email === email)) {
      setError("Email already registered");
      setIsRegistering(false);
      return;
    }

    if (passwordMatchError) {
      setError(passwordMatchError);
      setIsRegistering(false);
      return;
    }

    if (!isStrongPassword(password)) {
      setError(
        "Password must be at least 9 characters, include one uppercase letter and one special character."
      );
      setIsRegistering(false);
      return;
    }

    const userData = {
      firstName,
      lastName,
      email,
      password,
      branch: group,
      role,
    };

    try {
      const createdUser = await registerUser(userData);
      dispatch({ type: "ADD_USER", payload: createdUser });
      setSuccess("Registration successful! Redirecting to login...");
      
      // Clear form
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      
      // Delay redirect slightly to show success message
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-white flex items-center justify-center px-4">
      <div className="max-w-4xl w-full space-y-8 bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="text-center">
          <div className="bg-emerald-700 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-700">Welcome</h2>
          <p className="mt-2 text-gray-600">
            Sign up for better financial portal
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
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
                {passwordStrengthError && (
                  <div className="text-xs text-green-800 mt-1">
                    {passwordStrengthError}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    value="Member"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    &nbsp; {/* Empty label to align button with input */}
                  </label>
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full px-3 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 shadow-sm flex items-center justify-center"
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <div className="relative" ref={groupRef}>
                  <button
                    type="button"
                    onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
                    className="w-full px-3 py-2 border rounded-lg flex justify-between items-center focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {group}
                    <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
                  </button>
                  {groupDropdownOpen && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-md">
                      {groupOptions.map((option) => (
                        <li
                          key={option}
                          onClick={() => {
                            setGroup(option);
                            setGroupDropdownOpen(false);
                          }}
                          className="px-4 py-2 cursor-pointer hover:bg-emerald-700 hover:text-white"
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordMatchError && (
                  <div className="text-xs text-red-600 mt-1">
                    {passwordMatchError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          <div className="space-y-2">
            {error && <div className="text-sm text-red-600">{error}</div>}
            {success && <div className="text-sm text-emerald-700">{success}</div>}
          </div>
        </form>

        <button
          onClick={onSwitchToLogin}
          className="w-full mt-2 text-emerald-700 underline"
        >
          Already have an account? Login
        </button>
      </div>
    </div>
  );
};

export default RegisterForm;


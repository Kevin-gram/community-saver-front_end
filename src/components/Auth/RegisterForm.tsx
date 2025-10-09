import React, { useState, useRef, useEffect } from "react";
import { LogIn, ChevronDown, Eye, EyeOff } from "lucide-react";
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

    if (state.users.some((u) => u.email === email)) {
      setError("Email already registered");
      return;
    }

    if (passwordMatchError) {
      setError(passwordMatchError);
      return;
    }

    if (!isStrongPassword(password)) {
      setError(
        "Password must be at least 9 characters, include one uppercase letter and one special character."
      );
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
      setSuccess("Registration successful! You can now log in.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        onSwitchToLogin();
      }, 1000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-emerald-500 via-white to-purple-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="bg-emerald-700 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-700">Welcome</h2>
          <p className="mt-2 text-gray-600">
            Sign up for better financial portal
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            type="text"
            required
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />

          <label className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            type="text"
            required
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />

          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
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
            <div className="text-xs text-green-800 mt-1">{passwordStrengthError}</div>
          )}

          <label className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
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
            <div className="text-red-600">{passwordMatchError}</div>
          )}

          {/* Custom Role Dropdown */}
          <label className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <div className="relative" ref={roleRef}>
            <button
              type="button"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="w-full px-3 py-2 border rounded-lg flex justify-between items-center focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {role}
              <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
            </button>
            {roleDropdownOpen && (
              <ul className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-md">
                {roleOptions.map((option) => (
                  <li
                    key={option}
                    onClick={() => {
                      setRole(option);
                      setRoleDropdownOpen(false);
                    }}
                    className="px-4 py-2 cursor-pointer hover:bg-emerald-700 hover:text-white"
                  >
                    {option}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Custom Group Dropdown */}
          <label className="block text-sm font-medium text-gray-700">
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

          {/* Error/Success */}
          {error && <div className="text-red-600">{error}</div>}
          {success && <div className="text-emerald-700">{success}</div>}

          <button
            type="submit"
            className="w-full bg-emerald-700 text-white py-2 rounded-lg hover:bg-emerald-800"
          >
            Register
          </button>
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

import React, { useEffect } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

interface ToastProps {
  type: "success" | "error" | "info";
  title: string;
  message: string;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getColors = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-gold-50",
          border: "border-gold-200",
          icon: "text-gold-600",
          title: "text-gold-900",
          message: "text-gold-700",
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "text-red-600",
          title: "text-red-900",
          message: "text-red-700",
        };
      case "info":
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "text-blue-600",
          title: "text-blue-900",
          message: "text-blue-700",
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`fixed top-4 right-4 max-w-md w-full ${colors.bg} border ${colors.border} rounded-lg shadow-lg p-4 z-[9999] animate-slide-in`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {type === "success" && (
            <CheckCircle className={`w-5 h-5 ${colors.icon}`} />
          )}
          {type === "error" && (
            <AlertCircle className={`w-5 h-5 ${colors.icon}`} />
          )}
          {type === "info" && (
            <AlertCircle className={`w-5 h-5 ${colors.icon}`} />
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${colors.title}`}>{title}</h3>
          <p className={`mt-1 text-sm ${colors.message}`}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className={`ml-3 flex-shrink-0 ${colors.icon} hover:opacity-75 transition-opacity`}
          aria-label="Close notification"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Toast;

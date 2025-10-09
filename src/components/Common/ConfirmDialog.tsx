import React from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText: string | React.ReactNode;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  isDisabled?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  onConfirm,
  onCancel,
  isDisabled = false,
}) => {
  const getConfirmButtonClass = () => {
    switch (confirmVariant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
      default:
        return "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500";
    }
  };

  const getIconColor = () => {
    switch (confirmVariant) {
      case "danger":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-auto">
        <div className="flex items-center space-x-3 mb-4">
          <div
            className={`p-2 rounded-full ${
              confirmVariant === "danger"
                ? "bg-red-100"
                : "bg-blue-100"
            }`}
          >
            <AlertTriangle className={`w-6 h-6 ${getIconColor()}`} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>

        <p className="text-gray-600 mb-6">{message}</p>

        <div className="flex space-x-2 mt-4">
          <button
            onClick={onCancel}
            disabled={isDisabled}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDisabled}
            className={`flex-1 px-3 py-2 text-sm text-white rounded-lg transition-colors ${
              confirmVariant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;


import React from "react";
import { X, Calendar, DollarSign } from "lucide-react";
import { useApp } from "../../context/AppContext";

interface ContributionHistoryProps {
  onClose: () => void;
}

const ContributionHistory: React.FC<ContributionHistoryProps> = ({
  onClose,
}) => {
  const { state } = useApp();
  const { currentUser, contributions } = state;

  if (!currentUser) return null;

  const userContributions = contributions.filter(
    (c) => c.memberId === currentUser.id
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case "regular":
        return "bg-emerald-100 text-emerald-800";
      case "penalty":
        return "bg-red-100 text-red-800";
      case "interest":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "regular":
        return "Regular";
      case "penalty":
        return "Penalty";
      case "interest":
        return "Interest";
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Contribution History
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {userContributions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No contributions found</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {userContributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-emerald-100 rounded-full p-2">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          ${contribution.amount.toLocaleString()}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                            contribution.type
                          )}`}
                        >
                          {getTypeLabel(contribution.type)}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(contribution.contributionDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Contributions:</span>
              <span className="text-xl font-bold text-gray-900">
                $
                {userContributions
                  .reduce((sum, c) => sum + c.amount, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributionHistory;

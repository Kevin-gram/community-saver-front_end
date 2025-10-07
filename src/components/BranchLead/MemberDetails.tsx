import React, { useState } from "react";
import {
  X,
  User as UserIcon,
  DollarSign,
  Calendar,
  Edit,
  Save,
  Loader2,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { getGroupTheme } from "../../utils/calculations";
import { addContribution } from "../../utils/api";

interface MemberDetailsProps {
  memberId: string;
  canEdit: boolean;
  onClose: () => void;
}

const MemberDetails: React.FC<MemberDetailsProps> = ({
  memberId,
  canEdit,
  onClose,
}) => {
  const { state, dispatch } = useApp();
  const { users, contributions } = state;
  const member = users.find((u) => u.id === memberId || u._id === memberId);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    totalSavings: member?.totalContributions || 0,
    penalties: member?.penalties || 0,
    interestReceived: member?.interestReceived || 0,
  });

  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState(200);
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
  const [addError, setAddError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state

  if (!member) return null;

  const theme = getGroupTheme(member.branch);

  const memberContributions = contributions.filter(
    (c) =>
      (typeof c.memberId === "object" ? c.memberId._id : c.memberId) ===
      memberId
  );

  const getMonthName = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("default", { month: "long" });
  };

  const handleSave = async () => {
    const adjustmentAmount =
      editData.totalSavings - (member.totalContributions || 0);

    if (adjustmentAmount !== 0) {
      const adjustmentContribution: {
        id: string;
        userId: string;
        memberId: string;
        amount: number;
        contributionDate: string;
        month: string;
        type: "adjustment" | "regular" | "penalty" | "interest";
      } = {
        id: `adj-${Date.now()}`,
        userId: member.id,
        memberId: member.id,
        amount: adjustmentAmount,
        contributionDate: new Date().toISOString(),
        month: getMonthName(new Date().toISOString()),
        type: "adjustment",
      };

      try {
        const backendContribution = await addContribution(
          adjustmentContribution
        );
        if (
          backendContribution &&
          (backendContribution.contribution.memberId ||
            backendContribution.contribution.userId)
        ) {
          dispatch({
            type: "ADD_CONTRIBUTION",
            payload: backendContribution.contribution,
          });
        }
        setIsEditing(false);
      } catch (error) {
        console.error("Failed to add adjustment contribution", error);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleAddMoney = async () => {
    if (addAmount <= 0) {
      setAddError("Amount must be greater than 0");
      return;
    }

    setAddError("");
    setIsSubmitting(true);

    try {
      const dateObj = new Date(addDate);
      const penalty = dateObj.getDate() > 10 ? 25 : 0;
      const type = (penalty ? "penalty" : "regular") as
        | "penalty"
        | "regular"
        | "interest";

      const newContribution = {
        id: `contrib-${Date.now()}`,
        userId: member.id,
        memberId: member.id,
        amount: addAmount,
        contributionDate: dateObj.toISOString(),
        month: getMonthName(addDate),
        type,
      };

      // Optimistic update
      const optimisticContribution = {
        ...newContribution,
        _id: newContribution.id,
      };

      dispatch({
        type: "ADD_CONTRIBUTION",
        payload: optimisticContribution,
      });

      const backendContribution = await addContribution(newContribution);

      if (backendContribution?.contribution) {
        // Update with actual backend data
        dispatch({
          type: "UPDATE_CONTRIBUTION",
          payload: backendContribution.contribution,
        });

        // Close modal and reset form
        setShowAddMoney(false);
        setAddAmount(200);
        setAddDate(new Date().toISOString().slice(0, 10));
      }
    } catch (error) {
      console.error("Failed to add contribution:", error);
      // Rollback optimistic update if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      totalSavings: member.totalContributions,
      penalties: member.penalties,
      interestReceived: member.interestReceived,
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center`}
            >
              <UserIcon className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {member.firstName}
              </h2>
              <p className="text-sm text-gray-500">{member.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Member Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group
                </label>
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full mr-2 ${theme.primary}`}
                  />
                  <span className="text-gray-900 capitalize">
                    {member.branch}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <span className="text-gray-900">{member.branch}</span>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Financial Information
              </h3>
              {canEdit && !isEditing && state.currentUser?.role === "admin" && (
                <button
                  onClick={() => {
                    setEditData({
                      totalSavings: member.totalContributions,
                      penalties: member.penalties,
                      interestReceived: member.interestReceived,
                    });
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center px-3 py-1 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-200 hover:text-emerald-700 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </button>
              )}
              {canEdit && !isEditing && (
                <button
                  onClick={() => setShowAddMoney(true)}
                  className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg ml-2 hover:bg-emerald-200 hover:text-emerald-700 transition-colors"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Add Money
                </button>
              )}
              {isEditing && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </button>
                </div>
              )}
              {/* Add Money Modal Overlay */}
              {showAddMoney && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                  <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Add Money
                    </h3>
                    <label className="text-sm font-medium text-gray-700">
                      Amount
                    </label>
                    <select
                      value={addAmount}
                      onChange={(e) => setAddAmount(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={200}>200</option>
                      <option value={400}>400</option>
                      <option value={600}>600</option>
                    </select>

                    <label className="text-sm font-medium text-gray-700">
                      Date
                    </label>
                    <input
                      type="date"
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                      className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {addError && (
                      <span className="text-red-600 text-xs">{addError}</span>
                    )}
                    {addDate && new Date(addDate).getDate() > 10 && (
                      <span className="text-yellow-700 text-xs block mb-2">
                        Contribution after 10th: Penalty of €25 will be applied
                      </span>
                    )}
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => setShowAddMoney(false)}
                        className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-1/2"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddMoney}
                        disabled={isSubmitting}
                        className={`inline-flex items-center justify-center px-3 py-1 text-sm rounded-lg w-1/2 
        ${
          isSubmitting
            ? "bg-emerald-600 opacity-75 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-700"
        } 
        text-white transition-colors`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                            Adding...
                          </>
                        ) : (
                          "Confirm"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Savings
                </label>
                {isEditing ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      €
                    </span>
                    <input
                      type="number"
                      value={editData.totalSavings}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          totalSavings: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-gray-900">
                    €
                    {typeof member.totalContributions === "number"
                      ? member.totalContributions.toLocaleString()
                      : "0"}
                  </p>
                )}
              </div>

              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Penalties
                </label>
                {isEditing ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={editData.penalties}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          penalties: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-red-600">
                    $
                    {typeof member.penalties === "number"
                      ? member.penalties.toLocaleString()
                      : "0"}{" "}
                  </p>
                )}
              </div> */}
{/* 
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Received
                </label>
                {isEditing ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={editData.interestReceived}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          interestReceived: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-emerald-600">
                    $
                    {typeof member.interestReceived === "number"
                      ? member.interestReceived.toLocaleString()
                      : "0"}
                  </p>
                )}
              </div> */}
            </div>
          </div>

          {/* Recent Contributions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recent Contributions
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {memberContributions.slice(0, 5).map((contribution, index) => (
                <div
                  key={
                    contribution.id ||
                    `contribution-${contribution.contributionDate}-${index}`
                  }
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-emerald-600 mr-2" />
                    <span className="font-medium">
                      €
                      {typeof contribution.amount === "number"
                        ? contribution.amount.toLocaleString()
                        : "0"}
                    </span>
                    <span
                      className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        contribution.type === "regular"
                          ? "bg-emerald-100 text-emerald-800"
                          : contribution.type === "penalty"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {contribution.type}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    {contribution.contributionDate &&
                    !isNaN(new Date(contribution.contributionDate).getTime())
                      ? new Date(
                          contribution.contributionDate
                        ).toLocaleDateString()
                      : "Invalid Date"}
                  </div>
                </div>
              ))}
              {memberContributions.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  No contributions recorded
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetails;

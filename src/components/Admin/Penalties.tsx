import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { fetchPenalties, updatePenalty } from "../../utils/api";

const PenaltiesTableSkeleton = () => (
  <table className="min-w-full bg-white rounded-lg shadow border">
    <thead className="bg-gray-100">
      <tr>
        <th className="py-2 px-4 text-left">Member</th>
        <th className="py-2 px-4 text-left">Contribution Date</th>
        <th className="py-2 px-4 text-left">Penalty</th>
        <th className="py-2 px-4 text-left">Action</th>
      </tr>
    </thead>
    <tbody>
      {[1, 2, 3, 4].map((i) => (
        <tr key={i} className="animate-pulse">
          <td className="py-2 px-4">
            <div className="h-4 w-32 bg-emerald-100 rounded"></div>
          </td>
          <td className="py-2 px-4">
            <div className="h-4 w-24 bg-emerald-100 rounded"></div>
          </td>
          <td className="py-2 px-4">
            <div className="h-4 w-16 bg-emerald-100 rounded"></div>
          </td>
          <td className="py-2 px-4">
            <div className="h-8 w-24 bg-emerald-200 rounded"></div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Penalties: React.FC = () => {
  const { state, dispatch } = useApp();
  const { paidPenalties = [] } = state;
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaid, setShowPaid] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadPenalties = async () => {
      setLoading(true);
      try {
        const data = await fetchPenalties();
        setPenalties(data); // Store all penalties
      } catch (error) {
        console.error("Failed to fetch penalties", error);
      } finally {
        setLoading(false);
      }
    };
    loadPenalties();
  }, []);

  // Filter penalties based on showPaid state
  const filteredPenalties = penalties.filter((penalty) => {
    if (!penalty.member) return false;
    return showPaid ? penalty.status === "paid" : penalty.status !== "paid";
  });

  // Modified to ensure database sync
  const handlePayPenalty = async (penaltyId: string, memberId: string) => {
    setProcessingIds((prev) => new Set([...prev, penaltyId]));
    try {
      // Update penalty status in database
      await updatePenalty(penaltyId, {
        status: "paid",
        paidDate: new Date().toISOString(),
        memberId,
      });

      // Remove paid penalty from the list
      setPenalties((prevPenalties) =>
        prevPenalties.filter((p) => (p.id || p._id) !== penaltyId)
      );

      // Update local state
      dispatch({ type: "ADD_PAID_PENALTY", payload: penaltyId });
    } catch (error) {
      console.error("Failed to pay penalty", error);
      alert("Failed to process penalty payment. Please try again.");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(penaltyId);
        return next;
      });
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-700">Penalties</h2>
          <button
            onClick={() => setShowPaid(!showPaid)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showPaid
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {showPaid ? "Show Unpaid" : "Show Paid"}
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <PenaltiesTableSkeleton />
          ) : filteredPenalties.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No {showPaid ? "paid" : "unpaid"} penalties found.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">Member</th>
                  <th className="py-2 px-4 text-left">Contribution Date</th>
                  <th className="py-2 px-4 text-left">Penalty</th>
                  <th className="py-2 px-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPenalties.map((penalty) => {
                  const penaltyId = penalty.id || penalty._id;
                  const memberId = penalty.member.id || penalty.member._id;
                  const memberName = `${penalty.member.firstName} ${
                    penalty.member.lastName || ""
                  }`.trim();

                  return (
                    <tr key={penaltyId} className="hover:bg-gray-50">
                      <td className="py-2 px-4">{memberName}</td>
                      <td className="py-2 px-4">
                        {penalty.assignedDate
                          ? new Date(penalty.assignedDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-2 px-4 font-bold text-red-600">
                        €25
                      </td>
                      <td className="py-2 px-4">
                        {penalty.status === "paid" ? (
                          <span className="text-green-600 font-semibold">
                            Paid
                          </span>
                        ) : (
                          <button
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 min-w-[100px]"
                            onClick={() => handlePayPenalty(penaltyId, memberId)}
                            disabled={processingIds.has(penaltyId)}
                          >
                            {processingIds.has(penaltyId) ? "Processing..." : "Pay Penalty"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Penalties;
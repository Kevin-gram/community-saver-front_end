import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { fetchPenalties, updatePenalty } from "../../utils/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

const ITEMS_PER_PAGE = 6;

const Penalties: React.FC = () => {
  const { state, dispatch } = useApp();
  const { paidPenalties = [] } = state;
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [processingPenaltyId, setProcessingPenaltyId] = useState<string | null>(
    null
  );
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all"); // Filter state

  useEffect(() => {
    const loadPenalties = async () => {
      setLoading(true);
      try {
        const data = await fetchPenalties();
        setPenalties(data);
      } catch (error) {
        console.error("Failed to fetch penalties", error);
      } finally {
        setLoading(false);
      }
    };
    loadPenalties();
  }, []);

  // Handle paying penalty: update penalty status in backend and deduct 25 from member
  const handlePayPenalty = async (penaltyId: string) => {
    setProcessingPenaltyId(penaltyId); // Set processing state
    try {
      // 1. Update penalty status in backend (backend should also create a penalty contribution of -25)
      await updatePenalty(penaltyId, { status: "paid" });

      // 2. Refresh penalties from backend
      const updatedPenalties = await fetchPenalties();
      setPenalties(updatedPenalties);

      // 3. Optionally, refresh users from backend to update totalContributions everywhere
      // If you have a loadUsers() function in context, call it here:
      // await loadUsers();

      // 4. Optionally, update paidPenalties in your state
      dispatch({ type: "ADD_PAID_PENALTY", payload: penaltyId });
    } catch (error) {
      console.error("Failed to pay penalty", error);
    } finally {
      setProcessingPenaltyId(null); // Reset processing state
    }
  };

  // Filter and sort penalties based on the selected filter
  const filteredPenalties = penalties
    .filter((c) => {
      // First check if member data exists and is valid
      if (!c.member || !c.member.firstName) {
        return false; // Exclude penalties with missing member data
      }

      // Then apply status filter
      if (filter === "unpaid") return c.status !== "paid";
      if (filter === "paid") return c.status === "paid";
      return true; // "all"
    })
    .sort((a, b) => {
      if (filter === "all") {
        // Sort unpaid penalties first when "All" is selected
        if (a.status !== "paid" && b.status === "paid") return -1;
        if (a.status === "paid" && b.status !== "paid") return 1;
      }
      return 0; // Keep original order for other filters
    });

  // Calculate pagination values using valid penalties
  const totalPages = Math.ceil(filteredPenalties.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(
    startIndex + ITEMS_PER_PAGE,
    filteredPenalties.length
  );
  const currentPenalties = filteredPenalties.slice(startIndex, endIndex);

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-black">Penalties</h2>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as "all" | "unpaid" | "paid");
              setCurrentPage(1); // Reset to the first page when filter changes
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <PenaltiesTableSkeleton />
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 text-left w-1/4">Member</th>
                    <th className="py-2 px-4 text-left w-1/4">
                      Contribution Date
                    </th>
                    <th className="py-2 px-4 text-left w-1/4">Penalty</th>
                    <th className="py-2 px-4 text-left w-1/4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPenalties.map((c) => {
                    const isPenalty = c.createdAt;
                    const penaltyId = c.id || c._id;
                    // Add null check for member
                    const memberName = c.member
                      ? `${c.member.firstName || ""} ${
                          c.member.lastName || ""
                        }`.trim()
                      : "Unknown Member";

                    return (
                      <tr key={penaltyId}>
                        <td className="py-2 px-4">{memberName}</td>
                        <td className="py-2 px-4">
                          {c.assignedDate
                            ? new Date(c.assignedDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td
                          className={`py-2 px-4 font-bold ${
                            isPenalty && c.status !== "paid"
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {isPenalty ? `€25` : "No Penalty"}
                        </td>
                        <td className="py-2 px-4">
                          {isPenalty ? (
                            c.status === "paid" ||
                            paidPenalties.includes(penaltyId) ? (
                              <span className="text-green-600 font-semibold">
                                Repaid
                              </span>
                            ) : (
                              <button
                                className={`px-3 py-1 rounded text-white ${
                                  processingPenaltyId === penaltyId
                                    ? "bg-orange-500 hover:bg-orange-600"
                                    : "bg-green-700 hover:bg-green-800"
                                } disabled:opacity-50`}
                                onClick={() => handlePayPenalty(penaltyId)}
                                disabled={
                                  processingPenaltyId === penaltyId ||
                                  c.status === "paid" ||
                                  paidPenalties.includes(penaltyId)
                                }
                              >
                                {processingPenaltyId === penaltyId
                                  ? "Processing..."
                                  : "Pay Penalty"}
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Modern Pagination Controls */}
              {totalPages > 1 && filteredPenalties.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {endIndex} of{" "}
                    {filteredPenalties.length} penalties
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="flex items-center px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={
                        currentPage === totalPages ||
                        endIndex >= filteredPenalties.length
                      }
                      className="flex items-center px-4 py-2 text-sm text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Penalties;

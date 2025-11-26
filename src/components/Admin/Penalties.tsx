import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { fetchPenalties, updatePenalty } from "../../utils/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const PenaltiesTableSkeleton = () => (
  <div className="overflow-x-auto">
    <table className="min-w-full bg-white rounded-lg shadow border">
      <thead className="bg-gray-100">
        <tr>
          <th className="py-2 px-4 text-left text-xs sm:text-sm">Member</th>
          <th className="py-2 px-4 text-left text-xs sm:text-sm">
            Contribution Date
          </th>
          <th className="py-2 px-4 text-left text-xs sm:text-sm">Penalty</th>
          <th className="py-2 px-4 text-left text-xs sm:text-sm">Action</th>
        </tr>
      </thead>
      <tbody>
        {[1, 2, 3, 4].map((i) => (
          <tr key={i} className="animate-pulse">
            <td className="py-2 px-4">
              <div className="h-4 w-24 sm:w-32 bg-emerald-100 rounded"></div>
            </td>
            <td className="py-2 px-4">
              <div className="h-4 w-20 sm:w-24 bg-emerald-100 rounded"></div>
            </td>
            <td className="py-2 px-4">
              <div className="h-4 w-12 sm:w-16 bg-emerald-100 rounded"></div>
            </td>
            <td className="py-2 px-4">
              <div className="h-8 w-20 sm:w-24 bg-emerald-200 rounded"></div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ITEMS_PER_PAGE = 6;

const Penalties: React.FC = () => {
  const { t } = useLanguage();
  const { state, dispatch } = useApp();
  const { paidPenalties = [] } = state;
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [processingPenaltyId, setProcessingPenaltyId] = useState<string | null>(
    null
  );
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");

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

  const handlePayPenalty = async (penaltyId: string) => {
    setProcessingPenaltyId(penaltyId);
    try {
      await updatePenalty(penaltyId, { status: "paid" });
      const updatedPenalties = await fetchPenalties();
      setPenalties(updatedPenalties);
      dispatch({ type: "ADD_PAID_PENALTY", payload: penaltyId });
    } catch (error) {
      console.error("Failed to pay penalty", error);
    } finally {
      setProcessingPenaltyId(null);
    }
  };

  const filteredPenalties = penalties
    .filter((c) => {
      if (!c.member || !c.member.firstName) {
        return false;
      }
      if (filter === "unpaid") return c.status !== "paid";
      if (filter === "paid") return c.status === "paid";
      return true;
    })
    .sort((a, b) => {
      if (filter === "all") {
        if (a.status !== "paid" && b.status === "paid") return -1;
        if (a.status === "paid" && b.status !== "paid") return 1;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredPenalties.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(
    startIndex + ITEMS_PER_PAGE,
    filteredPenalties.length
  );
  const currentPenalties = filteredPenalties.slice(startIndex, endIndex);

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-black">
            {t("admin.penalties")}
          </h2>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as "all" | "unpaid" | "paid");
              setCurrentPage(1);
            }}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{t("admin.all")}</option>
            <option value="unpaid">{t("admin.unpaid")}</option>
            <option value="paid">{t("admin.paid")}</option>
          </select>
        </div>

        {loading ? (
          <PenaltiesTableSkeleton />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {currentPenalties.map((c) => {
                const isPenalty = c.createdAt;
                const penaltyId = c.id || c._id;
                const memberName = c.member
                  ? `${c.member.firstName || ""} ${
                      c.member.lastName || ""
                    }`.trim()
                  : "Unknown Member";

                return (
                  <div
                    key={penaltyId}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {memberName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c.assignedDate
                            ? new Date(c.assignedDate).toLocaleDateString()
                            : "-"}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          isPenalty && c.status !== "paid"
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {isPenalty ? "€25" : "No Penalty"}
                      </span>
                    </div>
                    {isPenalty && (
                      <div className="mt-2">
                        {c.status === "paid" ||
                        paidPenalties.includes(penaltyId) ? (
                          <span className="text-green-600 font-semibold text-xs">
                            Repaid
                          </span>
                        ) : (
                          <button
                            className={`w-full px-3 py-1.5 rounded text-xs text-white font-medium ${
                              processingPenaltyId === penaltyId
                                ? "bg-orange-500 hover:bg-orange-600"
                                : "bg-green-700 hover:bg-green-800"
                            } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
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
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                      {t("admin.member")}
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                      {t("admin.contributionDate")}
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                      {t("admin.penalty")}
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                      {t("admin.action")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPenalties.map((c) => {
                    const isPenalty = c.createdAt;
                    const penaltyId = c.id || c._id;
                    const memberName = c.member
                      ? `${c.member.firstName || ""} ${
                          c.member.lastName || ""
                        }`.trim()
                      : "Unknown Member";

                    return (
                      <tr key={penaltyId} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {memberName}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {c.assignedDate
                            ? new Date(c.assignedDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td
                          className={`py-3 px-4 text-sm font-bold ${
                            isPenalty && c.status !== "paid"
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {isPenalty ? `€25` : "No Penalty"}
                        </td>
                        <td className="py-3 px-4">
                          {isPenalty ? (
                            c.status === "paid" ||
                            paidPenalties.includes(penaltyId) ? (
                              <span className="text-green-600 font-semibold text-sm">
                                Repaid
                              </span>
                            ) : (
                              <button
                                className={`px-3 py-1.5 rounded text-sm text-white font-medium ${
                                  processingPenaltyId === penaltyId
                                    ? "bg-orange-500 hover:bg-orange-600"
                                    : "bg-green-700 hover:bg-green-800"
                                } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
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
            </div>

            {/* No penalties message */}
            {currentPenalties.length === 0 && (
              <div className="text-center py-8 px-4">
                <p className="text-gray-500 text-sm">
                  {filter === "all"
                    ? t("admin.noPenaltiesFound")
                    : `${t("admin.no")} ${filter} ${t("admin.penalties")}`}
                </p>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && filteredPenalties.length > ITEMS_PER_PAGE && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                  {t("admin.showingPenalties")} {startIndex + 1} {t("admin.to")}{" "}
                  {endIndex} {t("admin.of")} {filteredPenalties.length}{" "}
                  {t("admin.penalties")}
                </div>
                <div className="flex items-center justify-center sm:justify-end space-x-2 sm:space-x-4">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <span className="text-xs sm:text-sm text-gray-600 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={
                      currentPage === totalPages ||
                      endIndex >= filteredPenalties.length
                    }
                    className="flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4 sm:ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Penalties;

import React, { useState, useEffect } from "react";
import { FileDown, Loader2, Calendar, Upload, Mail, X } from "lucide-react";
import {
  fetchUsers,
  fetchLoans,
  fetchMemberShares,
  fetchPenalties,
  fetchNetContributions,
} from "../../utils/api";
import { ReportData, ReportPeriod, PeriodOption } from "../../utils/reports/reportTypes";
import { periods } from "../../utils/reports/reportUtils";
import {
  handleGeneratePDF,
  handlePublishPDF,
  handleSendPDF,
} from "../../utils/reports/reportHandlers";

const FinancialReport: React.FC<{
  loading?: boolean;
  setLoading?: (v: boolean) => void;
}> = ({ loading: externalLoading, setLoading: setExternalLoading }) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("month");
  const [hoveredPeriod, setHoveredPeriod] = useState<ReportPeriod | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingButton, setLoadingButton] = useState<
    "download" | "publish" | "send" | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);

  const loading =
    typeof externalLoading === "boolean" ? externalLoading : internalLoading;

  const fetchData = async () => {
    try {
      setInternalLoading(true);
      if (setExternalLoading) setExternalLoading(true);
      setError(null);

      const [users, loansResponse, shares, penaltiesResponse, netData] =
        await Promise.all([
          fetchUsers(),
          fetchLoans(),
          fetchMemberShares(),
          fetchPenalties(),
          fetchNetContributions(),
        ]);

      const loans = Array.isArray(loansResponse)
        ? loansResponse
        : loansResponse?.loans || [];
      const penalties = Array.isArray(penaltiesResponse)
        ? penaltiesResponse
        : penaltiesResponse?.penalties || [];

      const reportData: ReportData = {
        users,
        loans,
        shares,
        penalties,
        timestamp: new Date().toISOString(),
        netContributions: netData || undefined,
      };

      setData(reportData);
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Failed to fetch report data.");
    } finally {
      setInternalLoading(false);
      if (setExternalLoading) setExternalLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!data) {
    return (
      <button
        disabled
        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-400 text-white cursor-not-allowed"
      >
        <FileDown className="w-4 h-4" />
        <span className="text-sm font-medium">Report</span>
      </button>
    );
  }

  return (
    <div className="relative">
      {/* Toaster */}
      {toast && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg text-lg font-semibold animate-fade-in pointer-events-auto">
            {toast}
          </div>
        </div>
      )}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={loading}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${
          loading
            ? "bg-gray-400 text-white cursor-not-allowed"
            : "bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        <FileDown className="w-4 h-4" />
        <span className="text-sm font-medium">Report</span>
      </button>

      {isExpanded && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setIsExpanded(false)}
          />
          <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-[500px] max-w-[95vw] z-50">
            {/* X Cancel Button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4 mb-6">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Report Period
              </label>
              <div className="grid grid-cols-1 gap-2">
                {periods.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    onMouseEnter={() => setHoveredPeriod(period.value)}
                    onMouseLeave={() => setHoveredPeriod(null)}
                    className={`relative px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                      selectedPeriod === period.value
                        ? "bg-emerald-600 text-white shadow-md"
                        : hoveredPeriod === period.value
                        ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-300"
                        : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {period.label}
                      </span>
                      {selectedPeriod === period.value && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    {(hoveredPeriod === period.value ||
                      selectedPeriod === period.value) && (
                      <div className="text-xs mt-1 opacity-90">
                        {period.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() =>
                  handleGeneratePDF(
                    data,
                    selectedPeriod,
                    setIsGenerating,
                    setLoadingButton,
                    setToast
                  )
                }
                disabled={isGenerating}
                className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  isGenerating && loadingButton === "download"
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg"
                } text-white`}
              >
                {loadingButton === "download" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span className="text-sm">Download Report</span>
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  handlePublishPDF(
                    data,
                    selectedPeriod,
                    setIsGenerating,
                    setLoadingButton,
                    setToast
                  )
                }
                disabled={isGenerating}
                className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  isGenerating && loadingButton === "publish"
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg"
                } text-white`}
                title="Publish report to server"
              >
                {loadingButton === "publish" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Publishing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Publish Report</span>
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  handleSendPDF(
                    data,
                    selectedPeriod,
                    setIsGenerating,
                    setLoadingButton,
                    setToast
                  )
                }
                disabled={isGenerating}
                className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  isGenerating && loadingButton === "send"
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg"
                } text-white`}
                title="Send report to all users via email"
              >
                {loadingButton === "send" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Sending...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">Send via Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FinancialReport;

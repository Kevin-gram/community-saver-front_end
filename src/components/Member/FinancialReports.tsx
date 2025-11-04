import React, { useState, useEffect, useCallback, useRef } from "react";
import { FileDown, Loader2, Calendar, X, Sparkles } from "lucide-react";
import { API_BASE } from "../../utils/api";

interface Report {
  _id: string;
  description: string;
  createdAt: string;
  uploadedAt: string;
  period: string;
  fileName: string;
}

interface FinancialReportsProps {
  open: boolean;
  onClose: () => void;
}

const POLLING_INTERVAL = 30000; // 30 seconds
const STORAGE_KEY = "lastViewedReportDate";

// Hook to check for new reports
export const useNewReportsCount = (): number => {
  const [newCount, setNewCount] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const checkNewReports = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_BASE}/reports`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      let reportsArray: Report[] = [];

      if (Array.isArray(data)) {
        reportsArray = data;
      } else if (data?.reports && Array.isArray(data.reports)) {
        reportsArray = data.reports;
      } else if (data?.data?.reports && Array.isArray(data.data.reports)) {
        reportsArray = data.data.reports;
      }

      const lastViewedDate = localStorage.getItem(STORAGE_KEY);

      if (!lastViewedDate || reportsArray.length === 0) {
        setNewCount(0);
        return;
      }

      const lastViewed = new Date(lastViewedDate).getTime();
      const newReports = reportsArray.filter(
        (report) => new Date(report.uploadedAt).getTime() > lastViewed
      );

      if (isMountedRef.current) {
        setNewCount(newReports.length);
      }
    } catch (error) {
      console.error("Error checking new reports:", error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    checkNewReports();

    pollingIntervalRef.current = setInterval(() => {
      if (!document.hidden) {
        checkNewReports();
      }
    }, POLLING_INTERVAL);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkNewReports();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkNewReports]);

  return newCount;
};

const FinancialReports: React.FC<FinancialReportsProps> = ({
  open,
  onClose,
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const getAuthToken = useCallback((): string | null => {
    return localStorage.getItem("token");
  }, []);

  const fetchReports = useCallback(
    async (isInitialLoad = false): Promise<Report[]> => {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Access denied. No token provided.");
      }

      const response = await fetch(`${API_BASE}/reports`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status}`);
      }

      const data = await response.json();

      // Handle multiple response formats
      let reportsArray: Report[] = [];
      if (Array.isArray(data)) {
        reportsArray = data;
      } else if (data?.reports && Array.isArray(data.reports)) {
        reportsArray = data.reports;
      } else if (data?.data?.reports && Array.isArray(data.data.reports)) {
        reportsArray = data.data.reports;
      }

      // Sort by uploadedAt (newest first)
      return reportsArray.sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
    },
    [getAuthToken]
  );

  const loadReports = useCallback(
    async (isInitialLoad = false) => {
      if (!isMountedRef.current) return;

      if (isInitialLoad) {
        setLoading(true);
      }

      setError(null);

      try {
        const fetchedReports = await fetchReports(isInitialLoad);

        if (isMountedRef.current) {
          setReports(fetchedReports);
        }
      } catch (err) {
        console.error("Error fetching reports:", err);
        if (isMountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch reports. Please try again."
          );
          setReports([]);
        }
      } finally {
        if (isMountedRef.current && isInitialLoad) {
          setLoading(false);
        }
      }
    },
    [fetchReports]
  );

  const handleDownload = useCallback(
    async (id: string, fileName: string) => {
      setDownloadingId(id);
      setError(null);

      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error("Authentication required");
        }

        const response = await fetch(`${API_BASE}/reports/${id}/download`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName || `financial-report-${id}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Download error:", err);
        setError("Failed to download report. Please try again.");
      } finally {
        setDownloadingId(null);
      }
    },
    [getAuthToken]
  );

  const markReportsAsViewed = useCallback(() => {
    if (reports.length > 0) {
      const latestReportDate = reports[0].uploadedAt;
      localStorage.setItem(STORAGE_KEY, latestReportDate);
    }
  }, [reports]);

  const handleClose = useCallback(() => {
    markReportsAsViewed();
    onClose();
  }, [markReportsAsViewed, onClose]);

  // Fetch reports when popup opens
  useEffect(() => {
    if (!open) return;

    setReports([]);
    loadReports(true);
  }, [open, loadReports]);

  // Mark as viewed when popup closes
  useEffect(() => {
    if (!open && reports.length > 0) {
      markReportsAsViewed();
    }
  }, [open, reports.length, markReportsAsViewed]);

  // Polling effect
  useEffect(() => {
    isMountedRef.current = true;

    const startPolling = () => {
      pollingIntervalRef.current = setInterval(() => {
        if (!document.hidden) {
          loadReports(false);
        }
      }, POLLING_INTERVAL);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadReports(false);
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadReports]);

  if (!open) return null;

  const latestReport = reports[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-[500px] max-h-[600px] z-60 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FileDown className="w-6 h-6 text-emerald-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">
              Financial Reports
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <p className="text-gray-600 mb-4 text-sm">
            View and download published financial reports. Sorted by latest.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-emerald-700 font-medium">
                Loading reports...
              </span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileDown className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No reports available.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
              {reports.map((report, index) => {
                const isLatest =
                  index === 0 && latestReport?._id === report._id;

                return (
                  <div
                    key={report._id}
                    className={`relative border rounded-lg px-4 py-3 transition-all duration-200 ${
                      isLatest
                        ? "bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-300 shadow-sm"
                        : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    {isLatest && (
                      <div className="absolute -top-2 -right-2 bg-emerald-600 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center shadow-md">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Latest
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-emerald-900 mb-1 truncate">
                          {report.description ||
                            report.fileName ||
                            "Untitled Report"}
                        </div>
                        {report.period && (
                          <div className="text-xs text-emerald-700 mb-1">
                            Period: {report.period}
                          </div>
                        )}
                        <div className="text-xs text-gray-600 flex items-center">
                          <Calendar className="inline w-3 h-3 mr-1" />
                          {new Date(report.uploadedAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleDownload(report._id, report.fileName)
                        }
                        disabled={downloadingId === report._id}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                          downloadingId === report._id
                            ? "bg-gray-400 cursor-not-allowed text-white"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md"
                        }`}
                        aria-label={`Download ${
                          report.description || report.fileName
                        }`}
                      >
                        {downloadingId === report._id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <FileDown className="w-4 h-4" />
                            <span>Download</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;

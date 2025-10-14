import React, { useState, useEffect } from "react";
import { FileDown, Loader2, Calendar } from "lucide-react";
import { fetchUsers, fetchLoans, fetchMemberShares, fetchPenalties } from "../../utils/api";
import { User, Loan, MemberShare } from "../../types";

type ReportPeriod = "week" | "month" | "quarter" | "year" | "all";

type ReportData = {
  users: User[];
  loans: Loan[];
  shares: MemberShare[];
  penalties: any[];
  timestamp: string;
};

const FinancialReport: React.FC = () => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("month");
  const [hoveredPeriod, setHoveredPeriod] = useState<ReportPeriod | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const periods: { value: ReportPeriod; label: string; description: string }[] = [
    { value: "week", label: "Last 7 Days", description: "Weekly Report" },
    { value: "month", label: "Last 30 Days", description: "Monthly Report" },
    { value: "quarter", label: "Last 90 Days", description: "Quarterly Report" },
    { value: "year", label: "Last 365 Days", description: "Annual Report" },
    { value: "all", label: "All Time", description: "Complete History" },
  ];

  // Fetch data from endpoints
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [users, loansResponse, shares, penaltiesResponse] = await Promise.all([
        fetchUsers(),
        fetchLoans(),
        fetchMemberShares(),
        fetchPenalties(),
      ]);

      // Enhanced logging to see actual data structure


      // Handle different possible response structures
      const loans = Array.isArray(loansResponse) ? loansResponse : loansResponse?.loans || [];
      const penalties = Array.isArray(penaltiesResponse) ? penaltiesResponse : penaltiesResponse?.penalties || [];


      const reportData: ReportData = {
        users,
        loans,
        shares,
        penalties,
        timestamp: new Date().toISOString(),
      };
      
      setData(reportData);
      
      // Additional verification logging
    } catch (err) {
      console.error('Fetch Error:', err);
      setError("Failed to fetch report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filterDataByPeriod = (data: ReportData, period: ReportPeriod): ReportData => {
    if (period === "all") return data;
    const now = new Date();
    const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
    const days = daysMap[period];
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      ...data,
      loans: data.loans.filter((loan) => {
        const loanDate = new Date(loan.requestDate || loan.createdAt || loan.date);
        return loanDate >= cutoffDate;
      }),
      penalties: data.penalties.filter((penalty) => {
        const penaltyDate = new Date(penalty.createdAt || penalty.date);
        return penaltyDate >= cutoffDate;
      }),
    };
  };

  // Helper function to match member IDs
  const matchMemberId = (id1: any, id2: any): boolean => {
    if (!id1 || !id2) return false;
    const str1 = typeof id1 === 'object' ? id1._id || id1.toString() : id1.toString();
    const str2 = typeof id2 === 'object' ? id2._id || id2.toString() : id2.toString();
    return str1 === str2;
  };

  const generatePDFWithJsPDF = async (filteredData: ReportData) => {
    try {
      const jsPDF = await import("jspdf");
      const autoTable = await import("jspdf-autotable");
      const doc = new jsPDF.default();
      const autoTablePlugin = autoTable.default;

      const pageWidth = doc.internal.pageSize.width;
      let yPos = 20;

      const darkGreen = [15, 94, 75];

      // Header
      doc.setFontSize(22);
      doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.text("Financial Report", pageWidth / 2, yPos, { align: "center" });

      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: "center" });
      doc.text(
        `Period: ${periods.find((p) => p.value === selectedPeriod)?.description}`,
        pageWidth / 2,
        yPos + 5,
        { align: "center" }
      );
      yPos += 20;

      // Calculate totals - modify to only show unpaid penalties
      const totalMembers = filteredData.users.length;
      const totalLoans = filteredData.loans.length;
      const activeLoans = filteredData.loans.filter(l => 
        l.status === 'approved' || l.status === 'active'
      ).length;
      const totalLoanAmount = filteredData.loans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
      const totalSavings = filteredData.shares.reduce((sum, share) => sum + (share.totalContribution || 0), 0);
      const totalInterest = filteredData.shares.reduce((sum, share) => sum + (share.interestEarned || 0), 0);
      const pendingPenalties = filteredData.penalties
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // Update summary data to show only unpaid penalties
      const summaryData = [
        ["Total Members", totalMembers.toString()],
        ["Total Loans Issued", totalLoans.toString()],
        ["Active/Approved Loans", activeLoans.toString()],
        ["Total Loan Amount", `€${totalLoanAmount.toLocaleString()}`],
        ["Total Member Savings", `€${totalSavings.toLocaleString()}`],
        ["Total Interest Distributed", `€${totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
        ["Outstanding Penalties", `€${pendingPenalties.toLocaleString()}`],
      ];

      // Executive Summary
      doc.setFontSize(14);
      doc.text("Executive Summary", 14, yPos);
      yPos += 10;

      autoTablePlugin(doc, {
        startY: yPos,
        head: [["Metric", "Value"]],
        body: summaryData,
        theme: "grid",
        headStyles: { fillColor: darkGreen, textColor: 255 },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Enhanced Member Financial Status Table
      if (filteredData.shares.length > 0) {
        doc.setFontSize(14);
        doc.text("Member Financial Status", 14, yPos);
        yPos += 10;

        const sharesBody = filteredData.shares.map((share) => {
          const memberId = share._id || share.id;

          // Find member loans with multiple ID matching strategies
          const memberLoans = filteredData.loans.filter((loan) => {
            const loanMemberId = loan.member?._id || loan.member?.id || loan.memberId || loan.member;
            const matches = matchMemberId(loanMemberId, memberId);
            if (matches) {
              console.log(`  - Loan match found: ${loan.amount}, status: ${loan.status}`);
            }
            return matches;
          });

          // Calculate unpaid loan amount
          const unpaidLoanAmount = memberLoans
            .filter(loan => loan.status === 'approved' || loan.status === 'active')
            .reduce((sum, loan) => sum + (loan.totalAmount || loan.amount || 0), 0);

          // Find member penalties with multiple ID matching strategies
          const memberPenalties = filteredData.penalties.filter((penalty) => {
            const penaltyMemberId = penalty.member?._id || penalty.member?.id || penalty.memberId || penalty.member;
            const matches = matchMemberId(penaltyMemberId, memberId);
            if (matches) {
              console.log(`  - Penalty match found: ${penalty.amount}, paid: ${penalty.isPaid}`);
            }
            return matches;
          });
          
          const pendingPenaltiesAmount = memberPenalties
            .filter(penalty => penalty.status === 'pending')
            .reduce((sum, penalty) => sum + (penalty.amount || 0), 0);
          return [
            share.name || 'N/A',
            share.branch || 'N/A',
            `€${(share.totalContribution || 0).toLocaleString()}`,
            `${(share.sharePercentage || 0).toFixed(2)}%`,
            `€${(share.interestEarned || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            unpaidLoanAmount > 0 ? `€${unpaidLoanAmount.toLocaleString()}` : 'No Active Loan',
            pendingPenaltiesAmount > 0 ? `€${pendingPenaltiesAmount.toLocaleString()}` : 'No Penalties'
          ];
        });

        autoTablePlugin(doc, {
          startY: yPos,
          head: [["Name", "Branch", "Contributions", "Share %", "Interest", "Outstanding Loan", "Unpaid Penalties"]],
          body: sharesBody,
          theme: "striped",
          headStyles: { fillColor: darkGreen, textColor: 255 },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Active & Unpaid Loans Table
      const unpaidLoans = filteredData.loans.filter(
        loan => loan.status === 'approved' || loan.status === 'active'
      );

      if (unpaidLoans.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text("Active & Unpaid Loans", 14, yPos);
        yPos += 10;

        const loansBody = unpaidLoans.map((loan) => {
          const loanMemberId = loan.member?._id || loan.member?.id || loan.memberId || loan.member;
          
          const memberPendingPenalties = filteredData.penalties
            .filter(p => {
              const penaltyMemberId = p.member?._id || p.member?.id || p.memberId || p.member;
              return p.status === 'pending' && matchMemberId(penaltyMemberId, loanMemberId);
            })
            .reduce((sum, p) => sum + (p.amount || 0), 0);

          return [
            `${loan.member?.firstName || loan.member?.name || "Unknown"} ${loan.member?.lastName || ""}`.trim(),
            loan.member?.branch || "Unknown",
            `€${(loan.amount || 0).toLocaleString()}`,
            `€${(loan.totalAmount || loan.amount || 0).toLocaleString()}`,
            (loan.status || 'unknown').toUpperCase(),
            new Date(loan.dueDate || loan.date).toLocaleDateString(),
            memberPendingPenalties > 0 ? `€${memberPendingPenalties.toLocaleString()}` : 'None'
          ];
        });

        autoTablePlugin(doc, {
          startY: yPos,
          head: [["Member", "Branch", "Principal", "Total Due", "Status", "Due Date", "Penalties"]],
          body: loansBody,
          theme: "striped",
          headStyles: { fillColor: darkGreen, textColor: 255 },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, {
          align: "center",
        });
      }
      return doc;
    } catch (error) {
      console.error("PDF Generation error:", error);
      throw new Error("Failed to generate PDF");
    }
  };

  const handleGeneratePDF = async () => {
    if (!data) return;
    setIsGenerating(true);
    try {
      const filtered = filterDataByPeriod(data, selectedPeriod);
      const doc = await generatePDFWithJsPDF(filtered);
      const fileName = `financial-report-${selectedPeriod}-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return <p>Loading report data...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!data) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
      >
        <FileDown className="w-4 h-4" />
        <span className="text-sm font-medium">Export PDF</span>
      </button>

      {isExpanded && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={() => setIsExpanded(false)} />
          <div className="absolute right-0 top-12 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-72 z-50">
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Report Period
              </label>
              <div className="grid grid-cols-1 gap-2">
                {periods.map((period) => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    onMouseEnter={() => setHoveredPeriod(period.value)}
                    onMouseLeave={() => setHoveredPeriod(null)}
                    className={`relative px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                      selectedPeriod === period.value
                        ? "bg-emerald-600 text-white shadow-md"
                        : hoveredPeriod === period.value
                        ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-300"
                        : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{period.label}</span>
                      {selectedPeriod === period.value && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    {(hoveredPeriod === period.value || selectedPeriod === period.value) && (
                      <div className="text-xs mt-1 opacity-90">{period.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                isGenerating ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg"
              } text-white`}
            >
              {isGenerating ? (
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
          </div>
        </>
      )}
    </div>
  );
};

export default FinancialReport;
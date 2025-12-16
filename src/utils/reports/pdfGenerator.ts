import { ReportData } from "./reportTypes";
import { matchMemberId } from "./reportUtils";

export const generatePDFWithJsPDF = async (filteredData: ReportData) => {
  try {
    const jsPDF = await import("jspdf");
    const autoTable = await import("jspdf-autotable");
    const doc = new jsPDF.default();
    const autoTablePlugin = autoTable.default;

    const pageWidth = doc.internal.pageSize.width;
    let yPos = 20;

    const darkGold = [184, 134, 11]; // RGB for dark gold

    doc.setFontSize(22);
    doc.setTextColor(darkGold[0], darkGold[1], darkGold[2]);
    doc.text("Golden Lion Financial Report", pageWidth / 2, yPos, { align: "center" });

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    doc.text(
      `Period: All Time`,
      pageWidth / 2,
      yPos + 5,
      { align: "center" }
    );
    yPos += 20;

    const totalMembers = filteredData.users.length;
    const totalLoans = filteredData.loans.length;
    const activeLoans = filteredData.loans.filter(
      (l) => l.status === "approved" || l.status === "active"
    ).length;
    const totalLoanAmount = filteredData.loans.reduce(
      (sum, loan) => sum + (loan.amount || 0),
      0
    );
    const totalSavings = filteredData.shares.reduce(
      (sum, share) => sum + (share.totalContribution || 0),
      0
    );
    const totalInterest = filteredData.shares.reduce(
      (sum, share) => sum + (share.interestEarned || 0),
      0
    );
    const pendingPenalties = filteredData.penalties
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const net = filteredData.netContributions || {};
    const totalBalance =
      typeof net.netAvailable === "number" ? net.netAvailable : totalSavings;
    const futureBalance =
      typeof net.bestFutureBalance === "number" ? net.bestFutureBalance : 0;

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(darkGold[0], darkGold[1], darkGold[2]);
    doc.text(`Total Balance: €${totalBalance.toLocaleString()}`, 14, yPos);
    doc.text(
      `Future Balance: €${futureBalance.toLocaleString()}`,
      pageWidth - 14,
      yPos,
      { align: "right" }
    );
    yPos += 12;
    doc.setFont(undefined, "normal");
    doc.setTextColor(100);

    const summaryData = [
      ["Total Members", totalMembers.toString()],
      ["Total Loans Issued", totalLoans.toString()],
      ["Active/Approved Loans", activeLoans.toString()],
      ["Total Loan Amount", `€${totalLoanAmount.toLocaleString()}`],
      ["Total Member Savings", `€${totalSavings.toLocaleString()}`],
      [
        "Total Interest Distributed",
        `€${totalInterest.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`,
      ],
      ["Outstanding Penalties", `€${pendingPenalties.toLocaleString()}`],
    ];

    doc.setFontSize(14);
    doc.text("Executive Summary", 14, yPos);
    yPos += 10;

    autoTablePlugin(doc, {
      startY: yPos,
      head: [["Metric", "Value"]],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: darkGold, textColor: 255 },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    if (filteredData.shares.length > 0) {
      doc.setFontSize(14);
      doc.text("Member Financial Status", 14, yPos);
      yPos += 10;

      const sharesBody = filteredData.shares.map((share) => {
        const memberId = share._id || share.id;

        const memberLoans = filteredData.loans.filter((loan) => {
          const loanMemberId =
            loan.member?._id ||
            loan.member?.id ||
            loan.memberId ||
            loan.member;
          return matchMemberId(loanMemberId, memberId);
        });

        const unpaidLoanAmount = memberLoans
          .filter(
            (loan) => loan.status === "approved" || loan.status === "active"
          )
          .reduce(
            (sum, loan) => sum + (loan.totalAmount || loan.amount || 0),
            0
          );

        const memberPenalties = filteredData.penalties.filter((penalty) => {
          const penaltyMemberId =
            penalty.member?._id ||
            penalty.member?.id ||
            penalty.memberId ||
            penalty.member;
          return matchMemberId(penaltyMemberId, memberId);
        });

        const pendingPenaltiesAmount = memberPenalties
          .filter((penalty) => penalty.status === "pending")
          .reduce((sum, penalty) => sum + (penalty.amount || 0), 0);
        return [
          share.name || "N/A",
          share.branch || "N/A",
          `€${(share.totalContribution || 0).toLocaleString()}`,
          `${(share.sharePercentage || 0).toFixed(2)}%`,
          `€${(share.interestEarned || 0).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}`,
          unpaidLoanAmount > 0
            ? `€${unpaidLoanAmount.toLocaleString()}`
            : "No Active Loan",
          pendingPenaltiesAmount > 0
            ? `€${pendingPenaltiesAmount.toLocaleString()}`
            : "No Penalties",
        ];
      });

      autoTablePlugin(doc, {
        startY: yPos,
        head: [
          [
            "Name",
            "Branch",
            "Contributions",
            "Share %",
            "Interest",
            "Outstanding Loan",
            "Unpaid Penalties",
          ],
        ],
        body: sharesBody,
        theme: "striped",
        headStyles: { fillColor: darkGold, textColor: 255 },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    const unpaidLoans = filteredData.loans.filter(
      (loan) => loan.status === "approved" || loan.status === "active"
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
        const loanMemberId =
          loan.member?._id || loan.member?.id || loan.memberId || loan.member;

        const memberPendingPenalties = filteredData.penalties
          .filter((p) => {
            const penaltyMemberId =
              p.member?._id || p.member?.id || p.memberId || p.member;
            return (
              p.status === "pending" &&
              matchMemberId(penaltyMemberId, loanMemberId)
            );
          })
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        return [
          `${loan.member?.firstName || loan.member?.name || "Unknown"} ${
            loan.member?.lastName || ""
          }`.trim(),
          loan.member?.branch || "Unknown",
          `€${(loan.amount || 0).toLocaleString()}`,
          `€${(loan.totalAmount || loan.amount || 0).toLocaleString()}`,
          (loan.status || "unknown").toUpperCase(),
          new Date(loan.dueDate || loan.date).toLocaleDateString(),
          memberPendingPenalties > 0
            ? `€${memberPendingPenalties.toLocaleString()}`
            : "None",
        ];
      });

      autoTablePlugin(doc, {
        startY: yPos,
        head: [
          [
            "Member",
            "Branch",
            "Principal",
            "Total Due",
            "Status",
            "Due Date",
            "Penalties",
          ],
        ],
        body: loansBody,
        theme: "striped",
        headStyles: { fillColor: darkGold, textColor: 255 },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        {
          align: "center",
        }
      );
    }
    return doc;
  } catch (error) {
    console.error("PDF Generation error:", error);
    throw new Error("Failed to generate PDF");
  }
};

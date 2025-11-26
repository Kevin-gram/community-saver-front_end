import { API_BASE } from "../../utils/api";
import { ReportPeriod } from "./reportTypes";
import { getReportFileName } from "./reportUtils";

export const uploadReport = async (pdfBlob: Blob, description: string = "", selectedPeriod: ReportPeriod) => {
  const formData = new FormData();
  formData.append("report", pdfBlob, getReportFileName(selectedPeriod));
  if (description) formData.append("description", description);

  const token = localStorage.getItem("token");
  if (!token) {
    return;
  }

  const response = await fetch(`${API_BASE}/reports/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload report");
  }
};

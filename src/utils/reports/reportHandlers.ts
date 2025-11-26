import { ReportData, ReportPeriod } from "./reportTypes";
import { filterDataByPeriod, getReportFileName } from "./reportUtils";
import { generatePDFWithJsPDF } from "./pdfGenerator";
import { uploadReport } from "./reportApi";
import { API_BASE } from "../../utils/api";

export const handleGeneratePDF = async (
  data: ReportData | null,
  selectedPeriod: ReportPeriod,
  setIsGenerating: (v: boolean) => void,
  setLoadingButton: (v: "download" | "publish" | "send" | null) => void,
  setToast: (msg: string | null) => void
) => {
  if (!data) return;
  setIsGenerating(true);
  setLoadingButton("download");
  try {
    const filtered = filterDataByPeriod(data, selectedPeriod);
    const doc = await generatePDFWithJsPDF(filtered);
    const fileName = getReportFileName(selectedPeriod);
    doc.save(fileName);
    setToast("Report downloaded successfully!");
    setTimeout(() => setToast(null), 2000);
  } catch (error) {
    console.error("PDF generation failed:", error);
  } finally {
    setIsGenerating(false);
    setLoadingButton(null);
  }
};

export const handlePublishPDF = async (
  data: ReportData | null,
  selectedPeriod: ReportPeriod,
  setIsGenerating: (v: boolean) => void,
  setLoadingButton: (v: "download" | "publish" | "send" | null) => void,
  setToast: (msg: string | null) => void
) => {
  if (!data) return;
  setIsGenerating(true);
  setLoadingButton("publish");
  try {
    const filtered = filterDataByPeriod(data, selectedPeriod);
    const doc = await generatePDFWithJsPDF(filtered);
    const pdfBlob = doc.output("blob");
    await uploadReport(pdfBlob, `Financial report for period: ${selectedPeriod}`, selectedPeriod);
    setToast("Report published successfully!");
    setTimeout(() => setToast(null), 2000);
  } catch (error) {
    console.error("Report publish failed:", error);
  } finally {
    setIsGenerating(false);
    setLoadingButton(null);
  }
};

export const handleSendPDF = async (
  data: ReportData | null,
  selectedPeriod: ReportPeriod,
  setIsGenerating: (v: boolean) => void,
  setLoadingButton: (v: "download" | "publish" | "send" | null) => void,
  setToast: (msg: string | null) => void
) => {
  if (!data) return;
  setIsGenerating(true);
  setLoadingButton("send");
  try {
    const filtered = filterDataByPeriod(data, selectedPeriod);
    const doc = await generatePDFWithJsPDF(filtered);
    const pdfBlob = doc.output("blob");
    const token = localStorage.getItem("token");
    if (!token) {
      setIsGenerating(false);
      setLoadingButton(null);
      return;
    }
    const formData = new FormData();
    formData.append("pdf", pdfBlob, getReportFileName(selectedPeriod));
    formData.append("description", `Financial report for period: ${selectedPeriod}`);

    const response = await fetch(`${API_BASE}/reports/send-pdf`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = "Failed to send report via email";
      try {
        const errData = await response.json();
        console.error("Error response data:", errData);
        if (errData?.message) errorMsg = errData.message;
      } catch (e) {
        console.error("Could not parse error response:", e);
        const textResponse = await response.text();
        console.error("Raw error response:", textResponse);
        if (textResponse) errorMsg = textResponse;
      }
      throw new Error(errorMsg);
    }
    setToast("Report sent via email successfully!");
    setTimeout(() => setToast(null), 2000);
  } catch (error) {
    console.error("Send PDF failed:", error);
  } finally {
    setIsGenerating(false);
    setLoadingButton(null);
  }
};

"use client";

import { CheckCircle2, Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function getDownloadFilename(contentDisposition: string | null) {
  const fallback = "daily-sales-report.pdf";
  if (!contentDisposition) return fallback;

  const encodedFilename = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encodedFilename) {
    try {
      return decodeURIComponent(encodedFilename);
    } catch {
      return encodedFilename;
    }
  }

  return contentDisposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback;
}

export function ClosingReportDownload({ sessionId }: { sessionId: string }) {
  const reportUrl = `/api/pos/sessions/${encodeURIComponent(sessionId)}/closing-report`;
  const [status, setStatus] = useState<"idle" | "downloading" | "downloaded" | "error">("idle");

  const downloadReport = useCallback(async () => {
    setStatus("downloading");

    try {
      const response = await fetch(reportUrl, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(`PDF request failed with status ${response.status}.`);

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("application/pdf")) throw new Error("The server did not return a PDF.");

      const blob = await response.blob();
      if (blob.size === 0) throw new Error("The generated PDF was empty.");

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getDownloadFilename(response.headers.get("content-disposition"));
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);

      window.sessionStorage.setItem(`pos-closing-report:${sessionId}`, "downloaded");
      setStatus("downloaded");
    } catch {
      setStatus("error");
    }
  }, [reportUrl, sessionId]);

  useEffect(() => {
    const storageKey = `pos-closing-report:${sessionId}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    const timeout = window.setTimeout(() => void downloadReport(), 0);
    return () => window.clearTimeout(timeout);
  }, [downloadReport, sessionId]);

  return (
    <section className="closing-report-ready" aria-live="polite">
      <span className="closing-report-icon"><CheckCircle2 size={19}/></span>
      <div>
        <strong>Session closed and reconciled</strong>
        <p>
          {status === "downloading"
            ? "Preparing your daily sales PDF…"
            : status === "error"
              ? "The automatic download could not start. Use the button to try again."
              : "Your daily sales PDF is ready. Keep it for reconciliation and handover."}
        </p>
      </div>
      <button
        type="button"
        className="button secondary inline-button"
        onClick={() => void downloadReport()}
        disabled={status === "downloading"}
      >
        <Download size={16}/>
        {status === "downloading" ? "Preparing PDF…" : status === "error" ? "Try download again" : "Download PDF"}
      </button>
    </section>
  );
}

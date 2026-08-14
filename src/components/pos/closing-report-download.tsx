"use client";

import { CheckCircle2, Download } from "lucide-react";
import { useEffect } from "react";

export function ClosingReportDownload({ sessionId }: { sessionId: string }) {
  const reportUrl = `/api/pos/sessions/${encodeURIComponent(sessionId)}/closing-report`;

  useEffect(() => {
    const storageKey = `pos-closing-report:${sessionId}`;
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "downloaded");
    const link = document.createElement("a");
    link.href = reportUrl;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [reportUrl, sessionId]);

  return (
    <section className="closing-report-ready" aria-live="polite">
      <span className="closing-report-icon"><CheckCircle2 size={19}/></span>
      <div>
        <strong>Session closed and reconciled</strong>
        <p>Your daily sales PDF is downloading. Keep this link if you need another copy.</p>
      </div>
      <a className="button secondary inline-button" href={reportUrl} download><Download size={16}/> Download PDF</a>
    </section>
  );
}

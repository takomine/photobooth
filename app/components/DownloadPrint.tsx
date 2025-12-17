"use client";

import QRCode from "qrcode";
import { RefObject, useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Printer, Share2, Loader2, X, ExternalLink, Copy, Check } from "lucide-react";

type DownloadPrintProps = {
  printRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
  exportWidth: number;
  exportHeight: number;
  exportLabel: string;
  note?: string;
};

export function DownloadPrint({
  printRef,
  disabled,
  exportWidth,
  exportHeight,
}: DownloadPrintProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sendQr, setSendQr] = useState<string | null>(null);
  const [sendLink, setSendLink] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const hasContent = !disabled;

  useEffect(() => {
    return () => {
      setSendQr(null);
      setSendLink(null);
    };
  }, []);

  const renderToDataUrl = async () => {
    if (!printRef.current) throw new Error("Nothing to export");
    return toPng(printRef.current, {
      cacheBust: true,
      width: exportWidth,
      height: exportHeight,
      style: {
        transform: "scale(1)",
        transformOrigin: "top left",
      },
    });
  };

  const handleDownload = async () => {
    if (!printRef.current || isExporting || disabled) return;
    setIsExporting(true);
    try {
      const dataUrl = await renderToDataUrl();
      const link = document.createElement("a");
      link.download = "photobooth.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (disabled) return;
    window.print();
  };

  const handleShare = async () => {
    if (!hasContent || isSharing) return;
    setIsSharing(true);
    setSendError(null);
    setSendQr(null);
    setSendLink(null);
    try {
      const dataUrl = await renderToDataUrl();
      const blob = await (await fetch(dataUrl)).blob();
      const form = new FormData();
      form.append("file", blob, "photobooth.png");
      const res = await fetch("/api/send-upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`);
      }
      const payload = (await res.json()) as { url: string; ttlHours?: number };
      setSendLink(payload.url);
      const qr = await QRCode.toDataURL(payload.url, { width: 200 });
      setSendQr(qr);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Share failed";
      setSendError(message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    if (!sendLink) return;
    try {
      await navigator.clipboard.writeText(sendLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleClose = () => {
    setSendQr(null);
    setSendLink(null);
    setSendError(null);
  };

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleDownload}
          disabled={!hasContent || isExporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Download
        </button>

        <button
          onClick={handlePrint}
          disabled={!hasContent}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>

        <button
          onClick={handleShare}
          disabled={!hasContent || isSharing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/80 hover:bg-amber-500 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isSharing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          Share
        </button>
      </div>

      {/* Error */}
      {sendError && (
        <div className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {sendError}
        </div>
      )}

      {/* QR Result */}
      {sendQr && sendLink && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium text-sm">Share Link (24h)</span>
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start gap-4">
            <img
              src={sendQr}
              alt="QR Code"
              className="w-24 h-24 rounded-lg bg-white p-1"
            />
            <div className="flex-1 space-y-2">
              <div className="text-xs text-white/60 break-all font-mono bg-white/5 px-2 py-1.5 rounded border border-white/10">
                {sendLink}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={() => window.open(sendLink, "_blank")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No content message */}
      {!hasContent && (
        <p className="text-xs text-white/40">
          Take a photo to enable export options.
        </p>
      )}
    </div>
  );
}

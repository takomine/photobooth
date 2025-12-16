"use client";

import QRCode from "qrcode";
import { RefObject, useEffect, useState } from "react";
import { toPng } from "html-to-image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  exportLabel,
  note,
}: DownloadPrintProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendQr, setSendQr] = useState<string | null>(null);
  const [sendLink, setSendLink] = useState<string | null>(null);
  const hasContent = !disabled;

  const revokeShareLink = () => {
    if (shareLink) {
      URL.revokeObjectURL(shareLink);
      setShareLink(null);
    }
  };

  const revokeSendLink = () => {
    setSendQr(null);
    setSendLink(null);
  };

  useEffect(() => {
    return () => revokeShareLink();
  }, [shareLink]);

  useEffect(() => {
    return () => revokeSendLink();
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
      // eslint-disable-next-line no-console
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
    setShareError(null);
    setShareStatus(null);
    setQrDataUrl(null);
    revokeShareLink();
    try {
      const dataUrl = await renderToDataUrl();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "photobooth.png", { type: "image/png" });
      const nav: typeof navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      } = navigator as any;
      const canShareFiles = !!nav.canShare && nav.canShare({ files: [file] });
      if (canShareFiles && nav.share) {
        await nav.share({ files: [file], title: "Photobooth share" });
        setShareStatus("Shared via system share sheet.");
        return;
      }
      const url = URL.createObjectURL(blob);
      setShareLink(url);
      const qr = await QRCode.toDataURL(url);
      setQrDataUrl(qr);
      setShareStatus("Share not supported; scan QR or copy link.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Share failed";
      setShareError(message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareStatus("Link copied. Scan QR or open on mobile.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Copy failed";
      setShareError(message);
    }
  };

  const handleSendUpload = async () => {
    if (!hasContent || isSharing) return;
    setIsSharing(true);
    setSendStatus(null);
    setSendError(null);
    revokeSendLink();
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
      const qr = await QRCode.toDataURL(payload.url);
      setSendQr(qr);
      setSendStatus(
        `Link ready. ${
          payload.ttlHours ? `Expires in ~${payload.ttlHours}h.` : ""
        }`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send upload failed";
      setSendError(message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Card className="no-print shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Export</CardTitle>
          <CardDescription>Printable, downloadable, and shareable output.</CardDescription>
        </div>
        <Badge variant="muted" className="text-[12px]">
          Ready to share
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleDownload}
            disabled={!hasContent || isExporting}
          >
            {isExporting ? "Preparing..." : "Download PNG"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            disabled={!hasContent}
          >
            Print
          </Button>
          <Button
            type="button"
            className="bg-amber-600 hover:bg-amber-500"
            onClick={handleSendUpload}
            disabled={!hasContent || isSharing}
          >
            {isSharing ? "Sharing..." : "Share (link+QR)"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleShare}
            disabled={!hasContent || isSharing}
          >
            {isSharing ? "Sharing..." : "Share (local/OS)"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
          <span>
            Export size: {exportLabel} ({exportWidth} × {exportHeight}px)
            {note ? <span className="ml-1 text-muted-foreground">({note})</span> : null}
          </span>
          {!hasContent ? (
            <Badge variant="warning">Take a photo to enable export.</Badge>
          ) : (
            <Badge variant="success">Content ready</Badge>
          )}
        </div>
        {shareStatus ? <p className="text-xs text-emerald-700">{shareStatus}</p> : null}
        {shareError ? <p className="text-xs text-red-600">{shareError}</p> : null}
        {sendStatus ? <p className="text-xs text-emerald-700">{sendStatus}</p> : null}
        {sendError ? <p className="text-xs text-red-600">{sendError}</p> : null}

        {qrDataUrl && shareLink ? (
          <div className="rounded-lg border border-border bg-muted/60 p-3 text-xs text-foreground">
            <div className="flex items-center justify-between">
              <span className="font-semibold">QR fallback</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQrDataUrl(null);
                  setShareStatus(null);
                  revokeShareLink();
                }}
              >
                Close
              </Button>
            </div>
            <p className="mt-1 text-muted-foreground">
              Scan with your phone on the same network to download the image.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <img src={qrDataUrl} alt="Share QR" className="h-32 w-32 rounded bg-white p-2 shadow" />
              <div className="space-y-2">
                <div className="break-all rounded border border-border bg-card px-2 py-1 text-[11px]">
                  {shareLink}
                </div>
                <div className="flex gap-2 text-[11px]">
                  <Button type="button" variant="outline" size="sm" onClick={handleCopyLink}>
                    Copy link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(shareLink, "_blank")}
                  >
                    Open link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {sendQr && sendLink ? (
          <div className="rounded-lg border border-border bg-muted/60 p-3 text-xs text-foreground">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Send link (24h)</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  revokeSendLink();
                  setSendStatus(null);
                  setSendError(null);
                }}
              >
                Close
              </Button>
            </div>
            <p className="mt-1 text-muted-foreground">Scan or open on your phone to download.</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <img src={sendQr} alt="Share link QR" className="h-32 w-32 rounded bg-white p-2 shadow" />
              <div className="space-y-2">
                <div className="break-all rounded border border-border bg-card px-2 py-1 text-[11px]">
                  {sendLink}
                </div>
                <div className="flex gap-2 text-[11px]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(sendLink);
                        setSendStatus("Link copied.");
                      } catch (err) {
                        setSendError(err instanceof Error ? err.message : "Copy failed");
                      }
                    }}
                  >
                    Copy link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(sendLink, "_blank")}
                  >
                    Open link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


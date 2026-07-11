import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders a real, scannable QR code that resolves to this app's tag-scan URL. */
export function QrTagCode({ tagId, size = 180 }: { tagId: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const target = `${window.location.origin}/tags?scan=${encodeURIComponent(tagId)}`;
    QRCode.toDataURL(target, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0d0f14", light: "#f5f2ea" },
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [tagId, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="animate-pulse rounded-lg bg-white/[0.05]"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code for tag ${tagId}`}
      width={size}
      height={size}
      className="rounded-lg"
    />
  );
}

export async function downloadTagQr(tagId: string, label: string) {
  const target = `${window.location.origin}/tags?scan=${encodeURIComponent(tagId)}`;
  const url = await QRCode.toDataURL(target, {
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "H",
  });
  const a = document.createElement("a");
  a.href = url;
  a.download = `findr-tag-${label.replace(/\s+/g, "-").toLowerCase()}.png`;
  a.click();
}

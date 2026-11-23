"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button onClick={() => window.print()} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", borderRadius: 999, background: "#0a0a0a", color: "#fff", fontWeight: 600, fontSize: 13 }}>
      <Printer size={15} aria-hidden /> {label}
    </button>
  );
}

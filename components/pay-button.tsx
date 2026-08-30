"use client";
import { useState } from "react";
import { dollars } from "@/lib/format";

export function PayButton({
  checkoutId,
  amountCents,
}: {
  checkoutId: string;
  amountCents: number;
}) {
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const response = await fetch("/api/checkout/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: checkoutId }),
      });
      const result = await response.json();
      window.location.assign(result.redirectUrl);
    } catch {
      setBusy(false);
      alert("Payment processing error. Please try again.");
    }
  }

  return (
    <button
      className="steal-button pay-confirm-btn"
      disabled={busy}
      onClick={pay}
      type="button"
    >
      {busy ? "CONFIRMING REIGN..." : `PAY ${dollars(amountCents)} AND CREATE MY REIGN`}
    </button>
  );
}

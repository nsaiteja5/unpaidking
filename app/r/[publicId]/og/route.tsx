import { ImageResponse } from "next/og";
import { getReignByPublicId } from "@/lib/reigns";
import { dollars } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const publicId = (await params).publicId;
  const details = await getReignByPublicId(publicId);

  if (!details) {
    return new Response("That reign card does not exist.", { status: 404 });
  }

  const { reign, throne } = details;
  const headline = reign.offerHeadline || `${reign.kingName} took the throne of ${throne.category}`;
  const previousKing = reign.fromName || throne.defaultKingName;
  const amountPaid = dollars(reign.amountCents);
  const handleText = reign.productXHandle ? `(@${reign.productXHandle})` : "";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#14110e",
          color: "#e8dcc8",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "60px 72px",
          fontFamily: "serif",
          justifyContent: "space-between",
          border: "12px solid #231e19",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "sans-serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 4,
              color: "#9a2b1f",
              textTransform: "uppercase",
            }}
          >
            UNPAID KING · REIGN RECEIPT
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "sans-serif",
              fontSize: 18,
              letterSpacing: 2,
              color: "#b7a890",
              textTransform: "uppercase",
            }}
          >
            {throne.category}
          </div>
        </div>

        {/* Center: Offer Headline & Product */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 24, marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: headline.length > 55 ? 48 : 58,
              lineHeight: 1.1,
              letterSpacing: -2,
              color: "#f3ede2",
              maxWidth: "1050px",
              fontWeight: 400,
            }}
          >
            &ldquo;{headline}&rdquo;
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 20,
              fontFamily: "sans-serif",
              fontSize: 28,
              fontWeight: 600,
              color: "#c4a574",
            }}
          >
            by {reign.kingName}{handleText ? ` ${handleText}` : ""}
          </div>
        </div>

        {/* Footer info: Dethroned story + permanent URL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #3a342c",
            paddingTop: 24,
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                display: "flex",
                border: "2px solid #9a2b1f",
                color: "#9a2b1f",
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: 2,
                padding: "6px 12px",
                textTransform: "uppercase",
              }}
            >
              DETHRONED {previousKing.toUpperCase()}
            </span>
            <span style={{ display: "flex", color: "#b7a890", fontSize: 18 }}>
              {throne.category.toUpperCase()} THRONE · {amountPaid} PAID
            </span>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 600,
              color: "#e8dcc8",
              letterSpacing: 1,
            }}
          >
            unpaidking.lol/r/{publicId}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      },
    },
  );
}

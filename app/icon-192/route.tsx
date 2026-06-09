import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "linear-gradient(135deg, #7C3AED 0%, #4F1D96 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
        }}
      >
        <div style={{ color: "white", fontSize: 96, fontWeight: 900, letterSpacing: -4 }}>
          D
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  );
}

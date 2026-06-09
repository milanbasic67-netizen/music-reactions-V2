import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "linear-gradient(135deg, #7C3AED 0%, #4F1D96 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 108,
        }}
      >
        <div style={{ color: "white", fontSize: 256, fontWeight: 900, letterSpacing: -10 }}>
          D
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}

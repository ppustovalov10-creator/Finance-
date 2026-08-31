import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#0E0F0C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
        }}
      >
        <div style={{ color: "#6FCF7B", fontSize: 20, fontWeight: 700 }}>₽</div>
      </div>
    ),
    { ...size }
  );
}

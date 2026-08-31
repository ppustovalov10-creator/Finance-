import { ImageResponse } from "next/og";

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const s = Math.max(16, Math.min(1024, parseInt(size, 10) || 192));
  return new ImageResponse(
    (
      <div
        style={{
          width: s,
          height: s,
          background: "#0E0F0C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: s * 0.2,
        }}
      >
        <div style={{ color: "#6FCF7B", fontSize: s * 0.56, fontWeight: 700 }}>₽</div>
      </div>
    ),
    { width: s, height: s }
  );
}

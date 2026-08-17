export function rgbToHex(rgb: number[] | undefined): string {
  if (!rgb || rgb.length < 3) return "#ffffff";
  return (
    "#" +
    rgb
      .slice(0, 3)
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

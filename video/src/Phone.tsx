import { Interactive } from "remotion";

// A phone showing the app. Screenshots are 1170 px wide (390 pt at 3x), so the
// screen keeps the iPhone's 390:844 shape at whatever width it is drawn.
export const Phone: React.FC<{
  x: number;
  y: number;
  screenWidth: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, screenWidth, children, style }) => {
  const bezel = Math.round(screenWidth * 0.037);
  const screenHeight = Math.round((screenWidth * 844) / 390);
  return (
    <Interactive.Div
      name="Phone"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: screenWidth + 2 * bezel,
        height: screenHeight + 2 * bezel,
        padding: bezel,
        borderRadius: screenWidth * 0.17,
        backgroundColor: "#0f172a",
        boxShadow: "0 40px 80px rgba(15, 23, 42, 0.25)",
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: screenWidth,
          height: screenHeight,
          borderRadius: screenWidth * 0.13,
          overflow: "hidden",
          backgroundColor: "#f8fafc",
        }}
      >
        {children}
      </div>
    </Interactive.Div>
  );
};

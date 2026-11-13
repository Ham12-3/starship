import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

// Display face for headlines and captions; everything small stays in the system sans.
const serif = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--serif", display: "swap" });

export const metadata: Metadata = {
  title: "Factory to Orbit",
  description: "Follow the biggest rocket ever flown from the factory floor to orbit and back.",
};

export const viewport: Viewport = { themeColor: "#0a0706", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={serif.variable}>
      <body>{children}</body>
    </html>
  );
}

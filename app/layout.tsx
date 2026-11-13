import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Factory to Orbit",
  description: "Follow the biggest rocket ever flown from the factory floor to orbit and back.",
};

export const viewport: Viewport = { themeColor: "#0b0d11", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

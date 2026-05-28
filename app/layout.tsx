import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fundraise Closing Tracker",
  description: "Indian fundraise closing control room for legal deal teams"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

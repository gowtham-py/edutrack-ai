import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduTrack AI | Smart Attendance",
  description: "AI-powered attendance management for schools and colleges.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

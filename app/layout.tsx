import type { Metadata } from "next";
import { Oswald, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
});
const outfit = Outfit ({
  subsets: ["latin"],
  variable: "--font-outfit",
});
export const metadata: Metadata = {
  title: "Insightify",
  description: "Generate Insights!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${oswald.variable} ${outfit.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

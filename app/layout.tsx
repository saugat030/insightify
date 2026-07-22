import type { Metadata } from "next";
import { Oswald, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { GoogleOAuthProvider } from "@react-oauth/google";

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
  // Only wrap with the Google provider when a client ID is configured.
  // Initializing it with an empty client_id crashes the GSI client, so when the
  // env var is missing we skip the provider (Google buttons are hidden too).
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  return (
    <html lang="en">
      <body
        className={`${oswald.variable} ${outfit.variable} antialiased`}
      >
        {clientId ? (
          <GoogleOAuthProvider clientId={clientId}>
            <AuthProvider>{children}</AuthProvider>
          </GoogleOAuthProvider>
        ) : (
          <AuthProvider>{children}</AuthProvider>
        )}
      </body>
    </html>
  );
}

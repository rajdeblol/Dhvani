import type { Metadata } from "next";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Dhwani | Verifiable Voice Vault",
  description: "Privacy-first voice note dApp on Ritual Chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-satoshi bg-brand-base text-brand-primary min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

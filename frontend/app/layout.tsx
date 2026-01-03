import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ContextComp from "./context/ContextComp";
import CasperProvider from "./context/CasperProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CasperLink - Cross-Chain Intent Network",
  description: "First intent-based cross-chain execution framework on Casper",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div id="root" />
        <ContextComp>
          <CasperProvider>{children}</CasperProvider>
        </ContextComp>
      </body>
    </html>
  );
}
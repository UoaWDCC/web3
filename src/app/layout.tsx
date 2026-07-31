import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Web3Provider } from "@/components/web3-provider";
import { ThemeInitScript } from "@/components/theme-init-script";

export const metadata: Metadata = {
  title: "WEB3UOA - University of Auckland Web3 Club",
  description: "Educating the next generation of blockchain innovators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen text-foreground antialiased"
        suppressHydrationWarning
      >
        <ThemeInitScript />
        <Web3Provider>
          <Navbar />
          {children}
          <Footer />
        </Web3Provider>
      </body>
    </html>
  );
}

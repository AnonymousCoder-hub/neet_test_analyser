import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { DisableContextMenu } from "@/components/disable-context-menu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEET Test Analyzer",
  description: "Comprehensive NEET test analysis tool with detailed performance tracking across Physics, Chemistry, Botany, and Zoology.",
  keywords: ["NEET", "Test Analyzer", "Education", "Exam Analysis", "Physics", "Chemistry", "Biology"],
  authors: [{ name: "NEET Test Analyzer" }],
  openGraph: {
    title: "NEET Test Analyzer",
    description: "Comprehensive NEET test analysis tool",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEET Test Analyzer",
    description: "Comprehensive NEET test analysis tool",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DisableContextMenu />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

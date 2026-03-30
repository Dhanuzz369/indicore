import type { Metadata } from "next";
import { Inter, Bebas_Neue, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Indicore | UPSC & PSC Prelims Practice",
  description:
    "Practice UPSC and State PSC previous year questions with instant answers and detailed explanations",
  openGraph: {
    title: "Indicore | UPSC & PSC Prelims Practice",
    description:
      "Practice UPSC and State PSC previous year questions with instant answers and detailed explanations",
    type: "website",
    locale: "en_IN",
    siteName: "Indicore",
  },
  twitter: {
    card: "summary_large_image",
    title: "Indicore | UPSC & PSC Prelims Practice",
    description:
      "Practice UPSC and State PSC previous year questions with instant answers and detailed explanations",
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
        className={`${inter.variable} ${bebasNeue.variable} ${jetbrainsMono.variable} ${inter.className} bg-background text-foreground antialiased`}
      >
        <PostHogProvider>
          <ThemeProvider>
            <QueryProvider>
              {children}
              <Toaster position="top-center" richColors />
              <Analytics />
            </QueryProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}

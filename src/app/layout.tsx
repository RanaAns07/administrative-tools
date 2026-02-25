import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lahore Leads University | Gulshan Ravi Campus",
  description: "Administrative Tools and Student Portal for Lahore Leads University, Gulshan Ravi Campus.",
  openGraph: {
    title: "Lahore Leads University | Gulshan Ravi Campus",
    description: "Administrative Tools and Student Portal",
    url: "https://www.leadsgulshanravi.com.pk",
    siteName: "Lahore Leads University",
    images: [
      {
        url: "/Logo.png",
        width: 800,
        height: 600,
        alt: "Lahore Leads University Logo",
      },
    ],
    locale: "en_PK",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

/* ---------------------------------------------------------------------------
   FONTS — next/font/google downloads them at build time and injects the CSS
   variables that src/app/globals.css references in the @theme block:
     --font-inter           -> font-sans     (body / UI)
     --font-space-grotesk   -> font-display  (headings / brand)
     --font-jetbrains-mono  -> font-mono     (JSON output)
   --------------------------------------------------------------------------- */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

/* ---------------------------------------------------------------------------
   METADATA
   --------------------------------------------------------------------------- */
export const metadata: Metadata = {
  // metadataBase lets Next turn relative image paths ("/og-image.png") into
  // absolute URLs for social cards. NEXT_PUBLIC_SITE_URL is set on Vercel in
  // Step 6; locally it falls back to the dev server.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),

  applicationName: "test-engine",
  title: {
    default: "test-engine — Dummy JSON Generator | Hizaki Labs",
    template: "%s | test-engine",
  },
  description:
    "Generate schema-accurate dummy JSON arrays from plain English descriptions. Powered by the Groq API and the Qwen3-32B model. A Hizaki Labs project.",
  keywords: [
    "test-engine",
    "dummy data",
    "mock data",
    "JSON generator",
    "fake data",
    "schema generator",
    "Groq",
    "Qwen3-32B",
    "Hizaki Labs",
  ],
  authors: [
    {
      name: "Hizaki Labs",
      url: "https://hizakilabs.com",
    },
  ],
  creator: "Hizaki Labs",
  publisher: "Hizaki Labs",
  category: "technology",
  robots: {
    index: true,
    follow: true,
  },

  /* --- Icons: the files from public/ (Step 3.1) --- */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "test-engine",
  },

  /* --- Social cards --- */
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "test-engine",
    title: "test-engine — Dummy JSON Generator",
    description:
      "Describe the data you need in plain English and get a schema-accurate JSON array back. Powered by Groq (Qwen3-32B). Built by Hizaki Labs.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "test-engine by Hizaki Labs — dummy JSON from plain English",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "test-engine — Dummy JSON Generator",
    description:
      "Plain English in, schema-accurate JSON arrays out. Powered by Groq (Qwen3-32B). Built by Hizaki Labs.",
    images: ["/og-image.png"],
    creator: "@asura_java",
  },
};

/* ---------------------------------------------------------------------------
   VIEWPORT
   --------------------------------------------------------------------------- */
export const viewport: Viewport = {
  themeColor: "#05070f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/* ---------------------------------------------------------------------------
   ROOT LAYOUT
   --------------------------------------------------------------------------- */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tagentdecker – Regionale Abenteuer",
  description: "Entdecke deine Region neu mit automatisch kuratierten Micro-Abenteuern in Schweinfurt.",
};

function Header() {
  return (
    <header className="bg-white border-b border-zinc-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-black hover:text-zinc-700 transition-colors">
            Tagentdecker
          </Link>

          {/* Navigation */}
          <nav className="flex gap-6 text-sm">
            <Link
              href="/heute-raus"
              className="text-zinc-700 hover:text-black transition-colors font-medium"
            >
              Heute raus
            </Link>
            <Link
              href="/poi-einreichen"
              className="text-zinc-700 hover:text-black transition-colors font-medium"
            >
              POI einreichen
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-zinc-50 border-t border-zinc-200 mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-sm text-zinc-600 mb-4">
          Tagentdecker – Regionale Abenteuer neu gedacht
        </p>
        <div className="flex justify-center gap-6 text-xs text-zinc-500">
          <a href="#" className="hover:text-black transition-colors">
            Impressum
          </a>
          <span className="text-zinc-300">•</span>
          <a href="#" className="hover:text-black transition-colors">
            Datenschutz
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 text-black`}
      >
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const boot = `(function(){try{var t=localStorage.getItem("duolio-theme");var dark=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark)document.documentElement.classList.add("dark");var l=localStorage.getItem("duolio-locale");document.documentElement.lang=l==="en"?"en":"tr";}catch(e){document.documentElement.lang="tr";}})();`;

export const metadata: Metadata = {
  title: "Duolio",
  description: "İki oyuncu. Bir oda. Sonsuz eğlence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-dvh font-sans">
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

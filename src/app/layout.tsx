import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gym-Micro",
  description: "Mobile-first workout and nutrition tracking MVP",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "dark" ? "dark" : "light";

  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <body className={`${bricolage.variable} ${spaceGrotesk.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

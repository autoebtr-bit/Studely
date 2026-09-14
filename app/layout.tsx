import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Studely — Entraîne-toi aux khôlles de prépa",
    // Les écrans internes s'affichent « Planning · Studely ». La landing, elle,
    // pose son titre complet avec `title.absolute` pour échapper au gabarit.
    template: "%s · Studely",
  },
  description:
    "Passe une colle blanche avant la vraie : un examinateur t'interroge à l'oral sur ton programme de khôlle, t'interrompt et te note sur 20.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
};

export const viewport: Viewport = {
  themeColor: "#FF5733",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Le micro est requis par la Colle orale (SpeechRecognition).
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];

const nextConfig = {
  reactStrictMode: true,

  /*
   * Dossier de build isolable.
   *
   * Les tests E2E buildent dans `.next-e2e` : sans cela, `npm run test:e2e`
   * écraserait le `.next` d'un `next start` en cours, qui continuerait alors de
   * servir du HTML référençant des chunks supprimés — le navigateur afficherait
   * « Application error » sur une application pourtant saine.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;

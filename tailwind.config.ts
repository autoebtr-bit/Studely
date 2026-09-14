import type { Config } from "tailwindcss";

/**
 * Design system Studely.
 *
 * Identité : fond crème, dégradé « sunset » orange → rose → violet.
 * Ces tokens sont partagés par la landing ET l'application : le dashboard doit
 * être visuellement indissociable de la page d'accueil.
 *
 * Les composants existants utilisent `brand-*`, `accent-*`, `ink-*` et
 * `surface-*` : changer les valeurs ici re-thème l'application entière sans
 * toucher au JSX.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /** Fond crème de la marque. */
        cream: {
          50: "#FAF8F5",
          100: "#F5F2EC",
          200: "#EBE5DA",
          300: "#DED5C6",
        },
        /** Extrémité chaude du dégradé sunset. Couleur d'action principale. */
        brand: {
          50: "#FFF3F0",
          100: "#FFE4DD",
          200: "#FFC7BA",
          300: "#FFA28C",
          400: "#FF7C5E",
          500: "#FF5733",
          600: "#F0442B",
          700: "#C7331F",
          800: "#9E2A1B",
          900: "#7A2114",
        },
        /** Extrémité froide du dégradé sunset. Accents et données. */
        accent: {
          50: "#F5EDFF",
          100: "#EBDBFF",
          200: "#D6B8FF",
          300: "#BC8CFF",
          400: "#A05CFF",
          500: "#8A2BE2",
          600: "#7000FF",
          700: "#5A00CC",
          800: "#46009E",
          900: "#2F006B",
        },
        /** Rose du milieu du dégradé, pour les liens et micro-accents. */
        blush: {
          400: "#F4638F",
          500: "#E83E8C",
          600: "#D81B60",
        },
        /** Surfaces sombres : sidebar, pied de page. Prune profond. */
        ink: {
          600: "#4A3A5C",
          700: "#33253F",
          800: "#221830",
          900: "#170F21",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#FAF8F5",
          sunken: "#F5F2EC",
        },
      },
      borderRadius: {
        card: "1.5rem",
        tile: "1rem",
        pill: "9999px",
      },
      fontFamily: {
        // `--font-jakarta` est fournie par next/font (voir app/layout.tsx),
        // ce qui évite un appel réseau bloquant vers Google Fonts.
        sans: ["var(--font-jakarta)", '"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(35,20,50,0.04), 0 12px 32px -18px rgba(35,20,50,0.18)",
        lift: "0 20px 45px -20px rgba(240,68,43,0.45)",
        glow: "0 24px 60px -22px rgba(112,0,255,0.35)",
        fab: "0 14px 34px -10px rgba(240,68,43,0.55)",
        glass:
          "0 20px 40px -15px rgba(112,0,255,0.08), inset 0 0 1px 1px rgba(255,255,255,0.8)",
      },
      keyframes: {
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-8px) rotate(1deg)" },
        },
        floatReverse: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(8px) rotate(-1deg)" },
        },
        /** Rotation lente de l'orbe du hero. */
        orbDrift: {
          "0%, 100%": { transform: "translate(-50%, -50%) scale(1) rotate(0deg)" },
          "50%": { transform: "translate(-50%, -52%) scale(1.04) rotate(8deg)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        /** Déplace le dégradé du CTA au survol. */
        gradientPan: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        /** Onde émise au clic sur le CTA. */
        ripple: {
          from: { transform: "scale(0)", opacity: "0.5" },
          to: { transform: "scale(2.6)", opacity: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "xp-rise": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.95)" },
          "15%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "80%": { opacity: "1", transform: "translateY(-10px) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-22px) scale(0.97)" },
        },
        /** Halo pulsé autour d'une pastille de statut. */
        haloPulse: {
          "0%": { boxShadow: "0 0 0 0 rgba(255,87,51,0.5)" },
          "70%": { boxShadow: "0 0 0 8px rgba(255,87,51,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(255,87,51,0)" },
        },
      },
      animation: {
        "float-slow": "floatSlow 6s ease-in-out infinite",
        "float-reverse": "floatReverse 7s ease-in-out infinite",
        "orb-drift": "orbDrift 14s ease-in-out infinite",
        "fade-up": "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fadeIn 0.6s ease-out both",
        ripple: "ripple 0.6s ease-out forwards",
        shimmer: "shimmer 1.6s infinite",
        "xp-rise": "xp-rise 2.2s ease-out forwards",
        "halo-pulse": "haloPulse 2s ease-out infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;

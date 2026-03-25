import type { Config } from "tailwindcss";

export default {
    content: [
        "./index.html",
        "./src/**/*.{ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: "#eef2ff",
                    100: "#e0e7ff",
                    200: "#c7d2fe",
                    300: "#a5b4fc",
                    400: "#818cf8",
                    500: "#6366f1",
                    600: "#4f46e5",
                    700: "#4338ca",
                    800: "#3730a3",
                    900: "#312e81",
                },
            },
            fontFamily: {
                sans: ["Inter", "Inter Fallback", "ui-sans-serif", "system-ui", "sans-serif"],
                display: ["Inter", "Inter Fallback", "ui-sans-serif", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "JetBrains Mono Fallback", "ui-monospace", "monospace"],
            },
            boxShadow: {
                card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
                "card-hover": "0 4px 16px -2px rgb(0 0 0 / 0.1), 0 2px 6px -2px rgb(0 0 0 / 0.06)",
            },
        },
    },
    plugins: [],
} satisfies Config;

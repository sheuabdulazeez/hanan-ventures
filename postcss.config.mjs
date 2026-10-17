import tailwindcss from "@tailwindcss/postcss";
import transformFallback from "./postcss-transform-fallback.mjs";

export default {
  plugins: [tailwindcss(), transformFallback()],
}

// The site, built with Astro. See ASTRO.md.
// The pages are still made by tools/build.mjs and assets/render.js from the data files
// (gathered by .github/scripts/assemble.sh, as before),
// so Artiscope Digital Home edits and previews the site exactly as before. Astro adds the
// checks on the content, a local copy that reloads as you edit, and smoother page changes.
import path from "node:path";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { buildSite } from "./src/lib/site.mjs";

// Builds the pages before Astro starts, and again whenever a data file or asset changes
// while the local copy is running.
function sitePages() {
  return {
    name: "site-pages",
    hooks: {
      "astro:config:setup": () => buildSite(),
      "astro:server:setup": ({ server }) => {
        server.watcher.add([path.resolve("data"), path.resolve("assets")]);
        // the build itself rewrites a few files in assets/, so changes just after a build are ignored
        let quietUntil = 0;
        server.watcher.on("change", (file) => {
          if (!/[\\/](data|assets)[\\/]/.test(file) || Date.now() < quietUntil) return;
          try { buildSite(); server.ws.send({ type: "full-reload" }); } catch (e) { console.error(e.message); }
          quietUntil = Date.now() + 2000;
        });
      },
    },
  };
}

export default defineConfig({
  trailingSlash: "always",
  build: { format: "directory" },
  outDir: "_site",
  integrations: [sitePages(), react()],
  devToolbar: { enabled: false },
});

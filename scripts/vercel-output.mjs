// Packages the Expo web export (dist/) in Vercel's Build Output API v3 format.
// When a build produces .vercel/output, Vercel deploys it directly and ignores the
// project's "Output Directory" setting, so dashboard settings can't break the deploy.
// Docs: https://vercel.com/docs/build-output-api/v3
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const out = ".vercel/output";
if (!existsSync("dist/index.html")) {
  console.error("dist/index.html not found. Run `expo export --platform web` first.");
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync("dist", `${out}/static`, { recursive: true });
writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Serve real files (JS, CSS, images) first…
        { handle: "filesystem" },
        // …then send every other path to the single-page app.
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);
console.log(`Wrote ${out} (static files + SPA routing).`);

import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("ticket-app");
const serverUrl = alchemy.env.VITE_SERVER_URL ?? process.env.VITE_SERVER_URL;

if (!serverUrl) {
  throw new Error("VITE_SERVER_URL is required. Set it to the Cloud Run API URL.");
}

export const web = await Vite("web", {
  cwd: "../../apps/web",
  assets: "dist",
  bindings: {
    VITE_SERVER_URL: serverUrl,
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${serverUrl}`);

await app.finalize();

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] = process.env[key] || value;
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const bucket = "checkray-videos";
const localFile = process.argv[2] || "public/videos/checkray-phone.mp4";
const remotePath =
  process.argv[3] || `hero/checkray-phone-${Date.now()}.mp4`;

if (!fs.existsSync(localFile)) {
  throw new Error(`Local file not found: ${localFile}`);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const fileBuffer = fs.readFileSync(localFile);

console.log(`Uploading ${localFile}`);
console.log(`To bucket: ${bucket}`);
console.log(`Remote path: ${remotePath}`);

const { error } = await supabase.storage.from(bucket).upload(remotePath, fileBuffer, {
  contentType: "video/mp4",
  upsert: true,
});

if (error) {
  console.error("Upload failed:", error);
  process.exit(1);
}

const { data } = supabase.storage.from(bucket).getPublicUrl(remotePath);

console.log("\nUpload successful.");
console.log("Public URL:");
console.log(data.publicUrl);

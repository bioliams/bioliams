import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Attachment bytes live behind this interface so the app can run both
 * self-hosted (local disk) and on serverless platforms with a read-only
 * filesystem (Supabase Storage).
 */
export interface StorageBackend {
  readonly name: string;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  remove(key: string): Promise<void>;
}

class LocalStorage implements StorageBackend {
  readonly name = "local";

  private root() {
    return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");
  }

  /** Resolve a key to an absolute path, refusing anything that escapes the root. */
  private resolve(key: string) {
    const root = this.root();
    const full = path.resolve(root, key);
    if (full !== root && !full.startsWith(root + path.sep)) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async put(key: string, bytes: Uint8Array) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
  }

  async get(key: string) {
    return new Uint8Array(await readFile(this.resolve(key)));
  }

  async remove(key: string) {
    await unlink(this.resolve(key)).catch(() => {});
  }
}

class SupabaseStorage implements StorageBackend {
  readonly name = "supabase";

  constructor(
    private readonly url: string,
    private readonly serviceKey: string,
    private readonly bucket: string
  ) {}

  private endpoint(key: string) {
    return `${this.url.replace(/\/$/, "")}/storage/v1/object/${this.bucket}/${key}`;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.serviceKey}`,
      apikey: this.serviceKey,
    };
  }

  async put(key: string, bytes: Uint8Array, contentType: string) {
    const res = await fetch(this.endpoint(key), {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": contentType, "x-upsert": "true" },
      body: bytes as BodyInit,
    });
    if (!res.ok) {
      throw new Error(`Supabase Storage upload failed (${res.status}): ${await res.text()}`);
    }
  }

  async get(key: string) {
    const res = await fetch(this.endpoint(key), { headers: this.headers() });
    if (!res.ok) throw new Error(`Supabase Storage download failed (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async remove(key: string) {
    await fetch(this.endpoint(key), { method: "DELETE", headers: this.headers() });
  }
}

let cached: StorageBackend | null = null;

/**
 * Supabase Storage when credentials are configured, local disk otherwise.
 * Serverless filesystems are ephemeral, so a cloud deployment must set the
 * SUPABASE_* variables for attachments to survive.
 */
export function getStorage(): StorageBackend {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "attachments";

  cached =
    url && serviceKey ? new SupabaseStorage(url, serviceKey, bucket) : new LocalStorage();
  return cached;
}

/** True when the platform has no persistent local disk and no cloud storage set. */
export function storageIsEphemeral() {
  return getStorage().name === "local" && Boolean(process.env.VERCEL);
}

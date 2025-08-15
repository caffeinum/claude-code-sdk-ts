/* eslint-disable @typescript-eslint/no-namespace */
import fs from "fs/promises";
import type { AuthInfo, AuthStorage } from "./storage";

export class AuthFileStorage implements AuthStorage {
  filepath: string;

  constructor(filepath: string) {
    this.filepath = filepath;
  }

  async get(providerID: string) {
    const file = Bun.file(this.filepath);
    return file
      .json()
      .catch(() => ({}))
      .then((x) => x[providerID] as AuthInfo | undefined);
  }

  async all(): Promise<Record<string, AuthInfo>> {
    const file = Bun.file(this.filepath);
    return file.json().catch(() => ({}));
  }

  async set(key: string, info: AuthInfo) {
    const file = Bun.file(this.filepath);
    const data = await this.all();
    await Bun.write(file, JSON.stringify({ ...data, [key]: info }, null, 2));
    await fs.chmod(file.name!, 0o600);
  }

  async remove(key: string) {
    const file = Bun.file(this.filepath);
    const data = await this.all();
    delete data[key];
    await Bun.write(file, JSON.stringify(data, null, 2));
    await fs.chmod(file.name!, 0o600);
  }
}

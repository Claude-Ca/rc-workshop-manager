import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteInventoryRepository, validateInventoryDatabase } from "../../../../packages/infrastructure/src/index.js";

describe("validateInventoryDatabase", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "rc-workshop-import-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("accepts a database initialized with the RC Workshop schema", () => {
    const path = join(directory, "valid.sqlite");
    const repository = new SqliteInventoryRepository(path);
    repository.close();

    expect(() => validateInventoryDatabase(path)).not.toThrow();
  });

  it("rejects an empty SQLite file instead of treating it as a new inventory", async () => {
    const path = join(directory, "empty.sqlite");
    await writeFile(path, new Uint8Array());

    expect(() => validateInventoryDatabase(path)).toThrow(/Fichier incompatible avec un inventaire RC Workshop/);
  });

  it("rejects a file that is not a SQLite database", async () => {
    const path = join(directory, "not-a-database.sqlite");
    await writeFile(path, "ceci n’est pas une base SQLite", "utf8");

    expect(() => validateInventoryDatabase(path)).toThrow(/Fichier incompatible avec un inventaire RC Workshop/);
  });
});

#!/usr/bin/env node
// PostgreSQL lokal khusus proyek ini: data di .data/pg, port 54329, hanya localhost.
// Pemakaian: node scripts/db-lokal.mjs <init|start|stop|status>
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DATA_DIR = join(ROOT, ".data", "pg");
const LOG_FILE = join(ROOT, ".data", "pg.log");
const PASSWORD_FILE = join(ROOT, ".data", "pg-password");
const ENV_FILE = join(ROOT, ".env");
const PORT = Number(process.env.PG_PORT_LOKAL ?? 54329);
const USER = "postgres";
const DATABASES = { DATABASE_URL: "lockerpintar", DATABASE_URL_TEST: "lockerpintar_test" };
const EXE = process.platform === "win32" ? ".exe" : "";

function cariFolderBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["pg_ctl"], { encoding: "utf8" });
  if (which.status === 0 && which.stdout.trim()) return dirname(which.stdout.split(/\r?\n/)[0].trim());
  if (process.platform === "win32") {
    const base = "C:\\Program Files\\PostgreSQL";
    if (existsSync(base)) {
      const versi = readdirSync(base)
        .filter((v) => existsSync(join(base, v, "bin", "pg_ctl.exe")))
        .sort((a, b) => Number(b) - Number(a));
      if (versi.length) return join(base, versi[0], "bin");
    }
  }
  throw new Error(
    "Binary PostgreSQL tidak ditemukan. Set PG_BIN ke folder bin PostgreSQL, atau jalankan database lewat Docker (docker compose up -d).",
  );
}

const BIN = cariFolderBin();
const bin = (nama) => join(BIN, nama + EXE);

function bacaPassword() {
  return existsSync(PASSWORD_FILE) ? readFileSync(PASSWORD_FILE, "utf8").trim() : null;
}

function jalankan(nama, args) {
  const hasil = spawnSync(bin(nama), args, {
    encoding: "utf8",
    env: { ...process.env, PGPASSWORD: bacaPassword() ?? "" },
  });
  if (hasil.error) throw hasil.error;
  return hasil;
}

function urlDatabase(password, db) {
  return `postgresql://${USER}:${password}@localhost:${PORT}/${db}`;
}

function tulisEnv(password) {
  let isi = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  for (const [kunci, db] of Object.entries(DATABASES)) {
    const baris = `${kunci}="${urlDatabase(password, db)}"`;
    const pola = new RegExp(`^${kunci}=.*$`, "m");
    const lama = isi.match(pola)?.[0];
    if (!lama) {
      isi += (isi && !isi.endsWith("\n") ? "\n" : "") + baris + "\n";
    } else if (lama.includes(`localhost:${PORT}/`)) {
      isi = isi.replace(pola, baris);
    } else {
      console.log(`- ${kunci} di .env sudah diatur ke database lain, tidak diubah.`);
    }
  }
  writeFileSync(ENV_FILE, isi);
}

function init() {
  if (existsSync(join(DATA_DIR, "PG_VERSION"))) {
    const password = bacaPassword();
    if (password) tulisEnv(password);
    return;
  }
  mkdirSync(dirname(DATA_DIR), { recursive: true });
  const password = randomBytes(18).toString("hex");
  const pwFile = join(tmpdir(), `lp-pw-${process.pid}`);
  writeFileSync(pwFile, password);
  try {
    const hasil = jalankan("initdb", [
      "-D", DATA_DIR,
      "-U", USER,
      "--auth=scram-sha-256",
      `--pwfile=${pwFile}`,
      "--encoding=UTF8",
      "--no-locale",
    ]);
    if (hasil.status !== 0) {
      rmSync(DATA_DIR, { recursive: true, force: true });
      throw new Error(`initdb gagal:\n${hasil.stderr || hasil.stdout}`);
    }
  } finally {
    rmSync(pwFile, { force: true });
  }
  writeFileSync(PASSWORD_FILE, password);
  tulisEnv(password);
  console.log("- Cluster PostgreSQL dibuat di .data/pg; DATABASE_URL ditulis ke .env");
}

function sedangJalan() {
  return jalankan("pg_ctl", ["-D", DATA_DIR, "status"]).status === 0;
}

function buatDatabase() {
  for (const db of Object.values(DATABASES)) {
    const cek = jalankan("psql", [
      "-h", "localhost", "-p", String(PORT), "-U", USER, "-d", "postgres", "-tAc",
      `SELECT 1 FROM pg_database WHERE datname = '${db}'`,
    ]);
    if (cek.status !== 0) throw new Error(`psql gagal:\n${cek.stderr}`);
    if (cek.stdout.trim() === "1") continue;
    const buat = jalankan("createdb", ["-h", "localhost", "-p", String(PORT), "-U", USER, db]);
    if (buat.status !== 0) throw new Error(`createdb ${db} gagal:\n${buat.stderr}`);
    console.log(`- Database ${db} dibuat`);
  }
}

function start() {
  init();
  if (sedangJalan()) {
    console.log(`- PostgreSQL sudah berjalan di port ${PORT}`);
  } else {
    const hasil = jalankan("pg_ctl", [
      "-D", DATA_DIR,
      "-l", LOG_FILE,
      "-o", `-p ${PORT} -c listen_addresses=localhost`,
      "-w",
      "start",
    ]);
    if (hasil.status !== 0) throw new Error(`pg_ctl start gagal (lihat .data/pg.log):\n${hasil.stderr || hasil.stdout}`);
    console.log(`- PostgreSQL berjalan di localhost:${PORT}`);
  }
  buatDatabase();
}

function stop() {
  if (!sedangJalan()) return console.log("- PostgreSQL tidak sedang berjalan");
  const hasil = jalankan("pg_ctl", ["-D", DATA_DIR, "-m", "fast", "-w", "stop"]);
  if (hasil.status !== 0) throw new Error(`pg_ctl stop gagal:\n${hasil.stderr || hasil.stdout}`);
  console.log("- PostgreSQL dihentikan");
}

const perintah = process.argv[2];
try {
  if (perintah === "init") init();
  else if (perintah === "start") start();
  else if (perintah === "stop") stop();
  else if (perintah === "status") console.log(sedangJalan() ? `berjalan (port ${PORT})` : "berhenti");
  else {
    console.log("Pemakaian: node scripts/db-lokal.mjs <init|start|stop|status>");
    process.exitCode = 1;
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}

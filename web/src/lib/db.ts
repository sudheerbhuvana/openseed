import fs from "node:fs";
import path from "node:path";
// @ts-ignore - node:sqlite is built into Node.js 22.5+, available in runtime Node 24
import { DatabaseSync } from "node:sqlite";

export interface DistroImageRecord {
  id: string;
  name: string;
  version: string;
  architecture: "x86_64" | "amd64" | "arm64";
  releaseDate: string;
  fileName: string;
  checksumType: "SHA-256";
  checksumValue: string;
  checksumFileUrl: string;
  gpgSignatureUrl?: string;
  releaseNotesUrl: string;
  installGuideUrl: string;
  upstreamUrl: string;
  bitTorrentInfoHash?: string;
  lastSyncedAt: string;
  isDynamicUpstream: boolean;
}

export interface SyncLogRecord {
  id?: number;
  distroId: string;
  status: "success" | "error" | "warning" | "info";
  eventType?: "auto_add" | "prune" | "checksum_sync" | "manual_add" | "safety_valve" | "general";
  message: string;
  createdAt: string;
}

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  let dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir) && fs.existsSync(path.join(process.cwd(), "openseed", "web", "data"))) {
    dataDir = path.join(process.cwd(), "openseed", "web", "data");
  } else if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "openseed.db");
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");

  // Initialize Schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS distro_images (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      architecture TEXT NOT NULL,
      release_date TEXT,
      file_name TEXT NOT NULL,
      checksum_type TEXT DEFAULT 'SHA-256',
      checksum_value TEXT,
      checksum_file_url TEXT,
      gpg_signature_url TEXT,
      release_notes_url TEXT,
      install_guide_url TEXT,
      upstream_url TEXT,
      bittorrent_info_hash TEXT,
      last_synced_at TEXT,
      is_dynamic_upstream INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      distro_id TEXT,
      status TEXT,
      event_type TEXT DEFAULT 'general',
      message TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cluster_metrics (
      key TEXT PRIMARY KEY,
      value_num REAL,
      value_text TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS torrent_upload_history (
      hash TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      highest_uploaded_bytes INTEGER NOT NULL DEFAULT 0,
      last_seen_uploaded_bytes INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS node_stats_snapshot (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      summary_json TEXT NOT NULL,
      torrents_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cluster_metrics (
      key TEXT PRIMARY KEY,
      value_num REAL,
      value_text TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS torrent_upload_history (
      hash TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      highest_uploaded_bytes INTEGER NOT NULL DEFAULT 0,
      last_seen_uploaded_bytes INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS node_stats_snapshot (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      summary_json TEXT NOT NULL,
      torrents_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  try {
    db.exec("ALTER TABLE sync_logs ADD COLUMN event_type TEXT DEFAULT 'general'");
  } catch {
    // Column already exists
  }

  dbInstance = db;
  return db;
}

export function getDistroImage(id: string): DistroImageRecord | null {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM distro_images WHERE id = ?");
  const row = stmt.get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    version: row.version,
    architecture: row.architecture,
    releaseDate: row.release_date || "",
    fileName: row.file_name,
    checksumType: row.checksum_type || "SHA-256",
    checksumValue: row.checksum_value || "",
    checksumFileUrl: row.checksum_file_url || "",
    gpgSignatureUrl: row.gpg_signature_url || undefined,
    releaseNotesUrl: row.release_notes_url || "",
    installGuideUrl: row.install_guide_url || "",
    upstreamUrl: row.upstream_url || "",
    bitTorrentInfoHash: row.bittorrent_info_hash || undefined,
    lastSyncedAt: row.last_synced_at || new Date().toISOString(),
    isDynamicUpstream: Boolean(row.is_dynamic_upstream),
  };
}

export function getAllDistroImages(): DistroImageRecord[] {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM distro_images ORDER BY name ASC");
  const rows = stmt.all() as any[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    version: row.version,
    architecture: row.architecture,
    releaseDate: row.release_date || "",
    fileName: row.file_name,
    checksumType: row.checksum_type || "SHA-256",
    checksumValue: row.checksum_value || "",
    checksumFileUrl: row.checksum_file_url || "",
    gpgSignatureUrl: row.gpg_signature_url || undefined,
    releaseNotesUrl: row.release_notes_url || "",
    installGuideUrl: row.install_guide_url || "",
    upstreamUrl: row.upstream_url || "",
    bitTorrentInfoHash: row.bittorrent_info_hash || undefined,
    lastSyncedAt: row.last_synced_at || new Date().toISOString(),
    isDynamicUpstream: Boolean(row.is_dynamic_upstream),
  }));
}

export function upsertDistroImage(record: DistroImageRecord): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO distro_images (
      id, name, version, architecture, release_date, file_name,
      checksum_type, checksum_value, checksum_file_url, gpg_signature_url,
      release_notes_url, install_guide_url, upstream_url, bittorrent_info_hash,
      last_synced_at, is_dynamic_upstream
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      version = excluded.version,
      architecture = excluded.architecture,
      release_date = excluded.release_date,
      file_name = excluded.file_name,
      checksum_type = excluded.checksum_type,
      checksum_value = excluded.checksum_value,
      checksum_file_url = excluded.checksum_file_url,
      gpg_signature_url = excluded.gpg_signature_url,
      release_notes_url = excluded.release_notes_url,
      install_guide_url = excluded.install_guide_url,
      upstream_url = excluded.upstream_url,
      bittorrent_info_hash = excluded.bittorrent_info_hash,
      last_synced_at = excluded.last_synced_at,
      is_dynamic_upstream = excluded.is_dynamic_upstream
  `);

  stmt.run(
    record.id,
    record.name,
    record.version,
    record.architecture,
    record.releaseDate,
    record.fileName,
    record.checksumType,
    record.checksumValue,
    record.checksumFileUrl,
    record.gpgSignatureUrl || null,
    record.releaseNotesUrl,
    record.installGuideUrl,
    record.upstreamUrl,
    record.bitTorrentInfoHash || null,
    record.lastSyncedAt,
    record.isDynamicUpstream ? 1 : 0
  );
}

export function logSync(
  distroId: string,
  status: "success" | "error" | "warning" | "info",
  message: string,
  eventType: "auto_add" | "prune" | "checksum_sync" | "manual_add" | "safety_valve" | "general" = "general"
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO sync_logs (distro_id, status, event_type, message, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(distroId, status, eventType, message, new Date().toISOString());
}

export function getSyncLogs(limit: number = 50, eventType?: string): SyncLogRecord[] {
  const db = getDatabase();
  let stmt;
  let rows: any[];
  if (eventType && eventType !== "all") {
    stmt = db.prepare(`
      SELECT * FROM sync_logs WHERE event_type = ? ORDER BY id DESC LIMIT ?
    `);
    rows = stmt.all(eventType, limit) as any[];
  } else {
    stmt = db.prepare(`
      SELECT * FROM sync_logs ORDER BY id DESC LIMIT ?
    `);
    rows = stmt.all(limit) as any[];
  }

  return rows.map((row) => ({
    id: row.id,
    distroId: row.distro_id,
    status: row.status,
    eventType: row.event_type || "general",
    message: row.message,
    createdAt: row.created_at,
  }));
}

/**
 * Tracks OpenSeed distribution torrents upload history in SQLite.
 * For each torrent, it records Math.max(previous_highest, t.uploaded).
 * 
 * Even if:
 * 1. A torrent is restarted or rechecked and temporarily reports 0/session upload
 * 2. An older torrent is pruned or deleted to make room for newer releases
 * 
 * The uploaded bandwidth that OpenSeed donated is PRESERVED forever and can NEVER decrease.
 * It strictly tracks OpenSeed distributions, completely excluding unrelated daemon traffic.
 */
export function syncTorrentUploadHistory(
  torrents: { hash: string; name: string; uploaded: number }[]
): {
  lifetimeUploadedBytes: number;
  activeUploadedBytes: number;
} {
  const db = getDatabase();
  const upsertStmt = db.prepare(`
    INSERT INTO torrent_upload_history (hash, name, highest_uploaded_bytes, last_seen_uploaded_bytes, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(hash) DO UPDATE SET
      name = excluded.name,
      highest_uploaded_bytes = MAX(torrent_upload_history.highest_uploaded_bytes, excluded.highest_uploaded_bytes),
      last_seen_uploaded_bytes = excluded.last_seen_uploaded_bytes,
      updated_at = excluded.updated_at
  `);

  const now = new Date().toISOString();
  let activeUploadedBytes = 0;

  for (const t of torrents) {
    const bytes = t.uploaded || 0;
    activeUploadedBytes += bytes;
    upsertStmt.run(t.hash, t.name, bytes, bytes, now);
  }

  const sumStmt = db.prepare("SELECT COALESCE(SUM(highest_uploaded_bytes), 0) AS total FROM torrent_upload_history");
  const row = sumStmt.get() as any;
  const lifetimeUploadedBytes = row?.total || activeUploadedBytes;

  return {
    lifetimeUploadedBytes,
    activeUploadedBytes,
  };
}

export function getLifetimeUpload(): number {
  const db = getDatabase();
  const sumStmt = db.prepare("SELECT COALESCE(SUM(highest_uploaded_bytes), 0) AS total FROM torrent_upload_history");
  const row = sumStmt.get() as any;
  return row?.total || 0;
}

export interface NodeStatsSnapshot {
  summary: any;
  torrents: any[];
  updatedAt: number;
}

export function getNodeStatsSnapshot(): NodeStatsSnapshot | null {
  try {
    const db = getDatabase();
    const row = db
      .prepare("SELECT summary_json, torrents_json, updated_at FROM node_stats_snapshot WHERE id = 1")
      .get() as any;
    if (!row) return null;
    return {
      summary: JSON.parse(row.summary_json),
      torrents: JSON.parse(row.torrents_json),
      updatedAt: Number(row.updated_at),
    };
  } catch (err) {
    console.warn("Failed to read node_stats_snapshot from SQLite:", err);
    return null;
  }
}

export function saveNodeStatsSnapshot(summary: any, torrents: any[]): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO node_stats_snapshot (id, summary_json, torrents_json, updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        summary_json = excluded.summary_json,
        torrents_json = excluded.torrents_json,
        updated_at = excluded.updated_at
    `);
    stmt.run(JSON.stringify(summary), JSON.stringify(torrents), Date.now());
  } catch (err) {
    console.warn("Failed to write node_stats_snapshot to SQLite:", err);
  }
}

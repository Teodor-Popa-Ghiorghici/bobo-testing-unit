/* Save — Phase 0 foundation. The single choke point over ctx.save/ctx.load.
   Two separate blobs, 'run' and 'meta', each wrapped as { version, data }
   and passed through a per-blob migration table keyed by the version it
   upgrades *from*. Corrupted or unreadable data returns a safe fallback
   instead of throwing, and the two blobs are loaded independently so a
   broken run save can never take meta down with it. */

const RUN_VERSION = 1;
const META_VERSION = 1;

/* Migration table: RUN_MIGRATIONS[v] upgrades data from version v to v+1.
   No migrations exist yet -- v1 is the first schema. */
const RUN_MIGRATIONS = {};
const META_MIGRATIONS = {};

function defaultMeta() {
  return { shakeEnabled: true, cleared: false, keymap: null };
}

function migrate(entry, migrations, targetVersion, fallback) {
  if (!entry || typeof entry !== 'object' || typeof entry.version !== 'number') return fallback;
  let version = entry.version;
  let data = entry.data;
  while (version < targetVersion) {
    const step = migrations[version];
    if (!step) return fallback; // unknown/unmigratable version -- don't guess
    data = step(data);
    version++;
  }
  return data === undefined ? fallback : data;
}

export function createSaveStore(ctx) {
  return {
    async loadRun() {
      try {
        const entry = await ctx.load('run');
        if (entry == null) return null;
        return migrate(entry, RUN_MIGRATIONS, RUN_VERSION, null);
      } catch (e) {
        return null;
      }
    },
    async saveRun(data) {
      await ctx.save('run', { version: RUN_VERSION, data });
    },
    async clearRun() {
      await ctx.save('run', null);
    },
    async loadMeta() {
      try {
        const entry = await ctx.load('meta');
        if (entry == null) return defaultMeta();
        return migrate(entry, META_MIGRATIONS, META_VERSION, defaultMeta());
      } catch (e) {
        return defaultMeta();
      }
    },
    async saveMeta(data) {
      await ctx.save('meta', { version: META_VERSION, data });
    }
  };
}

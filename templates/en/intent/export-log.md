# Export Log

> `/intent-export-cc-sdd` appends one row per export (1 export = 1 row). The only writer is `/intent-export-cc-sdd`; the readers are the intent-check script, `/intent-status`, and `/intent-writeback`. It is used to cross-check for missed write-backs, so no manual editing is needed.

| packet | exported_at | commit |
|---|---|---|

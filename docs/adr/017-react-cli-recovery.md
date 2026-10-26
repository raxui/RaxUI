# ADR 017: React CLI interrupted-install recovery

Status: Accepted. React only; implements #76 and extends ADR 006. .NET recovery stays in #11.

## Contract

The CLI plans installation before creating an exclusive project-local journal directory, .sheenui-react-transaction. Before each mutation it saves original bytes in a numbered, hash-verified backup and atomically persists a record of the target and intended output hash. Content is written to a synced staging file on the same project filesystem, then renamed into place. Deletions are journaled first. Config is written before the registry lock; the transaction commits only after a separate durable commit marker. A crash after the registry lock but before that marker still rolls back.

Each init/add invocation checks recovery before reading package/config/lock state. A live owner or existing recovery lock prevents another writer. Recovery validates the entire journal, backup hashes, project binding, target paths and existing links before restoring anything. It first compares current bytes with saved originals and intended outputs; a changed file blocks automatic rollback. Explicit recover --keep-changes retains conflicting files (including user deletions) and rolls back remaining transaction-owned paths. Changes are never inferred from timestamps. Cleanup removes only reserved journal files and empty directories whose filesystem identity and birth time still match the directory created by the transaction; it never recurses.

Rollback is replayable because already-restored original bytes are accepted. Once rollback is complete, a recovered marker lets cleanup resume without requiring deleted backups. A committed marker causes cleanup only, preserving installed files and later edits. An interrupted recovery leaves an exclusive recovery.lock; the operator must confirm recovery is stopped, remove only that lock, and retry. Missing/truncated journals and damaged backups block new installation and report the retained backup location.

## npm boundary

npm runs with --ignore-scripts. Before invoking it, package.json/package-lock.json originals and an external-operation marker are persisted. A normally returned invocation records the observed output bytes, allowing handled failures to restore the originals. A process interruption while npm is pending requires explicit reconciliation: npm may outlive its parent, so the CLI must not guess which package changes are its own. The operator stops any remaining npm process, reviews/copies backups and uses recover --keep-changes to retain package files and restore managed sources. node_modules is not transactionally restored; npm install reconciles it afterward.

## Limits

The journal is local recovery metadata, not an adversarial multiwriter filesystem lock. Stop editors/installers while recovery runs. Changed paths are identified by bytes, and an exact match to a known output is treated as transaction-owned. A PID reused by another process conservatively blocks recovery. Symlink/junction and hard-linked files are refused, even when they currently point inside the project. Moving a project across filesystem roots/runtimes requires manual inspection because the journal is bound to its original real project root.

Original backups should be copied before explicit conflict reconciliation: successful recovery removes the journal, including the conflicting originals. Unknown files in that directory are retained and block cleanup. A kill between creating a directory and recording its identity may leave an empty directory; uncertain ownership is preserved. Files and journals are fsynced, and parent directories are synced on platforms exposing that operation; Node does not expose directory fsync on Windows. Real process termination is tested; arbitrary power loss, disk corruption and hostile simultaneous path replacement are outside the guarantee.

## Verification

Node's built-in test runner executes real child CLI processes and kills them after actual filesystem operations through a test-only preload module. Production code exposes no crash flags. Tests cover init/add writes, config/lock/commit boundaries, deletion, torn staging/journal writes, interruption during rollback/cleanup, user modifications/deletions/directories, malformed metadata, damaged backups, link escapes, hard links, live owners and npm interruption/failure. The suite runs on Windows and native Ubuntu through WSL, and is included in npm run check plus the existing Windows/Linux CI React matrix. Consumer acceptance checks install the packed CLI in real Vite and Next.js apps.

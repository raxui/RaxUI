# ADR 018: Blazor CLI interrupted-install recovery

Status: Accepted. Blazor/.NET CLI only; implements #11, extends ADR 003 and ADR 016, and follows the React contract in ADR 017.

## Contract

`init`, `add` and `update` write through `FileTransaction`. The project-local journal directory, `.sheenui-transaction`, is created on the first change, so validation failures and dry runs leave nothing behind. Of two concurrent CLIs only one can create the initial journal (`CreateNew`, then a non-overwriting move). Before each change the CLI saves original bytes in a numbered, hash-verified backup and atomically persists the target and the intended output hash. Content is written to a flushed staging file inside the journal directory and renamed into place; deletions and created directories are journaled first. Configuration is written before the lock; the transaction commits only after a separate durable commit marker. A crash after the lock write but before that marker still rolls back.

Every `init`, `add` and `update` recovers before reading configuration or lock state; `update --dry-run` refuses instead, because it promises not to write. `sheenui recover [--keep-changes]` runs recovery explicitly. A live owner (process id and start time) or an existing `recovery.lock` blocks another writer. Recovery validates the journal, backup hashes, project root, target paths and links before restoring anything. A file whose bytes match neither its original nor a recorded output blocks automatic rollback; `--keep-changes` keeps those files (including user deletions) and rolls back the rest. Changes are identified by bytes, never by timestamps. Created directories are removed only when empty and, on Windows, when their creation time still matches the journal; recovery never deletes recursively.

Rollback can be replayed: files already restored are accepted. A recovered or committed phase lets cleanup resume without the deleted backups, and a committed phase never rolls back. An interrupted recovery leaves `recovery.lock`; confirm no recovery is running, remove only that file, and retry. A journal directory without a journal and without backups means the process stopped before its first project change, or while removing the last journal files, and is removed. Missing journals beside backups, damaged backups and unknown files block new installs and keep the backups.

A handled failure rolls back in-process. If that rollback cannot complete, the CLI reports it and keeps the journal for `sheenui recover`.

## Limits

The journal is local recovery metadata, not a lock against hostile concurrent writers; stop editors and other tools while recovery runs. A file whose bytes exactly match a recorded output is treated as the transaction's. Symbolic links and junctions on recovery paths are refused, even inside the project; .NET exposes no portable link count, so hard links are not detected, but restores replace files by rename and never write through them. Directory identity is the creation time on Windows; on Linux and macOS, where .NET exposes no inode and creation times change with directory contents, a created directory is removed whenever it is empty, even if it was replaced by another empty directory. .NET exposes no directory fsync, so a rename can be lost on power failure; process termination is the tested guarantee. Moving the project before recovery requires manual inspection because the journal is bound to its full path. Successful `--keep-changes` recovery removes the journal, including the replaced originals: copy any backup you need first. Renames retry briefly when antivirus, indexers or file watchers lock a file on Windows.

## Verification

`CrashRecoveryTests` runs the real CLI as a child process. A test-only startup hook (`DOTNET_STARTUP_HOOKS`) kills it right after an actual filesystem operation; the CLI has no crash switch. Tests cover init and add writes, the lock/commit boundary, crashes after the commit marker and during cleanup, interrupted rollback, user edits and new user files, damaged backups, traversing journals, a live owner, dry runs and option misuse. They run in the Windows and Linux CI matrix.

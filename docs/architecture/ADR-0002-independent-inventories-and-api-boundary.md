# Architecture decision: independent local inventories and future hosted API

Status: accepted for the next implementation increment  
Date: 2026-11-02

## Context

RC Workshop Manager currently starts one SQLite database automatically. The next product increment introduces independent inventories (for example, a personal workshop and a club inventory), simplifies the catalog taxonomy, and adds radio transmitters. The product may later serve model-aircraft clubs, but hosted multi-user operation is not part of the current scope.

## Decisions

### 1. Inventory files

- Each inventory is a separate SQLite database file.
- The user explicitly creates or opens an inventory through an inventory manager.
- The active inventory name is visible in the application shell.
- Switching inventory closes the current repository before opening another.
- Creating an inventory never deletes or overwrites an existing inventory.
- Existing user data must be backed up before any migration or reset. Tests use temporary databases.
- No password, encryption, cloud sync, accounts, or roles in this increment.

### 2. Persistence boundary and API

- Renderer UI must not access SQLite or filesystem paths directly.
- The renderer calls a typed desktop API through the existing Electron preload/IPC boundary.
- Business rules remain in `packages/core`.
- SQLite remains an infrastructure implementation behind the `InventoryRepository` contract.
- Inventory lifecycle operations (list/create/open/close) are separate from catalog and stock operations.
- A future hosted version may add an HTTP transport and server-side authentication/session/authorization. This is an architectural direction, not a claim that the local IPC API is already a network API.
- Avoid Electron-specific dependencies in the core package.

### 3. Catalog taxonomy

The seven top-level categories are:
- Aircraft
- Motorization
- Radio
- Servos
- Batteries
- Supplies
- Tools and equipment

Catalog categories will use stable internal identifiers; French labels are presentation concerns. Legacy records must be migrated or mapped safely. The old `control`, `connector`, `structure`, `material`, and `construction` distinctions are consolidated under Supplies. Servos remain a dedicated category. Radio supports both transmitter and receiver reference types.

### 4. Radio fields

Transmitters: brand, model, supported protocol(s), channel count, firmware/operating-system version. They are managed as inventory assets but are not assigned to aircraft in this version.

Receivers: brand, model, protocol, channel count, and any relevant additional attributes. Receiver stock remains individually tracked and may be assigned to aircraft.

### 5. Supplies

Supplies use simple availability/consumption tracking. No per-length remainder accounting and no mandatory aircraft assignment. Detailed consumable-lot tracking is outside the initial scope.

### 6. Other requested improvements

- Aircraft list has a read-only preview distinct from edit mode.
- Archived catalog references can be restored.
- Receiver protocol must survive an edit/read round trip and have a regression test.

## Migration and data safety

- Do not delete or reset the user's existing database as part of an upgrade.
- New inventories start empty.
- Keep the old database file intact and recommend a backup before migration.
- Use explicit schema migrations; do not rely on destructive recreation.
- Test opening, closing, switching, and reopening inventories, and prove that records remain isolated.

## Out of scope

- Network-hosted server, remote database, multi-user collaboration, authentication, sessions, access rights, cloud synchronization, and club-specific workflows.
- Automatic assignment of transmitters to aircraft.
- Fine-grained quantity tracking for supplies.

## Acceptance criteria

1. Two inventory files can be created and independently opened.
2. Switching inventories never leaks aircraft, references, stock items, lots, or movements between them.
3. Existing inventory files are not silently overwritten or deleted.
4. Core services depend on repository abstractions, not SQLite implementation details.
5. The seven categories and transmitter/receiver types are represented consistently in core models, UI, persistence, tests, and documentation.
6. Archived references can be restored.
7. Aircraft preview is read-only.
8. Receiver protocol persists across edit and application restart.
9. CI typecheck, tests, lint (where configured), and build pass.

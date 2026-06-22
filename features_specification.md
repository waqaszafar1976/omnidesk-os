# Product Feature Specifications - Omnidesk OS

This document details all the planned features for **Omnidesk OS**. It serves as the baseline for our discussion before starting the execution phase.

---

## 1. Core Workspace Hub (Office-Like Dashboard)
- **Unified Navigation Tree**: A left-hand sidebar displaying a nested page layout (Documents, Tables, Canvases).
- **Workspace Switcher**: Dropdown to toggle between personal, student, corporate, or industrial workspaces, shifting billing tiers and resource limits dynamically.
- **Global Search Indexer**: Search for text strings inside document nodes or matching database rows across all tables.

---

## 2. Collaborative Document Editor (Module A - Word Processor)
- **Tiptap/ProseMirror Integration**: A clean text editor supporting:
  - Text formatting (Bold, Italic, Strikethrough, Underline, Code block).
  - Headings (H1, H2, H3) and ordered/unordered lists.
  - Media insertion (Images, local file uploads).
- **Markdown Shortcuts**: Inline compilation (e.g. typing `# ` transforms a line to an H1 heading automatically).
- **Slash Commands**: Typing `/` opens a quick-insert portal to embed checklists, tables, code blocks, or canvas metrics directly into the editor flow.

---

## 3. Dynamic Smart Tables (Module B - Spreadsheet / Database Hybrid)
- **Strict DataType Enforcement**: Custom columns with typed data validation:
  - `Text`: Unstructured strings.
  - `Number`: Decimals or integers (for pricing, inventory count).
  - `Date`: Calendar picker inputs.
  - `Select (Dropdown)`: User-defined status labels with associated color themes (e.g., "Paid" (Green), "Pending" (Yellow)).
  - `Boolean`: Checkbox parameters.
  - `Formula`: Excel-style equations evaluated per row.
- **Inline Calculations Bar**: Aggregate functions (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`) calculated instantly on the bottom row of any column.
- **Spreadsheet-style Editing**: Add, copy, insert, delete, and rearrange rows directly inside the browser screen.

---

## 4. Custom Project Canvas Builder (Module C - No-Code Drag-and-Drop)
- **Dynamic Layout Grid**: Powered by `react-grid-layout` to support smooth dragging, resizing, and positioning of UI widgets.
- **Core Workspace Blocks**:
  - **Summary Metric Cards**: Displays large values with title headers, custom background HSL gradients, and sparkline widgets.
  - **Table Previews**: Integrates a read-only smart database listing directly onto the dashboard canvas.
  - **Rich Text Blocks**: Tiny note blocks or headers embedded in the canvas.
- **Data-Connection Modal**: Link widgets to dynamic database columns (e.g., "Aggregate SUM of column `received_amount` from Table X").

---

## 5. Real-Time Collaboration & CRDT Engine
- **Yjs Shared Documents**: Implements Conflict-Free Replicated Data Types (CRDTs) to sync keypresses and document updates instantly.
- **Presence Indicators**: Visual cursor identifiers. Users see other collaborators' cursors with color-coded labels showing their names.
- **Redis Pub/Sub Server Routing**: WebSocket messages are distributed across multiple server nodes so collaborators see edits instantly even if they connect to different backend containers.
- **Debounced Snapshots**: Backend aggregates rapid client keystrokes in memory, executing batch updates to PostgreSQL every 2–3 seconds to protect database integrity.

---

## 6. Calculation Compiler (Formula Engine)
- **Safe Sandboxing**: Safe compiler parsing simple cell calculations (e.g. `col_qty * col_price`) without executing arbitrary database strings.
- **Dependency Graph Manager**: Checks for circular references (e.g. Cell A relying on Cell B, which relies back on Cell A) and raises UI errors immediately if a loop is detected.
- **Instant Propagation**: Editing a column updates dependent cells dynamically via websockets.

---

## 7. Action Triggers & Webhook Broker (No-Code Automations)
- **Lifecycle Listeners**: Trigger automations based on database events (e.g. `ROW_CREATED`, `CELL_UPDATED`).
- **Conditional Filters**: Define execution conditions (e.g., "If `Recovery Status` changes to `'Paid'`").
- **Integration Handlers**: Broadcast notification payloads (e.g., calling mock WhatsApp/SMS messaging APIs, or calling custom external webhooks).

---

## 8. Internationalization & RTL Orientation
- **Dynamic Translation**: Support for English, Urdu, Arabic, Spanish, and Chinese languages.
- **Responsive Directionality Wrapper**: Switching language transforms the UI layout from LTR (Left-To-Right) to RTL (Right-To-Left) dynamically:
  - Sidebar shifts from left to right.
  - Grid cell indexes map correctly in reverse.
  - Text-align styles match the natural direction of the selected locale.

---

## 9. One-Click Template Installer & Marketplace
- **Built-in Templates**:
  - *Wholesale Recovery Sheet*: Setup customer columns, received amounts, and recovery metrics.
  - *Student Homework Planner*: Setup assignment lists, status trackers, and notes documents.
  - *Household Budget*: Setup expense list, income logs, and summary charts.
- **Instant Schema Installation**: Configures rows and metadata configurations to match selected setups in one click.

---

## 10. Data Export & Security
- **Multi-Format Exporter**: Download documents as PDF/Markdown, and data tables as CSV/Excel files.
- **Workspace Security Policies**: Strictly isolates database rows using JWT checks so data belonging to one workspace is never leaked to others.

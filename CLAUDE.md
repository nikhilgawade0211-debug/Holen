# CLAUDE.md — Mind Map / Org-Chart Web App (UI + Multi-format Export)

## Goal
Build a web app that lets users create a hierarchical mind map / org-chart diagram **matching the visual style in the provided image**:
- Boxes with colored fills and borders
- A small “subtitle/role” tag inside (grey label style)
- Clear straight connector lines (mostly orthogonal/straight)
- Multi-level hierarchy with multiple branches

Users can build the diagram via UI, save/load it, and export it to:
- **HTML** (standalone interactive or static)
- **PDF**
- **DOCX**

## Non-goals
- Real-time collaboration (can be added later)
- User authentication (optional later)
- Complex freeform mind-map layout (we are building a structured hierarchy / org-chart first)

---

## Recommended Stack (choose one and stick to it)

### Option A (recommended): Next.js + React + React Flow
- Frontend: **Next.js (App Router) + React + TypeScript**
- Diagram: **reactflow** (node/edge rendering + interactions)
- Layout: **dagre** for top-to-bottom tree layout (or elkjs if needed)
- Styling: Tailwind CSS (or CSS modules)
- Export:
  - SVG/PNG: use `html-to-image` or React Flow’s export patterns
  - PDF: server-side with **Playwright** (Chromium) rendering the export HTML
  - DOCX: generate with **docx** library and embed an image (PNG/SVG) + metadata

### Option B: Vite + React + React Flow
Same approach without Next.js. You’ll need a small Node/Express server for exports.

**Default to Option A unless the repo already uses something else.**

---

## Core Product Requirements

### 1) Diagram Model
Represent the diagram as a graph with strong hierarchy:
- `nodes`: each node has
  - `id: string`
  - `parentId?: string | null`
  - `text.title: string` (main line)
  - `text.subtitle?: string` (secondary line)
  - `badge?: string` (small grey tag like “role”) — optional but supports the image style
  - `style`:
    - `fill: string` (e.g., light blue / light orange / light green / light purple)
    - `border: string`
    - `textColor: string`
    - `badgeFill: string` (grey)
    - `badgeTextColor: string`
  - `size`:
    - `width: number`
    - `height: number`
  - `position` for renderer (computed by layout)

- `edges`: derived from parent-child relationships OR stored explicitly:
  - `id: string`
  - `source: string`
  - `target: string`
  - `type: 'straight' | 'smoothstep' | 'step'` (prefer straight/step to match image)

### 2) UI/UX Features
Minimum viable editor:
- Create node
  - Add child to selected node
  - Add sibling (same parent)
- Edit node
  - Inline edit for title/subtitle/badge
  - Color preset picker (blue/orange/green/purple/white)
- Delete node (with confirm; either delete subtree or re-parent children)
- Pan/zoom
- Fit-to-view button
- Auto-layout button (top-to-bottom hierarchical)
- Undo/redo (basic)
- Save/load
  - Export/import JSON for the diagram model
  - LocalStorage autosave (nice-to-have)

### 3) Layout Rules (to match the image)
- Orientation: **Top-to-bottom** (root at top)
- Siblings aligned horizontally
- Consistent spacing (e.g., 40–80px vertical gap, 30–60px horizontal)
- Edges rendered as simple straight lines or step lines
- Node sizes consistent; allow longer titles by wrapping or auto-resizing height

### 4) Export Formats
Exports must preserve visual fidelity.

#### 4.1 HTML export
- Create a self-contained HTML file that renders the diagram:
  - Option 1: Static SVG output (preferred for portability)
  - Option 2: React-based interactive viewer bundle (more complex)
- Must include the full diagram data and CSS so it opens offline.

#### 4.2 PDF export
- Generate a PDF with the diagram centered and scaled to fit.
- Use Playwright to render the export HTML (or a dedicated export route) and print to PDF.
- Support page size selection (A4 default; optionally A3/Letter).

#### 4.3 DOCX export
- Use a DOCX generator (e.g., `docx` npm package).
- Embed the diagram as an image (PNG preferred).
- Include a title and optional metadata:
  - diagram name
  - export timestamp

#### 4.4 Also support (bonus but high value)
- Export SVG
- Export PNG

---

## Suggested App Architecture

### Pages / Routes
- `/` editor
- `/api/export/pdf` (POST) -> returns PDF
- `/api/export/docx` (POST) -> returns DOCX
- `/api/export/html` (POST) -> returns HTML (or client-side download)

### Components
- `DiagramCanvas` (React Flow)
- `NodeCard` (custom node renderer matching image)
- `InspectorPanel` (edit selected node)
- `Toolbar` (add node, layout, export, undo/redo)

### Services
- `layoutService` (dagre/elk layout)
- `exportService`:
  - `toSVG()`
  - `toPNG()`
  - `toStandaloneHTML()`
  - server routes to convert HTML -> PDF and PNG -> DOCX

---

## Visual Spec (match the image style)
- Node is a rectangle with black border.
- Some nodes are filled with pastel colors (blue/orange/green/purple), others white.
- Node has:
  - Top: bold-ish title
  - Optional second line subtitle
  - A small grey “badge/tag” rectangle near bottom (role label style)
- Connectors are black and consistent thickness.
- Background is white.

Do **not** hardcode any real-world names from the image; treat text as user-provided.

---

## Data Persistence
- Diagram JSON schema versioned:
  - `schemaVersion: 1`
  - `diagram: { nodes, edges?, settings }`
- Store in LocalStorage under a stable key.
- Allow “Download JSON” and “Import JSON”.

---

## Acceptance Criteria
- User can create a multi-branch hierarchy similar to the image.
- Auto-layout produces a clean top-to-bottom org-chart.
- Export:
  - HTML opens offline and displays the diagram correctly.
  - PDF export preserves layout and colors.
  - DOCX export contains the diagram image and a heading.
- No crashes when deleting nodes or exporting large diagrams (e.g., 200 nodes).

---

## Development Guidelines

### Code quality
- TypeScript everywhere.
- Keep diagram state in a single store (e.g., Zustand) with actions:
  - `addChildNode`, `addSiblingNode`, `updateNode`, `deleteNode`, `setSelectedNode`, `applyLayout`, `undo`, `redo`.
- Avoid overly clever abstractions.

### Layout implementation notes
- Treat the graph as a rooted tree using `parentId`.
- Convert to edges for layout engine.
- After layout, write back node positions.

### Export implementation notes
- Build a deterministic “export view”:
  - Use a dedicated hidden container sized to the diagram bounding box.
  - Render with the same CSS as the editor.
- Prefer SVG for fidelity, then rasterize for PDF/DOCX if needed.

---

## Step-by-step Build Plan (Claude should follow)
1. Scaffold Next.js + TS + Tailwind.
2. Add React Flow and custom node renderer that matches the style.
3. Implement state management + CRUD operations for nodes.
4. Implement dagre layout and “Auto-layout” button.
5. Implement JSON save/load + autosave.
6. Implement SVG/PNG export client-side.
7. Implement HTML export (standalone SVG-based HTML).
8. Implement PDF export (Playwright server route).
9. Implement DOCX export (docx library embedding exported PNG).
10. Add basic e2e/smoke tests for export routes (optional, but recommended).

---

## Commands (expected)
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`

---

## Questions to ask the user only if blocked
- Should the diagram be strictly a tree (one parent) or allow cross-links?
- Should exports include pagination (multiple pages) or always fit-to-page?
- Should the HTML export be interactive or static?

If not specified, default to:
- Strict tree
- Fit-to-page single page for PDF
- Static HTML via inline SVG

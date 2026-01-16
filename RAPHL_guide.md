# RAPHL Guide for Holen (Claude Opus Prompt)

This file is a **ready-to-paste prompt** for Claude Opus to upgrade Holen’s UI/UX and add functionality, with special focus on **export reliability** (PDF + high-res images) and **multi-selection editing**.

> **RAPHL** (as used here)
> - **R — Role**: Who the model should act as
> - **A — Audience**: Who the output is for (and the environment constraints)
> - **P — Problem**: What needs to change and what’s broken today
> - **H — How**: Approach, constraints, architecture decisions, and acceptance criteria
> - **L — Logistics**: Files to touch, commands/tests, deliverables, and guardrails

---

## R — Role
You are a senior Next.js + React + TypeScript engineer with strong UX/product sense.
You ship maintainable code, keep changes minimal but high-impact, and validate fixes with quick manual checks.

## A — Audience
- Project: Holen, a diagram editor built on **Next.js App Router** + **@xyflow/react (React Flow)** + **Zustand** + **Tailwind**.
- You can edit code in this repo, run `npm` commands, and update dependencies if necessary.
- Keep styling consistent and modern.

## P — Problem
### Current app shape (important context)
- Canvas editor: `src/components/DiagramCanvas.tsx` uses `@xyflow/react`.
- State: `src/store/diagramStore.ts` stores nodes/edges and **only one selected node** via `selectedNodeId`.
- Inspector: `src/components/InspectorPanel.tsx` edits a single selected node.
- Toolbar: `src/components/Toolbar.tsx` handles add/delete/layout/undo/redo/export.
- Export services: `src/services/exportService.ts` uses `html-to-image`:
  - `exportToSVG()` captures `.react-flow__viewport`
  - `exportToPNG()` captures `.react-flow__viewport` with `pixelRatio: 2`
- Server export routes:
  - PDF: `src/app/api/export/pdf/route.ts` uses `puppeteer` to render an HTML page containing the SVG
  - DOCX: `src/app/api/export/docx/route.ts` uses a PNG base64 image (currently generated client-side)

### Issues to fix
1. **PDF export is not working reliably** (user reports it fails).
   - Current approach: client sends SVG to `/api/export/pdf`, server uses Puppeteer.
   - Likely problems to address:
     - Next route runtime incompatibilities (Puppeteer requires Node runtime; ensure not Edge runtime)
     - Puppeteer launch/Chromium availability (dev container vs deployment)
     - SVG sizing (A4 landscape + margins may crop or scale poorly)

2. **Image export resolution is too low**.
   - Current `exportToPNG()` uses `pixelRatio: 2` and captures the *viewport*, not necessarily the full diagram bounds.
   - Need higher-res and correct sizing for full diagram exports.

### Features to add
3. **Multi-select + group actions**:
   - Drag-select (marquee) and Ctrl/Cmd+click multi-select.
   - Move/drag multiple nodes together.
   - Delete multiple nodes.
   - Batch style edits (e.g., change fill/border/text styles for all selected nodes).

4. **More formatting options** (node box + text):
   - Text formatting: bold/italic/underline, font size, alignment, line height (at minimum).
   - Box styling: shape presets (rectangle/rounded/pill), outline styles (solid/dashed/dotted), border width, shadow.

5. **Modern UI refresh + animations**:
   - Update toolbar/inspector styling to feel modern.
   - Add subtle animations for selection, node creation/deletion, panel interactions.
   - Ensure performance remains good on larger diagrams.

---

## H — How
### 1) Export: implement robust “export full diagram” pipeline
**Goal:** Export should include *all nodes*, at high resolution, and be consistent across formats.

Recommended approach:
- Compute diagram bounds from nodes (React Flow provides helpers like `getNodesBounds` / `getViewportForBounds` in the React Flow ecosystem).
- Export from the viewport using a transform that fits all nodes into an offscreen render at a target size.
- Provide user-facing quality options:
  - `Low` / `Medium` / `High` (maps to pixel ratio and output dimensions)
  - Optional: explicit width/height or DPI-like setting

Acceptance criteria:
- PNG export is crisp at “High” on typical diagrams.
- Export includes all nodes, not just what’s visible in the current viewport.

### 2) PDF export: make it work locally and on deployment
Choose ONE of these strategies (prefer simplest that works in your environment):

**Strategy A (keep Puppeteer):**
- Ensure the API route runs on Node runtime (not Edge).
- Ensure Puppeteer can launch (Chromium present or bundled).
- Set viewport and page size based on diagram bounds.
- Render SVG at correct dimensions and scale.

**Strategy B (avoid Puppeteer):**
- Generate a high-res PNG client-side (same “export full diagram” pipeline).
- Send PNG to server and build PDF with a pure-JS library (e.g., `pdf-lib`).
- This avoids Chrome runtime issues.

Acceptance criteria:
- Clicking “PDF” downloads a valid PDF.
- PDF contains the diagram and is not blank/cropped.

### 3) Image exports beyond PNG
Add support for:
- JPEG (smaller files; white background)
- WebP (small + good quality if supported)

Acceptance criteria:
- Export menu offers PNG/JPEG/WebP.
- Quality settings apply to all image formats.

### 4) Multi-selection architecture
Right now the store is single-select (`selectedNodeId`). To support multi-select:
- Add `selectedNodeIds: string[]` in `diagramStore`.
- Update canvas to sync selection changes:
  - Marquee selection (drag on empty pane)
  - Ctrl/Cmd toggling
- Update `InspectorPanel`:
  - When multiple selected: show “Batch Edit” panel (only show properties that can apply to many nodes)
  - When single selected: current behavior
- Update delete and other actions in `Toolbar` to apply to all selected nodes.

Acceptance criteria:
- Dragging selection box selects multiple.
- Ctrl/Cmd+click toggles a node in selection.
- Dragging one selected node moves all selected nodes.
- Delete removes all selected nodes.

### 5) Formatting features (incremental, practical)
Avoid building a full rich-text editor unless required.
Prefer a pragmatic model:
- Store text style fields in node data (e.g., `text: { bold, italic, underline, size, align }`).
- Apply via Tailwind/CSS in `NodeCard`.
- Provide Inspector controls:
  - toggles for bold/italic/underline
  - dropdown for font size
  - alignment buttons
- Box styling:
  - border radius slider or presets
  - border style dropdown
  - border width
  - shadow toggle/slider

Acceptance criteria:
- Basic formatting works and persists in JSON save/load.

### 6) UI modernization + animations
- Consider adopting a lightweight component system (optional): shadcn/ui + Radix (only if time/benefit makes sense).
- Keep toolbar and inspector clean:
  - icons
  - grouped actions
  - better spacing/typography
- Animations:
  - hover/press micro-interactions
  - selection ring transitions
  - panel open/close transitions
  - optional node add/delete animations (Framer Motion is a good fit)

Acceptance criteria:
- UI looks modern without breaking usability.
- Animations are subtle and do not cause jank.

---

## L — Logistics
### Files likely to change
(Use these as starting points; update as needed.)
- `src/services/exportService.ts` (add full-bounds export + quality settings + new formats)
- `src/components/Toolbar.tsx` (export menu additions + quality UI)
- `src/app/api/export/pdf/route.ts` (fix PDF export strategy)
- `src/store/diagramStore.ts` (multi-select state + batch updates + delete-many)
- `src/components/DiagramCanvas.tsx` (enable marquee selection + ctrl/cmd multi-select + sync selection)
- `src/components/InspectorPanel.tsx` (batch edit UI + formatting controls)
- `src/components/NodeCard.tsx` (apply new styles and modern visuals)
- `src/app/globals.css` (theme polish)

### Guardrails
- Keep TypeScript strictness happy.
- Avoid large rewrites; refactor only where necessary.
- Prefer additive changes + small targeted refactors.
- Ensure export excludes UI controls/minimap as today.

### Quick verification checklist
- Add nodes, connect hierarchy, drag around.
- Select single node → edit title/subtitle/badge.
- Ctrl/Cmd multi-select → move group.
- Drag marquee selection → selects multiple.
- Delete with multiple selected.
- Export:
  - PNG High quality is crisp
  - JPEG/WebP work
  - PDF downloads and opens

### Suggested commands
- `npm install`
- `npm run dev`
- If tests exist: `npm test` (run if present)

---

## Copy/paste prompt for Claude Opus

You can paste everything below into Claude Opus:

---

You are a senior Next.js + React + TypeScript engineer.

Task: Upgrade this diagram editor app (Holen) with modern UI/animations, add multi-select (marquee + ctrl/cmd select) with group move/delete and batch style editing, and fix exports (PDF broken; image export low-res).

Repo architecture context:
- Canvas: `src/components/DiagramCanvas.tsx` uses `@xyflow/react`.
- Store: `src/store/diagramStore.ts` uses Zustand; currently single select via `selectedNodeId`.
- Toolbar: `src/components/Toolbar.tsx` triggers exports and actions.
- Export service: `src/services/exportService.ts` uses `html-to-image` to export `.react-flow__viewport`.
- PDF route: `src/app/api/export/pdf/route.ts` uses Puppeteer with SVG.

Requirements:
1) Fix PDF export so it reliably downloads a correct PDF (not blank/cropped; works locally and is deployable). Prefer an approach that avoids fragile runtime dependencies if possible.
2) Improve image export quality and add image formats: at least PNG + JPEG (+ WebP if feasible). Add quality options (Low/Medium/High).
3) Export should capture the full diagram bounds, not only the visible viewport.
4) Add multi-select:
   - marquee selection by dragging on empty canvas
   - ctrl/cmd click to toggle nodes in selection
   - dragging a selected node moves the whole selection
   - delete removes all selected
   - allow batch formatting changes (fill/border/text)
5) Add formatting controls:
   - text: bold/italic/underline, font size, alignment
   - box: border width, border style (solid/dashed/dotted), corner radius presets, outline/shadow options
6) Modernize UI (toolbar + inspector) and add subtle, performant animations.

Constraints:
- Keep code maintainable; avoid unnecessary rewrites.
- Update store schema carefully so JSON save/load stays compatible (or add schemaVersion bump + migration if needed).

Deliverables:
- Implement the changes in code with clear, minimal refactors.
- Mention which files changed and how to verify manually.

Proceed step-by-step:
- First, design the export pipeline (full bounds + quality), then implement.
- Then implement multi-select state + canvas selection syncing + toolbar/inspector updates.
- Then implement formatting controls and styling.
- Finally modernize UI + animations.

---

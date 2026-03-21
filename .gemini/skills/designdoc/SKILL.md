---
name: designdoc
description: Creates comprehensive Design Docs following the 10-section architecture guidelines. Use when the user invokes /designdoc to create technical design documentation for services, features, or systems.
argument-hint: "[name] [context] or [name] --from [file] or refine [section]"
---

# Design Doc Skill

You create comprehensive Design Documents following the architecture guidelines in `/Users/gabrielbotega/projetos/wiboo/.agents/skills/designdoc/designdoc-architecture.md`.

## Commands

| Command | Description |
|---------|-------------|
| `/designdoc [name] [context]` | Create new design doc with inline context |
| `/designdoc [name] --from [file]` | Create design doc from requirements file |
| `/designdoc refine [section]` | Refine a specific section (by name or number) |

## Step 1: Read Guidelines (ALWAYS)

**This is mandatory for every invocation.**

Read the full design doc architecture guidelines:
```
/Users/gabrielbotega/projetos/wiboo/.agents/skills/designdoc/designdoc-architecture.md
```

These guidelines define:
- The 10 mandatory sections
- Writing style (Amazon Way)
- Diagram requirements (Mermaid only)
- Table formats for APIs, costs, alarms

## Step 2: Parse Arguments

Arguments: $ARGUMENTS

**Detect command type:**

1. If first word is `refine` → go to **Refine Flow**
2. If `--from` flag present → read that file as context
3. Otherwise → first word is `name`, rest is `context`

**Section mapping** (for refine):

| Number | Name | Section |
|--------|------|---------|
| 1 | context | Context and Scope |
| 2 | goals | Goals and Non-Goals |
| 3 | system | System Context Diagram |
| 4 | architecture | Architecture Diagram |
| 5 | apis | APIs |
| 6 | data | Data Storage |
| 7 | costs | Cost Estimation |
| 8 | functional | Functional Requirements |
| 9 | nonfunctional | Non-Functional Requirements |
| 10 | metadata | Document Metadata |

---

## Create Flow

### Step 3: Check for Existing Code

Look for code directories:
- `src/`, `lib/`, `app/`, `packages/`, `lambdas/`

**If code exists**: Spawn `code-analyzer` agent to gather technical context.

Use the **Agent tool**:
```
subagent_type: general-purpose
model: sonnet
prompt: |
  You are the code-analyzer agent. Analyze this codebase to gather technical context for a design doc.

  Produce a structured report including:
  - Project overview
  - Tech stack (languages, frameworks, cloud)
  - Architecture patterns
  - API endpoints
  - Data models
  - External integrations
  - Infrastructure

  Follow your agent instructions for the exact output format.
```

**If no code**: Skip analysis, proceed with user context only.

### Step 4: Spawn Architect Agent (Opus)

Use the **Agent tool**:
```
subagent_type: general-purpose
model: opus
prompt: |
  You are the architect agent. Create a comprehensive Design Doc.

  ## Service Name
  [name from arguments]

  ## User Context
  [context from arguments or --from file]

  ## Code Analysis (if available)
  [output from code-analyzer agent]

  ## Guidelines & WiBOO Architecture Context
  [full content from /Users/gabrielbotega/projetos/wiboo/.agents/skills/designdoc/designdoc-architecture.md]
  [full content from /Users/gabrielbotega/projetos/wiboo/.agents/arch_patterns/achitechture.md]
  [full content from /Users/gabrielbotega/projetos/wiboo/.agents/arch_patterns/patterns.md]

  ## Instructions
  1. Create a complete Design Doc with all 10 mandatory sections
  2. Use Mermaid for ALL diagrams (never ASCII)
  3. Follow Amazon writing style (active voice, specific numbers, no weasel words)
  4. Include proper tables for APIs, costs, and alarms
  5. Show your math for cost calculations
  6. Use STRIDE framework for security analysis

  Output the complete Design Doc as raw Markdown (no code fences around the whole document).
```

### Step 5: Handle Output (ALWAYS Ask)

After the architect agent completes:

1. **Ask the user where to save**:
   - Suggest: `docs/[name]-design-doc.md`
   - Allow: custom path
   - Allow: "print to chat only"

2. **Save to chosen location** (create docs/ directory if needed)

3. **Suggest next steps**:
   - "Review the draft and use `/designdoc refine [section]` to improve specific sections"
   - Mention sections that might need more detail (e.g., costs if assumptions are unclear)

---

## Refine Flow

### Step 3: Parse Section

Accept either:
- Section name: `context`, `goals`, `apis`, `data`, `costs`, etc.
- Section number: `1` through `10`

Map to the full section name using the table above.

### Step 4: Find Existing Design Doc

Look for the design doc:
- Check `docs/*-design-doc.md`
- If multiple found, ask user which one
- If none found, ask user for the path

Read the full design doc.

### Step 5: Spawn Architect Agent for Refinement

Use the **Agent tool**:
```
subagent_type: general-purpose
model: opus
prompt: |
  You are the architect agent. Refine a specific section of an existing Design Doc.

  ## Section to Refine
  [section name]

  ## Current Section Content
  [extracted section content]

  ## Full Design Doc (for context)
  [full design doc content]

  ## Guidelines & WiBOO Architecture Context
  [full content from /Users/gabrielbotega/projetos/wiboo/.agents/skills/designdoc/designdoc-architecture.md]
  [full content from /Users/gabrielbotega/projetos/wiboo/.agents/arch_patterns/achitechture.md]

  ## Additional Context (if user provided)
  [any additional context from the refine command]

  ## Instructions
  1. Improve ONLY the specified section
  2. Maintain consistency with the rest of the document
  3. Follow the guidelines for that section type
  4. Make it more specific, detailed, or accurate
  5. Keep Mermaid diagrams if present, improve them if needed

  Output ONLY the refined section content (not the whole document).
```

### Step 6: Handle Output (ALWAYS Ask)

After the architect agent completes:

1. **Show the refined section**

2. **Ask the user**:
   - "Should I update the design doc with this refined section?"
   - Options: Yes (update in place), No (keep as is), Custom (let me copy manually)

3. If yes, update the design doc in place using the Edit tool

---

## Important Notes

- **Always read guidelines** from `/Users/gabrielbotega/projetos/wiboo/.agents/skills/designdoc/designdoc-architecture.md` on every invocation
- **Always ask where to save** - never assume the output location
- **Use Opus for architect** - complex reasoning needed for architecture and costs
- **Use Sonnet for code-analyzer** - sufficient for factual extraction
- **All diagrams must be Mermaid** - never ASCII art
- **Writing style matters** - active voice, specific numbers, no weasel words

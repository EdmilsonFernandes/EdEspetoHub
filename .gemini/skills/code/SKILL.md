---
name: code
description: Two-phase architecture-aware coding workflow. Use when the user invokes /code to implement features, services, or components following project architecture references.
argument-hint: '<language> <task description>'
---

You are executing a three-phase coding workflow: **PLAN** (you, Opus/gemini 3.1 pro high) → **IMPLEMENT** (coder agent, Sonnet/gemini 3.1 pro high) → **TEST** (tester agent, Sonnet/gemini 3.1 high, conditional).

## Step 1: Parse arguments

Full arguments: $ARGUMENTS

Parse the arguments by splitting on whitespace:

- **Language/Framework**: The **first word** (e.g., `cdk`, `typescript`, `flutter`)
- **Task description**: Everything after the first word

Example: `/code cdk implement the infra for...`

- Language = `cdk`
- Task = `implement the infra for...`

If no task description was provided (only the language), ask the user what they want to build before proceeding.

## Step 2: Load architecture reference

Read the architecture reference file based on the **Language/Framework** parsed in Step 1:

```
/Users/gabrielbotega/projetos/churrasquinho/EdEspetoHub/.gemini/arch_patterns/achitechture.md
/Users/gabrielbotega/projetos/churrasquinho/EdEspetoHub/.gemini/arch_patterns/patterns.md
/Users/gabrielbotega/projetos/churrasquinho/EdEspetoHub/.gemini/arch_patterns/convention.md
```

**Important: Read the ENTIRE file.** Architecture files can be very large (4000+ lines). If the file is truncated or you see "... truncated" or similar:

1. Note the last line number you read
2. Continue reading from that offset using the `offset` parameter
3. Repeat until you reach the end of the file

Do NOT proceed to Step 3 until you have read the complete architecture file. Missing sections means missing mandatory rules.

These rules are **mandatory constraints** for both planning and implementation.

If the file does not exist, acknowledge this and proceed using general best practices for the language. Do not ask the user for an architecture file.

## Step 3: Analyze the codebase

Before planning, understand the current project state:

1. Look at the project structure (directories, file organization, existing patterns)
2. Identify existing code related to the task
3. Find similar implementations that can serve as reference
4. Note project-specific conventions (naming, imports, file layout)
5. Don't assume anything. Read from the folders or ask the user.

## Step 4: Create the implementation plan

Using the architecture reference and codebase analysis, create a detailed plan with these sections:

### 4.1 Overview

What will be built and why. Which architectural layers are involved.

### 4.2 Files to create or modify

For each file:

- **Full path** (following the project's file organization)
- **Purpose**
- **Key contents** (interfaces, functions, classes, exports — be specific)
- **Dependencies** (imports, injections)

### 4.3 Architecture rules to follow

Extract the specific rules from the architecture reference that apply to this task. List them as concrete, actionable constraints the coder agent must follow. If no architecture file was found, list the general best practices you will enforce.

### 4.4 Implementation order

Number the files in dependency order (create dependencies first).

### 4.5 Validation

How to verify the implementation (type checks, tests, linting).

## Step 5: Present and confirm

Present the complete plan to the user. Ask: **"Should I proceed with implementation?"**

**Wait for confirmation. Do NOT proceed automatically.**

## Step 6: Delegate to the coder agent

After the user confirms, use the **Agent tool (workflows)** to delegate implementation:

- `subagent_type`: `general-purpose`
- `model`: `sonnet/gemini 3.1 pro (high)`

**The agent runs in an isolated context and cannot see this conversation.** You MUST include ALL of the following in the agent prompt:

1. The complete implementation plan (all sections from Step 4)
2. The full architecture rules from Step 4.3
3. The implementation order from Step 4.4
4. Any relevant existing code snippets the agent will need as reference
5. This explicit instruction: "Implement every file listed in the plan, in the specified order. Follow every architecture rule listed. Do not skip files. Do not deviate from the plan. Do not add code comments unless explaining a non-obvious workaround. After implementation, run available validation (type check, tests, linting)."

## Step 7: Review coding results

After the coder agent completes:

1. Read the files that were created or modified
2. Verify all planned files exist
3. Check that architecture rules were followed
4. Collect the list of files created/modified for the next step

## Step 8: Conditional test generation

Check whether the architecture reference (loaded in Step 2) contains testing sections — look for keywords like "test", "jest", "testing", "unit test", "coverage", "mock", "spec".
All tests are within the tests folder inside the module/package.

### If the architecture HAS testing sections:

Use the **Agent tool** to delegate test writing:

- `subagent_type`: `general-purpose`
- `model`: `sonnet/gemini 3.1 pro (high)`

Include ALL of the following in the agent prompt:

1. The list of files created/modified by the coder agent (full paths)
2. The testing rules and patterns extracted from the architecture reference (copy the relevant sections in full)
3. A summary of what each file does (from the implementation plan)
4. This instruction: "Read every implemented file listed above. For each one, create the corresponding test file following the architecture testing patterns. Use the DI pattern for mocking. Test success paths, failure paths, and edge cases. After writing all tests, run tests with coverage. Enforce a minimum of 90% unit test coverage (branches, functions, lines, statements) on the implemented files. If below 90%, analyze uncovered lines/branches, add more tests, and re-run. Iterate up to 3 times to reach the threshold. Report final coverage per file."
5. If existing test files were found in the project during Step 3, mention their paths so the agent can use them as reference

### If the architecture has NO testing sections:

Skip test generation. Inform the user: "No testing patterns found in the architecture reference for [language]. Skipping automatic test generation."

## Step 9: Final report

Present the complete results to the user:

1. **Implementation**: files created/modified, type checks passed/failed
2. **Tests** (if generated): test files created, tests passing/failing, coverage
3. Any issues found during review

### Suggested Commits

Propose a sequence of small, focused commits. This helps PR reviewers understand changes step by step.

**Rules:**

1. **Tests with implementation** — Include tests in the same commit as the code they test (don't make separate test commits)
2. **Logical order** — Build dependencies first, then consumers; foundations before features
3. **Tell a story** — A reviewer reading commits in order should understand the progression
4. **Each commit works** — Code compiles and tests pass after each commit

**Commit types** (use only these):

- `feat` — new feature
- `fix` — bug fix
- `refactor` — refactoring production code
- `revert` — reverting one or more commits
- `perf` — improving performance
- `style` — formatting, no code change
- `docs` — documentation changes
- `test` — adding/refactoring tests only (no production code)
- `chore` — maintenance tasks, no production code change

**Format:** `type(scope): description`

**Example output:**

```
### Suggested Commits

1. `feat(domain): add attachment entity and repository interface`
   - `src/domain/entities/Attachment.ts`
   - `src/domain/repositories/IAttachmentRepository.ts`
   - `tests/domain/entities/Attachment.test.ts`

2. `feat(infra): implement attachment repository with S3`
   - `src/infrastructure/repositories/AttachmentRepository.ts`
   - `tests/infrastructure/repositories/AttachmentRepository.test.ts`

3. `feat(app): add attachment upload use case`
   - `src/application/usecases/UploadAttachment.ts`
   - `tests/application/usecases/UploadAttachment.test.ts`

4. `feat(lambda): expose attachment upload endpoint`
   - `src/lambdas/uploadAttachment/handler.ts`
   - `tests/lambdas/uploadAttachment/handler.test.ts`
```

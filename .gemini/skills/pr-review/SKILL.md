---
name: pr-review
description: Review branch changes before merge — like a pull request reviewer
argument-hint: "[start-commit] [end-commit]"
context: fork
agent: pr-reviewer
---

Review code changes as a pull request review.

**Usage:**
- `/pr-review` — Review all changes from current branch vs base branch (main/master/develop)
- `/pr-review abc1234` — Review a single commit
- `/pr-review abc1234 def5678` — Review commits from start to end (both included)

The review will be saved to the repo root folder with naming: `{date}_{repo-name}_{branch-name}.md`

$ARGUMENTS

# PRD Template

Use this template when generating Product Requirements Documents.

---

```markdown
# PRD: [Feature Name]

| Field | Value |
|-------|-------|
| **Author** | [Name] |
| **Created** | [YYYY-MM-DD] |
| **Status** | Draft / In Review / Approved |
| **Epic** | [Link or reference] |
| **Target Release** | [Version or date] |

---

## Problem Statement

[2-3 sentences describing the problem. Focus on the user pain point, not the solution. Include who is affected and the impact.]

**User Impact**: [How many users? How often? How severe?]

---

## Goals

What we're trying to achieve with this feature:

1. [Goal 1 - measurable outcome]
2. [Goal 2 - measurable outcome]
3. [Goal 3 - measurable outcome]

---

## Non-Goals

What we're explicitly NOT doing (prevents scope creep):

1. [Non-goal 1]
2. [Non-goal 2]
3. [Non-goal 3]

---

## User Personas

### Primary: [Persona Name]

[Brief description of the primary user this feature serves. Reference existing persona doc if available.]

- **Goals**: [What they want to achieve]
- **Pain points**: [Current frustrations]

### Secondary: [Persona Name] (optional)

[Brief description if there's a secondary user.]

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | [Requirement description] | Must |
| FR-2 | [Requirement description] | Must |
| FR-3 | [Requirement description] | Should |
| FR-4 | [Requirement description] | Could |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Performance | [e.g., Page load < 2s] |
| NFR-2 | Availability | [e.g., 99.9% uptime] |
| NFR-3 | Security | [e.g., Data encrypted at rest] |
| NFR-4 | Accessibility | [e.g., WCAG 2.1 AA] |

---

## User Stories

[List the main user stories. These can be expanded later with `/product story`.]

1. **[Story title]**: As a [persona], I want [goal] so that [benefit].
2. **[Story title]**: As a [persona], I want [goal] so that [benefit].
3. **[Story title]**: As a [persona], I want [goal] so that [benefit].

---

## Success Metrics

How we'll measure if this feature is successful:

| Metric | Baseline | Target | How Measured |
|--------|----------|--------|--------------|
| [Metric 1] | [Current value] | [Goal value] | [Tool/method] |
| [Metric 2] | [Current value] | [Goal value] | [Tool/method] |
| [Metric 3] | [Current value] | [Goal value] | [Tool/method] |

---

## Design

[Link to mockups, wireframes, or prototypes. Or describe the key UI/UX decisions.]

---

## Technical Considerations

[Any technical constraints, dependencies, or architectural decisions.]

- **Dependencies**: [External services, APIs, teams]
- **Tech debt**: [Any existing issues to address]
- **Migration**: [Data migration needs]

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How we'll address it] |
| [Risk 2] | High/Med/Low | High/Med/Low | [How we'll address it] |

---

## Timeline

| Milestone | Target Date |
|-----------|-------------|
| PRD approved | [Date] |
| Design complete | [Date] |
| Development start | [Date] |
| Beta/Testing | [Date] |
| Launch | [Date] |

---

## Open Questions

[Questions that still need answers before or during development.]

1. [Question 1]
2. [Question 2]
3. [Question 3]

---

## Appendix

[Any additional context, research, or references.]
```

---

## Guidelines for Writing PRDs

### Problem Statement Tips
- Focus on the **problem**, not the solution
- Include quantifiable impact when possible
- Answer: Who? What? Why does it matter?

### Goals Tips
- Make them **measurable** (SMART goals)
- Limit to 3-5 goals
- Each goal should be independently verifiable

### Non-Goals Tips
- Be explicit about scope boundaries
- Helps prevent feature creep
- Useful for alignment discussions

### Requirements Tips
- Use MoSCoW prioritization (Must/Should/Could/Won't)
- Keep requirements atomic (one thing each)
- Make them testable

### Success Metrics Tips
- Define before building, not after
- Include baseline measurements
- Specify how you'll collect data

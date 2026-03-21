# User Story Template

Use this template when generating user stories.

---

```markdown
# [ID] [Story Title]

**Epic**: [Epic name or link]
**Priority**: [Must / Should / Could]
**Points**: [Estimate]
**Status**: [Backlog / Ready / In Progress / Done]

---

## User Story

**As a** [persona or role],
**I want** [goal or capability],
**So that** [benefit or value].

---

## Acceptance Criteria

### Scenario: [Happy path name]

- **Given** [initial context or precondition]
- **When** [action or trigger]
- **Then** [expected outcome]
  - **And** [additional outcome if needed]

### Scenario: [Alternative or edge case]

- **Given** [initial context]
- **When** [action]
- **Then** [expected outcome]

### Scenario: [Error case]

- **Given** [initial context]
- **When** [action that causes error]
- **Then** [error handling behavior]

---

## Validation Checklist

- [ ] [Specific validation rule or requirement]
- [ ] [Another validation rule]
- [ ] [Non-functional requirement if applicable]
- [ ] [Edge case handling]

---

## Definition of Ready

- [ ] User story follows standard format
- [ ] Acceptance criteria are clear and testable
- [ ] Story has been estimated
- [ ] Dependencies identified
- [ ] Design/mockups available (if UI)
- [ ] Technical approach discussed
- [ ] Product owner approved

---

## Notes

[Any additional context, technical considerations, or implementation hints]

### Dependencies
- [Dependency 1]
- [Dependency 2]

### Out of Scope
- [What this story does NOT include]

### Related Stories
- [Link to related story 1]
- [Link to related story 2]
```

---

## Guidelines for Writing Stories

### User Story Format

**Always use**: "As a [persona], I want [goal], so that [benefit]"

- **Persona**: Specific user type, not generic "user"
- **Goal**: What they want to do (action)
- **Benefit**: Why it matters (value)

### Good vs Bad Examples

**Good**:
```
As a returning customer,
I want to see my previous orders,
So that I can quickly reorder items I've bought before.
```

**Bad**:
```
As a user,
I want a better order history page,
So that it's easier to use.
```

### Acceptance Criteria Tips

1. **Given/When/Then** for behavior scenarios
   - Given: Starting state
   - When: Action taken
   - Then: Expected result

2. **Cover key scenarios**:
   - Happy path (main flow)
   - Alternative paths
   - Error cases
   - Edge cases

3. **Be specific but not prescriptive**
   - Specify **what**, not **how**
   - Allow implementation flexibility

### Checklist Items

Use for:
- Validation rules
- Performance requirements
- Security requirements
- Accessibility requirements

### Story Sizing

| Size | Description |
|------|-------------|
| 1-2 points | Few hours, trivial |
| 3 points | About a day |
| 5 points | 2-3 days |
| 8 points | Almost full sprint, consider splitting |
| 13+ points | Too big, must split |

### INVEST Checklist

Before finalizing, verify:
- [ ] **I**ndependent: No blocking dependencies
- [ ] **N**egotiable: Details can be discussed
- [ ] **V**aluable: Clear user/business value
- [ ] **E**stimable: Team can estimate
- [ ] **S**mall: Fits in one sprint
- [ ] **T**estable: Clear pass/fail criteria

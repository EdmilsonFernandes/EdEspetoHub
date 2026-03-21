# Agile Artifacts Reference

## Hierarchy

```
Epic (2-4 weeks, multiple sprints)
  └── Feature (optional grouping)
        └── User Story (1 sprint, 1-8 points)
              └── Task (hours)
```

---

## User Story Format

### Standard Format
```
As a [persona/role],
I want [goal/capability],
So that [benefit/value].
```

### INVEST Criteria

Good stories are:
- **I**ndependent: Can be developed separately
- **N**egotiable: Details discussed before dev
- **V**aluable: Clear business value
- **E**stimable: Team can estimate effort
- **S**mall: Fits in one sprint
- **T**estable: Clear acceptance criteria

### Examples

**Good**:
```
As a registered user,
I want to reset my password via email,
So that I can regain access if I forget it.
```

**Bad** (too vague):
```
As a user,
I want better security,
So that I feel safe.
```

---

## Acceptance Criteria

### Format 1: Given/When/Then (Behavior Scenarios)

Best for describing specific use cases and behaviors.

```markdown
### Scenario: Successful password reset
- **Given** I am on the login page
- **When** I click "Forgot password" and enter my email
- **Then** I receive a password reset email within 2 minutes

### Scenario: Invalid email
- **Given** I am on the forgot password page
- **When** I enter an unregistered email
- **Then** I see a message "If this email exists, you'll receive a reset link"
  - **And** no email is sent (security: don't reveal if email exists)

### Scenario: Expired reset link
- **Given** I have a password reset link older than 1 hour
- **When** I click the link
- **Then** I see "This link has expired" with option to request new link
```

### Format 2: Checklist (Validation Rules)

Best for technical requirements and validation rules.

```markdown
## Checklist
- [ ] Reset link expires after 1 hour
- [ ] Reset link is single-use
- [ ] Password must be at least 8 characters
- [ ] Password must contain letter and number
- [ ] User is logged in after successful reset
- [ ] Previous sessions are invalidated
```

### Combining Both Formats

Use Given/When/Then for main scenarios, checklist for validation rules:

```markdown
## Acceptance Criteria

### Scenario: Happy path
- **Given** I have a valid reset link
- **When** I enter a new password meeting requirements
- **Then** my password is updated and I'm logged in

### Scenario: Password too weak
- **Given** I have a valid reset link
- **When** I enter "12345"
- **Then** I see validation errors for missing requirements

## Validation Rules
- [ ] Minimum 8 characters
- [ ] At least one letter
- [ ] At least one number
- [ ] Cannot be same as previous 3 passwords
```

---

## Epic Structure

```markdown
# Epic: [Name]

## Summary
One paragraph describing the epic's purpose and scope.

## Business Value
Why this matters to the business and users.

## Success Metrics
- Metric 1: [baseline] → [target]
- Metric 2: [baseline] → [target]

## User Stories
1. [Story title] - [brief description]
2. [Story title] - [brief description]
3. [Story title] - [brief description]

## Dependencies
- [Dependency 1]
- [Dependency 2]

## Risks
- [Risk 1]: [Mitigation]
- [Risk 2]: [Mitigation]

## Out of Scope
- [Item 1]
- [Item 2]
```

---

## Definition of Ready (DoR)

A story is ready for sprint when:

- [ ] User story follows standard format
- [ ] Acceptance criteria are defined and testable
- [ ] Story has been estimated by the team
- [ ] Dependencies are identified and resolved (or planned)
- [ ] Design/mockups available (if UI work)
- [ ] Technical approach discussed
- [ ] Story fits within one sprint
- [ ] Product owner has approved

---

## Definition of Done (DoD)

A story is done when:

- [ ] Code complete and peer-reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Acceptance criteria verified
- [ ] Documentation updated (if applicable)
- [ ] Deployed to staging/test environment
- [ ] Product owner has accepted
- [ ] No critical bugs remaining

---

## Story Pointing

### Fibonacci Scale
Use: 1, 2, 3, 5, 8, 13, 21

| Points | Meaning |
|--------|---------|
| 1 | Trivial, few hours |
| 2 | Small, half day |
| 3 | Medium, 1 day |
| 5 | Large, 2-3 days |
| 8 | Very large, almost full sprint |
| 13 | Too big, should split |
| 21 | Epic-sized, definitely split |

### What Points Measure
- Complexity
- Uncertainty
- Effort

**Not**: Calendar time (that varies by person)

### Estimation Tips
- Compare to reference stories
- Include testing effort
- Account for unknowns
- Split stories > 8 points

---

## Backlog Prioritization

### MoSCoW Method

| Priority | Meaning |
|----------|---------|
| **Must** | Critical, launch blocker |
| **Should** | Important, expected |
| **Could** | Nice to have |
| **Won't** | Out of scope (this release) |

### RICE Scoring

```
RICE = (Reach × Impact × Confidence) / Effort
```

| Factor | Description | Scale |
|--------|-------------|-------|
| Reach | Users affected per quarter | Number |
| Impact | Effect on users | 0.25, 0.5, 1, 2, 3 |
| Confidence | How sure are we | 0-100% |
| Effort | Person-weeks | Number |

---

## Sprint Ceremonies

### Sprint Planning
- Review prioritized backlog
- Select stories for sprint
- Break stories into tasks
- Commit to sprint goal

### Daily Standup
- What did I do yesterday?
- What will I do today?
- Any blockers?

### Sprint Review
- Demo completed work
- Gather stakeholder feedback
- Update backlog based on feedback

### Retrospective
- What went well?
- What could improve?
- Action items for next sprint

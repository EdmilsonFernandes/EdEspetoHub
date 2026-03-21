# Epic Template

Use this template when generating epics.

---

```markdown
# Epic: [Epic Name]

**ID**: [EPIC-XXX]
**Owner**: [Product owner name]
**Status**: [Discovery / Ready / In Progress / Done]
**Target**: [Quarter or release]

---

## Summary

[One paragraph describing the epic's purpose, scope, and expected outcome. Answer: What are we building and why?]

---

## Business Value

Why is this epic important?

- **Problem**: [What problem does this solve?]
- **Opportunity**: [What opportunity does this capture?]
- **Impact**: [Who benefits and how?]

### Strategic Alignment
[How does this epic support company/product strategy?]

---

## Success Metrics

How will we measure success?

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| [Metric 1] | [Current] | [Goal] | [When] |
| [Metric 2] | [Current] | [Goal] | [When] |
| [Metric 3] | [Current] | [Goal] | [When] |

---

## User Personas

Which personas benefit from this epic?

- **Primary**: [Persona name] - [How they benefit]
- **Secondary**: [Persona name] - [How they benefit]

---

## User Stories

[List of stories that make up this epic. Expand each with `/product story` command.]

### Must Have (P0)
1. **[Story title]**: As a [persona], I want [goal] so that [benefit].
2. **[Story title]**: As a [persona], I want [goal] so that [benefit].

### Should Have (P1)
3. **[Story title]**: As a [persona], I want [goal] so that [benefit].
4. **[Story title]**: As a [persona], I want [goal] so that [benefit].

### Could Have (P2)
5. **[Story title]**: As a [persona], I want [goal] so that [benefit].

---

## Scope

### In Scope
- [What's included 1]
- [What's included 2]
- [What's included 3]

### Out of Scope
- [What's NOT included 1]
- [What's NOT included 2]

---

## Dependencies

| Dependency | Type | Owner | Status |
|------------|------|-------|--------|
| [Dependency 1] | [Technical/Team/External] | [Who] | [Status] |
| [Dependency 2] | [Technical/Team/External] | [Who] | [Status] |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Mitigation strategy] |
| [Risk 2] | High/Med/Low | High/Med/Low | [Mitigation strategy] |

---

## Technical Considerations

[Key technical decisions, constraints, or architectural notes]

- [Consideration 1]
- [Consideration 2]

---

## Timeline

| Phase | Stories | Target |
|-------|---------|--------|
| Phase 1: [Name] | Stories 1-2 | [Sprint/Date] |
| Phase 2: [Name] | Stories 3-4 | [Sprint/Date] |
| Phase 3: [Name] | Story 5 | [Sprint/Date] |

---

## Open Questions

1. [Question needing resolution]
2. [Question needing resolution]

---

## Related

- **PRD**: [Link to PRD if exists]
- **Design**: [Link to designs]
- **Related Epics**: [Links to related epics]
```

---

## Guidelines for Creating Epics

### Epic Characteristics

- **Size**: Multiple sprints (typically 2-8 weeks)
- **Scope**: Complete feature or capability
- **Value**: Delivers measurable business value independently

### Epic vs Feature vs Story

| Level | Size | Example |
|-------|------|---------|
| Epic | Weeks-months | "User Authentication System" |
| Feature | Days-weeks | "Password Reset Flow" |
| Story | Hours-days | "User receives reset email" |

### Breaking Down Epics

Good epic breakdown:
1. Each story is independently valuable
2. Stories can be released incrementally
3. Highest priority stories first
4. 5-15 stories per epic typically

### MoSCoW Prioritization

- **Must**: Required for launch, non-negotiable
- **Should**: Important, expected by users
- **Could**: Nice to have, if time permits
- **Won't**: Out of scope (this release)

### Epic Lifecycle

```
Discovery → Ready → In Progress → Done
    ↓          ↓          ↓
 Research   Stories    Sprints
            defined    execute
```

### Definition of Ready (Epic)

Epic is ready when:
- [ ] Business value articulated
- [ ] Success metrics defined
- [ ] Stories identified (at least P0)
- [ ] Dependencies mapped
- [ ] Risks identified
- [ ] Rough estimate available

### Definition of Done (Epic)

Epic is done when:
- [ ] All P0 stories completed
- [ ] Success metrics measured
- [ ] Stakeholders accepted
- [ ] Documentation updated
- [ ] Learnings captured

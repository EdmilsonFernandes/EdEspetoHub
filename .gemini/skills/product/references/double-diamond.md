# Double Diamond Framework

The Double Diamond is a design process model with four phases, alternating between **divergent** (exploring broadly) and **convergent** (focusing narrowly) thinking.

```
    DISCOVER          DEFINE           DEVELOP          DELIVER
   (divergent)     (convergent)      (divergent)     (convergent)
       /\              /\                /\              /\
      /  \            /  \              /  \            /  \
     /    \          /    \            /    \          /    \
    /      \        /      \          /      \        /      \
   /        \      /        \        /        \      /        \
  /          \    /          \      /          \    /          \
 /            \  /            \    /            \  /            \
--------------------------------------------------------------------------------
   Problem Space                      Solution Space
```

## Phase 1: Discover (Divergent)

**Goal**: Understand the problem space without assumptions.

### Activities
- User interviews (open-ended, non-directive)
- Stakeholder conversations
- Observation and contextual inquiry
- Competitive analysis
- Market research
- Data analysis (usage metrics, support tickets)

### Key Questions
- Who are the users affected?
- What are they trying to accomplish?
- What frustrates them today?
- What does their environment look like?
- What workarounds do they use?

### Outputs
- Research notes and transcripts
- Pain point inventory
- Opportunity areas
- Competitive landscape analysis
- User quotes and observations

### Best Practices
- Talk to actual users, not just stakeholders
- Use open-ended questions, avoid leading
- Document everything (recordings, notes)
- Cast a wide net before narrowing
- Involve cross-functional team members

---

## Phase 2: Define (Convergent)

**Goal**: Synthesize findings into clear problem statements.

### Activities
- Affinity mapping (grouping insights)
- Persona creation
- Journey mapping
- Problem statement writing
- Success criteria definition
- Prioritization

### Key Questions
- What patterns emerge from research?
- Who is the primary user persona?
- What is the core problem to solve?
- What does success look like?
- What is out of scope?

### Outputs
- User personas
- Customer journey maps
- Problem statements
- Success criteria
- Prioritized opportunity list
- Requirements specification

### Problem Statement Format
```
[User persona] needs a way to [user need] because [insight from research].
We will know this is successful when [measurable outcome].
```

### Best Practices
- Synthesize before jumping to solutions
- Align stakeholders on the problem
- Make personas specific and realistic
- Define what success looks like measurably
- Be explicit about non-goals

---

## Phase 3: Develop (Divergent)

**Goal**: Generate and test multiple solutions.

### Activities
- Ideation and brainstorming
- Sketching and wireframing
- Prototyping (low to high fidelity)
- User testing
- Iteration based on feedback

### Key Questions
- What are all possible solutions?
- Which solutions address the core problem?
- How can we test cheaply?
- What did users think of the prototype?
- What needs to change?

### Outputs
- Solution concepts
- Wireframes and mockups
- Prototypes
- Test results and insights
- Refined solution direction
- User stories and epics

### Best Practices
- Generate many ideas before converging
- Start with low-fidelity prototypes
- Test early and often
- Fail fast, learn faster
- Involve users in testing

---

## Phase 4: Deliver (Convergent)

**Goal**: Build, launch, and measure the solution.

### Activities
- Final design and specification
- Development and implementation
- Quality assurance
- Launch preparation
- Metrics tracking
- Post-launch iteration

### Key Questions
- Does the solution meet requirements?
- Is it ready for users?
- How will we measure success?
- What's the rollout plan?
- How do we gather feedback?

### Outputs
- Production-ready solution
- Launch plan
- User documentation
- Success metrics dashboard
- Feedback mechanisms
- Iteration backlog

### Best Practices
- Start small (pilot, beta)
- Measure against success criteria
- Plan for user support
- Gather feedback continuously
- Iterate based on real usage

---

## Agile Integration

Double Diamond works cyclically with Agile. Each sprint can contain work from multiple phases.

### Dual-Track Approach

| Track | Focus | Cadence |
|-------|-------|---------|
| Discovery Track | Discover + Define | 1-2 sprints ahead |
| Delivery Track | Develop + Deliver | Current sprint |

### Mapping to Agile Artifacts

| DD Phase | Agile Artifact |
|----------|----------------|
| Discover | Research spikes, discovery tickets |
| Define | Epics, acceptance criteria |
| Develop | User stories, prototypes |
| Deliver | Implemented features, releases |

### Sprint Integration

- **Sprint Planning**: Pull from both discovery and delivery backlogs
- **Sprint Review**: Demo solutions, share research findings
- **Retrospective**: Improve both discovery and delivery processes

---

## Phase Transitions

### Discover → Define
**Ready when**: You have enough research to identify patterns and form hypotheses about user needs.

**Checklist**:
- [ ] Talked to 5+ users/stakeholders
- [ ] Documented key pain points
- [ ] Identified opportunity areas
- [ ] Team aligned on research findings

### Define → Develop
**Ready when**: You have a clear problem statement and success criteria.

**Checklist**:
- [ ] Problem statement written
- [ ] Primary persona defined
- [ ] Success metrics identified
- [ ] Scope boundaries clear (goals and non-goals)

### Develop → Deliver
**Ready when**: Solution validated through prototyping and user testing.

**Checklist**:
- [ ] Prototype tested with users
- [ ] Core solution direction chosen
- [ ] User stories written with acceptance criteria
- [ ] Technical feasibility confirmed

### Deliver → (Next Cycle)
**Ready when**: Solution launched and initial metrics gathered.

**Checklist**:
- [ ] Feature shipped to users
- [ ] Success metrics tracked
- [ ] User feedback collected
- [ ] Iteration opportunities identified

# PRD: Password Reset via Email

| Field | Value |
|-------|-------|
| **Author** | Maria Santos |
| **Created** | 2026-02-15 |
| **Status** | Approved |
| **Epic** | EPIC-042: User Authentication Improvements |
| **Target Release** | v2.4.0 (March 2026) |

---

## Problem Statement

Users who forget their passwords currently have no self-service recovery option and must contact support, leading to an average 4-hour resolution time and 150+ support tickets per week. This creates friction for users trying to access their accounts and increases support costs.

**User Impact**: ~600 users/month affected, 23% churn rate among users who can't recover access within 24 hours.

---

## Goals

1. **Reduce password-related support tickets by 80%** within 30 days of launch
2. **Enable users to reset passwords in under 2 minutes** (self-service)
3. **Maintain security standards** with time-limited, single-use reset tokens

---

## Non-Goals

1. Password reset via SMS (planned for future release)
2. Social login integration (separate initiative)
3. Password strength meter improvements (out of scope)
4. Admin password reset capabilities (different user flow)

---

## User Personas

### Primary: Casual User (Carlos)

Regular user who accesses the platform 2-3 times per week. Has multiple accounts across services and occasionally forgets credentials. Values quick, frictionless access.

- **Goals**: Get back into account quickly without waiting for support
- **Pain points**: Long support wait times, having to prove identity over email

### Secondary: Power User (Ana)

Daily user who rarely forgets passwords but needs reliable recovery for peace of mind. Security-conscious.

- **Goals**: Know that recovery is available if needed, ensure account stays secure
- **Pain points**: Worried about account takeover if reset is too easy

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | User can request password reset from login page | Must |
| FR-2 | System sends reset email within 2 minutes | Must |
| FR-3 | Reset link expires after 1 hour | Must |
| FR-4 | Reset link is single-use | Must |
| FR-5 | User can set new password meeting requirements | Must |
| FR-6 | User is logged in after successful reset | Should |
| FR-7 | All other sessions are invalidated on reset | Should |
| FR-8 | User receives confirmation email after reset | Should |
| FR-9 | Rate limit reset requests (max 3/hour per email) | Must |
| FR-10 | Show generic message for non-existent emails (security) | Must |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Email delivery time | < 2 minutes (95th percentile) |
| NFR-2 | Reset page load time | < 1.5 seconds |
| NFR-3 | Availability | 99.9% uptime |
| NFR-4 | Token security | Cryptographically secure, 256-bit |
| NFR-5 | Accessibility | WCAG 2.1 AA compliant |

---

## User Stories

1. **Request reset**: As a user who forgot my password, I want to request a reset link via email so that I can regain access to my account.

2. **Receive reset email**: As a user, I want to receive a reset email quickly so that I'm not waiting anxiously.

3. **Set new password**: As a user with a reset link, I want to set a new password so that I can access my account.

4. **Invalid link handling**: As a user with an expired or used link, I want clear guidance so that I know how to proceed.

---

## Success Metrics

| Metric | Baseline | Target | How Measured |
|--------|----------|--------|--------------|
| Password reset support tickets | 150/week | 30/week | Zendesk tag filter |
| Self-service completion rate | 0% | 85% | Analytics funnel |
| Time to reset (self-service) | N/A | < 2 min median | Analytics timestamp |
| Reset email delivery rate | N/A | 99.5% | SendGrid metrics |
| User satisfaction (reset flow) | N/A | 4.2/5.0 | Post-reset survey |

---

## Design

[Link to Figma mockups: figma.com/file/xxx]

Key design decisions:
- "Forgot password?" link prominent on login page
- Simple, single-field form for email entry
- Clear success message without revealing if email exists
- Password requirements shown inline during entry
- Success confirmation with "Return to login" CTA

---

## Technical Considerations

- **Email service**: SendGrid (existing integration)
- **Token generation**: Use crypto.randomBytes(32), store hashed
- **Token storage**: Redis with 1-hour TTL
- **Password hashing**: bcrypt with cost factor 12 (existing)
- **Rate limiting**: Redis-based, per email address

### Dependencies
- SendGrid API (existing)
- Redis cluster (existing)
- Email template service (existing)

### Migration
- None required, new feature

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Email deliverability issues | Medium | High | Monitor SendGrid metrics, implement retry logic |
| Abuse via reset spam | Medium | Medium | Rate limiting, CAPTCHA after 2 failures |
| Token leakage | Low | High | HTTPS only, short expiry, single-use |
| Users don't find reset link | Low | Medium | Prominent placement, A/B test copy |

---

## Timeline

| Milestone | Target Date |
|-----------|-------------|
| PRD approved | Feb 20 |
| Design complete | Feb 25 |
| Development start | Feb 26 |
| QA testing | Mar 5-8 |
| Staged rollout (10%) | Mar 10 |
| Full launch | Mar 15 |

---

## Open Questions

1. ~~Should we show password strength meter?~~ **Decided: No, out of scope**
2. Should confirmation email include IP/device info? **Pending security review**
3. Do we need audit logging for compliance? **Checking with legal**

---

## Appendix

### Competitive Analysis
- Competitor A: Email reset, 24h expiry, shows email exists
- Competitor B: Email + SMS, 1h expiry, generic message
- Competitor C: Email only, 30min expiry, CAPTCHA always

### User Research Quotes
> "I just want to get back in. I don't want to wait for someone to email me back." - User interview, Jan 2026

> "I get nervous when the reset is too easy. What if someone else resets my password?" - User interview, Jan 2026

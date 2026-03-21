# Sample User Stories

These examples demonstrate proper user story format with acceptance criteria.

---

## Story 1: Request Password Reset

# [AUTH-101] Request Password Reset Email

**Epic**: EPIC-042: User Authentication Improvements
**Priority**: Must
**Points**: 3
**Status**: Ready

---

## User Story

**As a** registered user who forgot my password,
**I want** to request a password reset link via email,
**So that** I can regain access to my account without contacting support.

---

## Acceptance Criteria

### Scenario: Successful reset request

- **Given** I am on the login page
- **When** I click "Forgot password?" and enter my registered email
- **Then** I see a confirmation message: "If this email is registered, you'll receive a reset link shortly"
  - **And** I receive an email with a reset link within 2 minutes

### Scenario: Unregistered email (security)

- **Given** I am on the forgot password page
- **When** I enter an email that is not registered
- **Then** I see the same confirmation message (don't reveal if email exists)
  - **And** no email is sent

### Scenario: Invalid email format

- **Given** I am on the forgot password page
- **When** I enter "notanemail"
- **Then** I see validation error: "Please enter a valid email address"
  - **And** the form is not submitted

### Scenario: Rate limited

- **Given** I have requested 3 reset emails in the last hour
- **When** I try to request another reset
- **Then** I see: "Too many requests. Please try again in [time remaining]"

---

## Validation Checklist

- [ ] "Forgot password?" link visible on login page
- [ ] Email field validates format before submission
- [ ] Confirmation message identical for valid/invalid emails
- [ ] Rate limit: max 3 requests per email per hour
- [ ] Reset link includes secure token (256-bit)
- [ ] Page is accessible (keyboard navigation, screen reader)

---

## Definition of Ready

- [x] User story follows standard format
- [x] Acceptance criteria are clear and testable
- [x] Story has been estimated (3 points)
- [x] Dependencies identified (SendGrid, Redis)
- [x] Design mockups available
- [x] Technical approach discussed
- [x] Product owner approved

---

## Notes

### Dependencies
- SendGrid email service configured
- Redis for rate limiting
- Email template created

### Out of Scope
- SMS reset option
- CAPTCHA (may add later based on abuse metrics)

---

---

## Story 2: Set New Password

# [AUTH-102] Set New Password via Reset Link

**Epic**: EPIC-042: User Authentication Improvements
**Priority**: Must
**Points**: 5
**Status**: Ready

---

## User Story

**As a** user with a valid password reset link,
**I want** to set a new password,
**So that** I can access my account with new credentials.

---

## Acceptance Criteria

### Scenario: Successful password reset

- **Given** I have a valid, unexpired reset link
- **When** I click the link and enter a password meeting requirements
- **Then** my password is updated
  - **And** I am logged into my account
  - **And** I receive a confirmation email
  - **And** all my other sessions are invalidated

### Scenario: Password doesn't meet requirements

- **Given** I am on the reset password page
- **When** I enter "12345" (too short, no letters)
- **Then** I see inline validation errors for each unmet requirement
  - **And** the form cannot be submitted

### Scenario: Passwords don't match

- **Given** I am on the reset password page
- **When** I enter different values in password and confirm fields
- **Then** I see error: "Passwords do not match"

### Scenario: Expired link

- **Given** I have a reset link older than 1 hour
- **When** I click the link
- **Then** I see: "This link has expired"
  - **And** I see a button to request a new reset link

### Scenario: Already used link

- **Given** I have already used a reset link
- **When** I click the same link again
- **Then** I see: "This link has already been used"
  - **And** I see a button to request a new reset link

---

## Validation Checklist

- [ ] Password minimum 8 characters
- [ ] Password contains at least one letter
- [ ] Password contains at least one number
- [ ] Password confirmation must match
- [ ] Cannot reuse last 3 passwords
- [ ] Token validated before showing form
- [ ] Token invalidated after successful use
- [ ] All other sessions invalidated on success
- [ ] Confirmation email sent after reset

---

## Definition of Ready

- [x] User story follows standard format
- [x] Acceptance criteria are clear and testable
- [x] Story has been estimated (5 points)
- [x] Dependencies identified
- [x] Design mockups available
- [x] Technical approach discussed
- [x] Product owner approved

---

## Notes

### Technical Approach
- Validate token exists and not expired before rendering form
- Hash token in database (don't store plaintext)
- Use database transaction for password update + token invalidation
- Invalidate sessions via session store (Redis)

### Dependencies
- AUTH-101 must be complete (generates the tokens)
- Session invalidation endpoint

---

---

## Story 3: Reset Confirmation Email

# [AUTH-103] Send Password Reset Confirmation

**Epic**: EPIC-042: User Authentication Improvements
**Priority**: Should
**Points**: 2
**Status**: Ready

---

## User Story

**As a** user who just reset my password,
**I want** to receive a confirmation email,
**So that** I know my password was changed and can take action if it wasn't me.

---

## Acceptance Criteria

### Scenario: Confirmation sent after reset

- **Given** I have successfully reset my password
- **When** the reset completes
- **Then** I receive a confirmation email within 1 minute
  - **And** the email includes the date/time of reset
  - **And** the email includes instructions if this wasn't me

### Scenario: Email content

- **Given** I receive a reset confirmation email
- **When** I read the email
- **Then** I see:
  - Subject: "Your password was reset"
  - Date and time of reset
  - "If this wasn't you, contact support immediately" with link
  - No sensitive information (no new password, no token)

---

## Validation Checklist

- [ ] Email sent within 1 minute of successful reset
- [ ] Email includes timestamp (user's timezone if known)
- [ ] Email includes support contact link
- [ ] Email does NOT include password or tokens
- [ ] Email template matches brand guidelines

---

## Definition of Ready

- [x] User story follows standard format
- [x] Acceptance criteria are clear and testable
- [x] Story has been estimated (2 points)
- [x] Email template designed
- [x] Product owner approved

---

## Notes

### Dependencies
- AUTH-102 triggers this email
- Email template service

### Out of Scope
- IP address / device info in email (pending security review)

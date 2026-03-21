# Persona: Carlos - The Casual User

**Role**: Marketing Coordinator
**Age**: 28-35
**Location**: Urban, works hybrid (office + home)
**Tech Savvy**: Medium

---

## Background

Carlos works at a mid-sized company managing social media and email campaigns. He uses 15+ different SaaS tools for work and has accounts on dozens of platforms. He's comfortable with technology but doesn't have time to become an expert in every tool—he just needs things to work.

He accesses our platform 2-3 times per week to check reports and adjust campaign settings. Because he uses so many tools, he occasionally forgets passwords, especially after vacations or busy periods when he hasn't logged in for a while.

---

## Goals & Motivations

1. **Get work done quickly**: Carlos values efficiency. He has back-to-back meetings and needs to pop in, make changes, and move on. Any friction costs him time and mental energy.

2. **Look competent**: He doesn't want to ask IT or support for help with "simple" things like password resets. He prefers self-service options that let him solve problems independently.

3. **Stay organized**: He tries to use a password manager but doesn't always remember to save new passwords. He appreciates tools that make recovery easy when he inevitably forgets.

---

## Pain Points & Frustrations

1. **Waiting for support**: When he can't reset his password himself, he has to email support and wait. This can take hours, and he has deadlines. "I just need to get in for 5 minutes to check something!"

2. **Proving identity**: Some platforms require him to answer security questions he set up years ago or provide information he doesn't remember. "I don't remember what my favorite movie was in 2019."

3. **Too many passwords**: He knows he should use unique passwords everywhere, but keeping track of them all is exhausting. "Every site has different requirements. I can never remember which variation I used."

---

## Behaviors & Habits

- **Multi-tasking**: Often has 20+ browser tabs open, switches between tasks frequently
- **Mobile-first for quick checks**: Uses phone for checking dashboards, laptop for detailed work
- **Saves passwords in browser**: Relies on Chrome to remember passwords (knows this isn't ideal)
- **Resets passwords reactively**: Only deals with password issues when locked out, not proactively

### Tools & Technology
- Chrome browser (primary)
- iPhone for mobile
- Slack for team communication
- Google Workspace for email/docs
- Various marketing SaaS tools

### Information Sources
- Google searches for quick answers
- YouTube tutorials for complex tasks
- Asks coworkers before contacting support
- Rarely reads documentation

---

## Quote

> "I don't want to think about passwords. I just want to get in, do my thing, and move on. If I forget my password, let me fix it in 30 seconds, not 30 minutes."

---

## Scenario

**Tuesday, 2:30 PM**: Carlos has a meeting in 30 minutes and realizes he needs to pull a report from our platform. He hasn't logged in since before his vacation two weeks ago.

He types his usual password—wrong. Tries a variation—still wrong. His third attempt locks him out.

**What he wants**: A "Forgot password?" link that sends him a reset email immediately. He can reset, grab the report, and get to his meeting.

**What frustrates him**: If he has to wait for support, he'll miss pulling the report before the meeting. He'll have to admit he "couldn't get in" and ask a colleague to pull it instead.

---

## Success Criteria

- Can reset password and access account in under 2 minutes
- Doesn't need to contact support or another person
- Doesn't need to remember security questions or obscure info
- Gets clear feedback at each step (knows the email is coming)

---

## Anti-Patterns

What would frustrate or drive away Carlos:

- **Long wait times**: Anything over 5 minutes feels like an eternity
- **Complicated verification**: Security questions, SMS codes to a phone he doesn't have nearby
- **Unclear status**: Not knowing if the reset email was sent or if he should check spam
- **Technical jargon**: Error messages that don't tell him what to do next
- **Forced password complexity**: 20-character passwords with symbols frustrate him

---

## Related Personas

- **Ana (Power User)**: Uses platform daily, security-conscious, wants robust account protection. Different needs around reset flow security.
- **David (Admin)**: Manages multiple user accounts, needs admin tools for resetting other users' passwords. Different feature set.

---

## Design Implications

For Carlos, the reset flow should:
- Be discoverable (prominent "Forgot password?" link)
- Be fast (email within 2 minutes)
- Be simple (just email, click link, new password)
- Give clear feedback (success messages, check spam hint)
- Not require him to remember anything except his email

# WiBOO General Conventions

This document dictates stylistic rules, syntax constraints, and administrative conventions needed to write compliant WiBOO code.

## 1. Naming Conventions

Ensuring a clean visual differentiation among types of entities.

| Entity Type | Standard Style | Example |
| ----------- | -------------- | ------- |
| **Classes & Models** | PascalCase | `AuthenticationV3Handler` |
| **Methods & Variables** | camelCase | `findUserNameByIdentifier` |
| **File Names** | kebab-case + type suffix | `authentication.handler.ts`, `auth-wl-user.dao.ts` |
| **DB Columns/Tables** | snake_case | `user_directory_id`, `whitelabels_users` |

*File Type Suffixes:* Always append the internal concept (`.service`, `.handler`, `.dao`, `.controller`, `.validator`, `.constant`). Example: `token.service.ts`.

## 2. Structural & Syntax Code Style

We follow an enforcement of the following formatting properties via ESLint & Prettier:

1. **Indentation:** 4 spaces (No Tabs).
2. **Line Length Limit:** Maximally 165 characters.
3. **Brace Style:** Allman style. Opening block braces always sit on their own new line.
    ```typescript
    // Correct
    if (condition)
    {
        return value;
    }
    
    // Incorrect
    if (condition) {
        return value;
    }
    ```
4. **Typing Restrictions:** Strongly type all variables and method return values. Disallow `any` entirely; prefer `unknown` coupled with TypeGuards.

## 3. Documentation Requirements

### TSDoc/JSDoc Usage
Document public API boundaries, DAO methods, and Orchestrators in **English Only**.
Documentation blocks must mention:
* Method purpose/responsibility.
* Quirks, caching implications, or query limitations (e.g. "Only invokes `users.user_name` to save load processing").
* Explicitly cite `@param` and `@returns` blocks.
* Document `@throws` when custom exceptions are thrown natively (e.g., `UserNotFoundException`).

### Header Signatures
Critical codebase files traditionally bear the WiBOO Confidential Header stating ownership and last-update metadata. Example:
```typescript
/*
 * WiBOO CONFIDENTIAL
 * ------------------
 * Copyright (C) 202X Ecossistema Negócios Digitais LTDA - All Rights Reserved.
 *
 * @file filename.ts
 * @author Author Name <author@wiboo.io>
 * @date Weekday, Day Month Year
 */
```

## 4. Database Migrations

Database operations rely on **Liquibase YAML**. Hand-coded SQL strings for structural creation are banned.
- Add changeset blocks explicitly mentioning standard metadata attributes (`id`, `author`).
- Provide human-readable English references inside `remarks` / `comment`.

```yaml
databaseChangeLog:
    - changeSet:
          id: add-status-control
          author: Developer Name
          changes:
              - addColumn:
                    tableName: my_domain_table
                    columns:
                        - column:
                              name: action_status
                              type: VARCHAR(20)
                              remarks: Track current entity status pipeline progression
```

## 5. API Layer Definitions (`wiboo.apis`)

When creating endpoints, adhere to the standard format utilized across the `wiboo.apis` repositories:

### HTTP Controllers
1. **Base Class:** All controllers must extend `BaseController`.
2. **Registration:** Route configuration must happen inside the strict `public defineRoutes(): void` method by making calls like `this.router.post('/endpoint', this.methodName.bind(this));`.
3. **Request Methods:** Route handlers receive typed parameters: `(request: IRequest, response: Response)`.
   - Access headers or custom contexts securely via `request.context`.
   - Access the currently authenticated session state via `request.session`.
4. **Validation:** Input extraction and verification occurs at the controller level; failures should throw through standard custom error mappers like `ExceptionsBuilder.httpExceptionBuilder()`.

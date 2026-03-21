# EdEspetoHub (JaNoCaminho) Architecture Guide

Welcome to the EdEspetoHub backend. This project follows a modern, class-driven architecture powered by Inversion of Control (IoC).

## High-Level Overview

The backend is structured as a **Monolith-DAO** architecture. Every component is a managed class, registered in a central container and injected where needed. This ensures strict **Separation of Concerns** and high **Testability**.

### Architectural Layers

Click on a layer to read the detailed documentation:

1.  [**IoC & Dependency Injection**](./docs/architecture/IOC_INJECTION.md): How we use InversifyJS to wire the application.
2.  [**Presentation Layer (Controllers)**](./docs/architecture/CONTROLLER_LAYER.md): How we handle HTTP requests and declarative routing.
3.  [**Business Layer (Services)**](./docs/architecture/SERVICE_LAYER.md): Where the core logic lives and how we define response contracts.
4.  [**Data Access Layer (DAO)**](./docs/architecture/DAO_LAYER.md): Our custom DTO-mapped TypeORM implementation.
5.  [**Jobs & Utilities**](./docs/architecture/JOBS_AND_UTILS.md): Managed background tasks and injectable helper classes.

---

## Quick Start for Developers

### 1. Adding a new Feature
- Create an **Entity** in `src/entities/`.
- Define a **DTO** in `src/models/dtos/` with `@DtosEntity` and `@DtoAttr`.
- Create a **DAO** in `src/database/dao/` extending `GenericDao`.
- Define a **Response Model** in `src/models/response/`.
- Implement business logic in a **Service** in `src/services/`.
- Expose via a **Controller** in `src/controllers/` using routing decorators.

### 2. General Rules
- **No `any`**: Use strict typing and response models.
- **Constructor Injection**: Never instantiate dependencies manually with `new`.
- **Statelessness**: All managed classes should be stateless (Singletons).
- **TSDoc**: Include TSDoc headers in every new file.

### 3. Folder Structure
```text
src/
├── controllers/    # Express Controllers
├── services/       # Domain Business Logic
├── database/
│   └── dao/        # Data Access Objects
├── models/
│   ├── dtos/       # Data Transfer Objects
│   └── response/   # API Response Models
├── entities/       # TypeORM Entities
├── middleware/     # Custom Middleware Classes
├── jobs/           # Managed Cron Jobs
├── utils/          # Injectable Utility Classes
└── ioc/            # IoC Container and Tokens
```

---
© 2025-2026 Chama no espeto - All Rights Reserved.

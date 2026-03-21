# Inversion of Control (IoC) & Injection

The project uses **InversifyJS** to manage dependencies. This allows for a decoupled architecture where classes depend on abstractions rather than concrete implementations.

## Core Concepts

### 1. The Container
A central container (`src/ioc/ioc.ts`) holds all class bindings. It is configured to automatically bind classes using `inversify-binding-decorators`.

### 2. Auto-Discovery
The `ioc.loader.ts` script scans the `src/` directory for files and automatically registers classes decorated with `@Provide`. This eliminates the need for manual binding in the main entry point.

### 3. @Provide and @Inject
- **`@Provide(Token)`**: Registers a class into the container.
- **`@Inject(Token)`**: Injects a dependency into a class constructor.

### 4. Injection Tokens
All identifiers used for injection are centralized in `src/ioc/injectiontokens.ts`. This ensures that we have a single source of truth for all service, controller, and DAO names.

```typescript
// src/ioc/injectiontokens.ts
export const Tokens = {
  Common: {
    Service: {
      AuthService: Symbol('AuthService'),
    }
  }
}
```

## How to add a new Service/DAO
1. **Define the Token**: Add a new `Symbol` to `injectiontokens.ts`.
2. **Create the Class**: Create your class file.
3. **Decorate**: Use `@Provide(Tokens.Common.Service.MyNewService)` on the class.
4. **Inject**: Use `@Inject` in the constructor of other classes that need it.

## Benefits
- **Testability**: Dependencies can be easily mocked in tests.
- **Maintainability**: Changing an implementation only requires updating the `@Provide` decorator.
- **Scalability**: New layers can be added without bloating the main application file.

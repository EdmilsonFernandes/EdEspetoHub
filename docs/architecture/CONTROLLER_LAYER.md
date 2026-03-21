# Presentation Layer (Controllers)

Controllers are the entry points for external HTTP requests. They manage routing, middleware application, and response formatting.

## Core Concepts

### 1. BaseController
All controllers MUST extend `BaseController`. It provides:
- **Automated Routing**: Routes defined via decorators are automatically mounted.
- **Helper Methods**: `this.ok()`, `this.created()`, `this.notFound()`, `this.fail()`.
- **Integrated Error Handling**: Standardized error responses using project-specific codes.

### 2. Routing Decorators
Routes are defined declaratively at the method level:
- `@Get(path)`
- `@Post(path)`
- `@Put(path)`
- `@Delete(path)`

### 3. Protection Decorators
Security and business rules are applied via decorators:
- `@Authorize()`: Requires a valid Bearer token.
- `@Roles('ADMIN', 'MOTOBOY')`: Restricts access to specific user roles.
- `@SubscriptionActive()`: Ensures the store has an active subscription.
- `@RequireFeature('delivery')`: Checks if the current plan supports a feature.

### 4. Implementation Example

```typescript
@RouterController(Tokens.Common.Controller.OrderController)
export class OrderController extends BaseController {
  constructor(
    @Inject(Tokens.Common.Service.OrderService) private orderService: OrderService
  ) {
    super('/orders'); // Base path: /api/v1/orders
  }

  @Get('/:id')
  @Authorize()
  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const order = await this.orderService.getById(req.params.id);
      return this.ok(res, order);
    } catch (error) {
      return this.fail(res, error, req);
    }
  }
}
```

## Rules
1. **No Business Logic**: Delegate all domain logic to a Service.
2. **Explicit Returns**: Methods must return `Promise<Response>`.
3. **Registration**: Ensure the controller is registered in `ioc/injectiontokens.ts`.

# WiBOO Coding Patterns & Implementation Guidelines

We implement highly structured execution paths relying on Decorators, Inversion of Control (IoC), and Domain-Driven Design concepts. Standardize your solutions using the following patterns:

## Microservice Implementation Patterns

### 1. API Controllers (`wiboo.apis`)
The entry point of requests coming from the outside world.
**Strict Rules:**
- Must use `@ApiController(InjectionTokens)` to register the route grouping.
- Enforce secure access using contextual decorators like `@AuthenticationRequired()` (user JWT validation) or `@EnterpriseRequired()` (B2B tenant validation).
- Controllers should rarely implement business rules; their primary responsibility is to parse inputs, invoke domain adapters, format errors via `ExceptionsBuilder`, and dispatch payloads to Client Libraries.

### 2. Microservice Broker Clients (Shared Libs)
Packages handling requests bridging to backend domains (e.g. `cpm-lib`, `des-lib`).
**Strict Rules:**
- The class must be tagged with `@MicroserviceBusController(Token, { clientConnectors: [JsonicTokens, ...] })` to declare available outbounds. 
- Requests must be correctly wrapped using structural envelopes containing telemetry contexts for distributed tracing (`TraceContext`).
- Interaction with the physical bus occurs using `this.myMicroserviceBus$.act` (sync) or `.actAsync` (async fire-and-forget). The output expects a `MicroserviceResponse<U>`.

### 3. Queue Handlers (Module Entry Points)
Handlers process events from the broker.

**Key Decorators:**
- `@MicroserviceBusController(Token)`: Registers the class as a message subscriber.
- `@Add(ActionToken)`: Declares that a specific handler method responds to a particular broker queue routing key (`JsonicToken`).
- `@MethodMetrics()`: Used strictly across handler implementations to capture service observability statistics.

**Example Pattern:**
```typescript
@MicroserviceBusController(InjectionToken.v3.Handlers.MyHandler)
export class MyFlowHandler extends OnInit {
    constructor(
        @Inject(CommonTokens.Logger) private readonly logger: LoggerService,
        @Inject(FlowTokens.Orchestrator) private readonly orchestrator: MyFlowOrchestrator
    ) {
        super();
    }

    @Add(JsonicTokens.v3.Action.MyAction)
    @MethodMetrics()
    protected async handle(req: MicroserviceRequest<Payload>): Promise<MicroserviceResponse<Result>> {
        return {
            when: Date.now(),
            status: MicroserviceProcessStatus.Success,
            data: await this.orchestrator.execute(req.context, req.data)
        };
    }
}
```

### 2. Dependency Injection (IoC)
Avoid hard coupling files by directly instantiating objects. 

- Use `@Provide(Token)` on the target Service/DAO.
- Use `@Inject(Token)` in the constructor of the file requiring it.

Tokens are strictly grouped under logical domains in centralized constant files (`injection.token.constant.ts`).

### 3. V3 Diagram-Driven Design (BPMN framework)
Flows are constructed using `@BpmnDiagram` structures forming a chain of responsibility. Handlers DO NOT implement business logic; they validate input and pass it to an `Orchestrator` which initializes an executable sequence of modular Operations. 

## Data Access Patterns

### 1. Abstract CRUD Inheritance
Data Access Objects (DAO) must inherit `AbstractCRUD<Dto, Entity>` passing their definition format.

```typescript
@Provide(InjectionToken.v3.Services.Dao.AuthWlUser)
export class AuthWlUserDao extends AbstractCRUD<WhitelabelsUsersDto, WhitelabelsUsersEntity> {
    constructor() {
        super(WhitelabelsUsersDto);
    }
}
```

### 2. Partition Filtering & Safe Queries
When querying whitelabel scoped tables, **every database request MUST include the `wlc` filter.**
You fetch the mapped generic profile using the context:
```typescript
.where('wl_user.wlc = :wlc', { wlc: await this.getMainWlc(context.wlc) })
```

### 3. Caching Decorator
Instead of manually manipulating Redis sets, cache output transparently:
- `@CachedRetrieve(TimeInSeconds, shouldInvalidate, ServiceName)` wraps class methods. Cache automatically maps method arguments as part of the caching key.

```typescript
@CachedRetrieve(TimeInSeconds.ONE_MINUTE, false, ServiceName.CPM)
public async getSetting(key: string): Promise<string> { ... }
```

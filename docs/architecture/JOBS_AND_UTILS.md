# Jobs and Utilities

## 1. Job Orchestration (Cron Tasks)

Background tasks are managed by a centralized orchestrator to ensure they are properly initialized and protected.

### Core Concepts
- **`BaseJob`**: Abstract class providing `tick()`, `execute()`, and `isRunning` protection. All specific jobs must inherit from it.
- **`JobOrchestrator`**: The entry point that starts and stops all registered jobs.

### Implementation Example
```typescript
@Provide(Tokens.Jobs.DeliveryExpirationJob)
export class DeliveryExpirationJob extends BaseJob {
  protected jobName = 'DeliveryExpirationJob';
  protected intervalMs = 2 * 60 * 1000; // 2 minutes

  constructor(
    @Inject(Tokens.Utils.LoggerService) protected readonly logger: LoggerService,
    @Inject(Tokens.Common.DataLayer.OrderDeliveryRepository) private readonly orderDeliveryDao: OrderDeliveryDao
  ) {
    super();
  }

  protected async execute(): Promise<void> {
    await this.orderDeliveryDao.expireAvailableDeliveries();
  }
}
```

---

## 2. Utility Layer

Utilities are refactored into injectable classes to support separation of concerns and testability.

### Core Utility Classes
- **`FileUtil`**: Base64 image saving and directory management.
- **`StringUtil`**: Slugification and formatting.
- **`CryptoUtil`**: Access tokens and cryptographic operations.
- **`ValidationUtil`**: Domain-specific validation (CPF, CNPJ).
- **`BusinessUtil`**: Shared domain logic (Store segments, availability).

### How to use
Instead of importing a static function, inject the Utility class into your constructor:

```typescript
constructor(
  @Inject(Tokens.Utils.FileUtil) private readonly fileUtil: FileUtil
) {}
```

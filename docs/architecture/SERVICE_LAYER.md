# Business Layer (Services)

Services contain the core logic of the application. They sit between the Controllers and the Data Access Layer (DAOs).

## Core Responsibilities
- **Business Logic**: Implementing complex rules and workflows.
- **Coordination**: Managing multiple DAOs or other Services.
- **Data Transformation**: Mapping internal entities/DTOs to specific Response Models.

## Rules for Services

### 1. No Framework Logic
Services should not know about HTTP requests, responses, or specific DB transactions (unless using the `databaseService.dataSource.transaction` helper). They should be pure business logic.

### 2. Strict Return Types
Always define a return type for every public method. Use models from `src/models/response/` to ensure the contract with the Controller is stable.

### 3. Implementation Example

```typescript
@Provide(Tokens.Common.Service.ProductService)
export class ProductService {
  constructor(
    @Inject(Tokens.Common.DataLayer.ProductRepository) private productDao: ProductDao,
    @Inject(Tokens.Utils.FileUtil) private fileUtil: FileUtil
  ) {}

  public async create(input: CreateProductDto): Promise<ProductResponse> {
    // 1. Process files
    const imageUrl = await this.fileUtil.saveBase64Image(input.imageFile);

    // 2. Persist data via DAO
    const product = await this.productDao.create({ ...input, imageUrl });
    const saved = await this.productDao.save(product);

    // 3. Return mapped response
    return this.mapToResponse(saved);
  }
}
```

## When to create a Service?
- If you have logic that spans multiple entities.
- If you need to perform actions like sending emails, processing payments, or saving files.
- If the controller method is becoming too complex.

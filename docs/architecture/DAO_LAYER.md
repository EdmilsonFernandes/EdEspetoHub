# Data Access Layer (DAO)

The DAO layer is responsible for all interactions with the database. It provides a clean, DTO-mapped abstraction over TypeORM.

## Core Concepts

### 1. GenericDao<D, E>
Every DAO must extend the `GenericDao` class. This class provides standard CRUD operations:
- `readAll()`: Returns all entities.
- `getById(id)`: Returns a single entity by ID.
- `save(data)`: Creates or updates an entity.
- `delete(id)`: Removes an entity.
- `create(data)`: Instantiates a new entity from DTO data.

### 2. DTO-to-Entity Mapping
We use a custom decorator system to define the contract between the database and the application.

```typescript
@DtosEntity(User) // Links the DTO to the User Entity
export class UserDto {
  @DtoAttr() // Marks the property for automatic mapping
  id: string;

  @DtoAttr()
  email: string;

  // The entity$ property is required for the mapping metadata
  entity$?: GenericDto<UserDto, User>;
}
```

### 3. Implementation Example

```typescript
@Provide(Tokens.Common.DataLayer.UserRepository)
export class UserDao extends GenericDao<UserDto, User> {
  constructor() {
    super(UserDto); // Pass the DTO class to the parent
  }

  // Custom queries use the underlying TypeORM repository
  async findByEmail(email: string) {
    const repo = await this.getRepository();
    return repo.findOne({ where: { email } });
  }
}
```

## Why this pattern?
- **Separation of Concerns**: The DB schema (Entity) is isolated from the application model (DTO).
- **Type Safety**: TypeScript ensures that only valid fields are mapped and returned.
- **Consistency**: All DAOs share the same base behavior and injection pattern.

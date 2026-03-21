import 'reflect-metadata';

export type EntityType<T> = { new(): T };
const DTO_PROPERTIES = 'dto:properties';
const DTO_ENTITY = 'dto:entity';

export function DtosEntity<T, C extends { new(...args: any[]): T }>(entityClass: C)
{
  return function <O extends { new(...args: any[]): {} }>(target: O)
  {
    // Store the entity class on the target constructor
    Reflect.defineMetadata(DTO_ENTITY, entityClass, target);

    return class extends target
    {
      public get entity$()
      {
        const keys: string[] = Reflect.getMetadata(DTO_PROPERTIES, target) || [];
        return new GenericDto<O, T>(entityClass, keys, this);
      }
    };
  };
}

export function DtoAttr()
{
  return function (target: any, propertyKey: string): void
  {
    const properties: string[] = Reflect.getMetadata(DTO_PROPERTIES, target.constructor) || [];
    if (!properties.includes(propertyKey))
    {
      properties.push(propertyKey);
      Reflect.defineMetadata(DTO_PROPERTIES, properties, target.constructor);
    }
  };
}

export class GenericDto<O, T>
{
  constructor(
    public entity: EntityType<T>,
    private readonly keys: Array<string>,
    private readonly _instance: any
  ) { }

  public fromEntity(entity: Partial<T> | undefined | null): O
  {
    if (!entity || typeof entity !== 'object')
    {
      return this._instance;
    }
    this.keys
      .filter(key => key !== 'entity$')
      .forEach((key: string) =>
      {
        const value = (entity as Record<string, any>)[ key ];
        if (value !== undefined) this._instance[ key ] = value;
      });

    return this._instance;
  }

  public toDto(entity: T): O
  {
    return entity as unknown as O;
  }

  public static getEntityFromDto<T>(dto: { new(...args: any[]): any }): EntityType<T>
  {
    // Try to get metadata from the constructor directly (class decorators might wrap it)
    let entityClass = Reflect.getMetadata(DTO_ENTITY, dto);
    
    // If not found, try the prototype (to handle cases where the class was extended by the decorator)
    if (!entityClass && (dto as any).prototype) {
        entityClass = Reflect.getMetadata(DTO_ENTITY, Object.getPrototypeOf(dto));
    }

    if (!entityClass)
    {
      // Fallback: Try to instantiate once to see if it's using the old getter pattern
      try {
          const instance = new dto();
          if (instance.entity$) {
              return instance.entity$.entity;
          }
      } catch (e) {
          // Ignore instantiation errors
      }
      throw new ReferenceError(`Class ${dto.name} is not a valid DTO! Missing @DtosEntity decorator.`);
    }

    return entityClass;
  }
}

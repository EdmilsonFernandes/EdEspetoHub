import 'reflect-metadata';

export type EntityType<T> = { new(): T };
const DTO_PROPERTIES = 'dto:properties';

export function DtosEntity<T, C extends { new(...args: any[]): T }>(entityClass: C)
{
  return function <O extends { new(...args: any[]): {} }>(target: O)
  {
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

  public static getEntityFromDto<T>(dto: { new(): any }): EntityType<T>
  {
    const dtoInstance = new dto();

    if (!dtoInstance.entity$)
    {
      throw new ReferenceError('This is not a valid DTO!');
    }

    return dtoInstance.entity$.entity;
  }
}

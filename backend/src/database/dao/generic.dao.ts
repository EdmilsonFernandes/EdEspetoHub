import { unmanaged } from 'inversify';
import { Tokens } from '../../ioc/injectiontokens';
import { Inject, Provide } from '../../ioc/ioc';
import 'reflect-metadata';
import {
  DeepPartial,
  FindOneOptions,
  FindOptionsWhere,
  ObjectId,
  ObjectLiteral,
  QueryRunner,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DatabaseService } from '../data-base.service';
import { GenericDto } from '../../decorators/decoratos.dto';

@Provide(Tokens.Common.DataLayer.GenericDao)
export abstract class GenericDao<D extends ObjectLiteral, E extends ObjectLiteral> {
  protected myRepository: Repository<E>;

  @Inject(Tokens.Common.DataLayer.DatabaseService)
  protected databaseService: DatabaseService;

  protected entityClass: { new (): E };

  constructor(@unmanaged() protected dtoClass: { new (): D }) {
    if (!dtoClass) {
      throw new Error('No DTO found in constructor');
    }
    this.entityClass = GenericDto.getEntityFromDto<E>(dtoClass);
  }

  public async readAll(): Promise<E[]> {
    const repository = await this.getRepository();
    return await repository.find();
  }

  public async save(object: DeepPartial<E>): Promise<E> {
    const repository = await this.getRepository();
    return repository.save(object);
  }

  public async delete(
    object: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<E>
  ): Promise<boolean> {
    const repository = await this.getRepository();
    const result = await repository.delete(object as any);
    return result.affected !== 0;
  }

  public async getById(id: string): Promise<E | null> {
    const repository = await this.getRepository();
    return await repository.findOne({ where: { id } } as any);
  }

  public async read(options: FindOneOptions<E>): Promise<E | null> {
    const repository = await this.getRepository();
    return await repository.findOne(options);
  }

  public async update(criteria: any, object: QueryDeepPartialEntity<E>): Promise<boolean> {
    const repository = await this.getRepository();
    const result = await repository.update(criteria, object);
    return (result.affected || 0) > 0;
  }

  public async getRepository(): Promise<Repository<E>> {
    if (!this.myRepository) {
      this.myRepository = this.databaseService.dataSource.getRepository<E>(this.entityClass);
    }
    return this.myRepository;
  }

  public async getQueryRunner(): Promise<QueryRunner> {
    return this.databaseService.dataSource.createQueryRunner();
  }

  public async create(data: DeepPartial<E>): Promise<E> {
    const repository = await this.getRepository();
    return repository.create(data);
  }

  protected createDto(): D {
    return new this.dtoClass();
  }
}

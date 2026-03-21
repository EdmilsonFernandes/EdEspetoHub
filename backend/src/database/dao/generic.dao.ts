import { unmanaged } from 'inversify';
import { Tokens } from '../../ioc/injectiontokens';
import { Inject, Provide } from '../../ioc/ioc';
import 'reflect-metadata';
import {
  DeepPartial,
  FindOneOptions,
  FindOptionsWhere,
  InsertResult,
  ObjectId,
  ObjectLiteral,
  QueryRunner,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DatabaseService } from '../data-base.service';

@Provide(Tokens.Common.DataLayer.GenericDao)
export abstract class GenericDao<E extends ObjectLiteral> {
  protected myRepository!: Repository<E>;

  @Inject(Tokens.Common.DataLayer.DatabaseService)
  protected databaseService: DatabaseService;

  constructor(@unmanaged() protected entity: { new (): E }) {
    if (!entity) {
      throw new Error('No entity found in constructor');
    }
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
      this.myRepository = this.databaseService.dataSource.getRepository<E>(this.entity);
    }
    return this.myRepository;
  }

  public async getQueryRunner(): Promise<QueryRunner> {
    return this.databaseService.dataSource.createQueryRunner();
  }
}

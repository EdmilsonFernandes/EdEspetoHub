import { Router } from 'express';
import { StoresController } from './stores.controller';
import { StoreLib } from '../../libs/store.lib';
import { CommandProducer } from '../../bus/command-producer';
export function createStoreRoutes(producer: CommandProducer): Router {
    const ctrl = new StoresController(new StoreLib(producer));
    const r = Router();
    r.get('/:slug', ctrl.getBySlug.bind(ctrl));
    r.get('/:slug/products', ctrl.listProducts.bind(ctrl));
    r.get('/:slug/categories', ctrl.listCategories.bind(ctrl));
    r.get('/:slug/tables/status', ctrl.getTableStatus.bind(ctrl));
    return r;
}

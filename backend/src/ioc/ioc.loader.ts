import { globSync } from 'glob';
import { buildProviderModule } from 'inversify-binding-decorators';
import path from 'path';
import { container } from './ioc';

// Detecta se estamos rodando em src (dev) ou dist (build)
const isTs = !__dirname.includes('dist');
const extension = isTs ? 'ts' : 'js';
const baseDir = path.resolve(__dirname, '..');

// Diretórios a serem carregados automaticamente

//TO-DO: CHANGE directories
const patterns = [
  path.join(baseDir, 'services', '**', `*.${extension}`),
  path.join(baseDir, 'database', 'dao', '**', `*.${extension}`),
  path.join(baseDir, 'controllers', '**', `*.${extension}`),
  path.join(baseDir, 'middleware', '**', `*.${extension}`),
  path.join(baseDir, 'utils', '**', `*.${extension}`),
  path.join(baseDir, 'api', '**', `*.${extension}`),
  path.join(baseDir, `app.${extension}`),
];

patterns.forEach(pattern => {
  const files = globSync(pattern);
  console.log(`🔍 Buscando com padrão: ${pattern}`);
  files.forEach(file => {
    console.log('🧩 IoC load:', file);
    require(file);
  });
});

container.load(buildProviderModule());

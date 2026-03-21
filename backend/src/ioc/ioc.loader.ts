import { globSync } from 'glob';
import { buildProviderModule } from 'inversify-binding-decorators';
import path from 'path';
import { container } from './ioc';

// Detecta se estamos rodando em src (dev) ou dist (build)
const isTs = !__dirname.includes('dist');
const extension = isTs ? 'ts' : 'js';
const baseDir = path.join(__dirname, '..');

// Diretórios a serem carregados automaticamente

//TO-DO: CHANGE directories
const patterns = [
  path.join(baseDir, 'services', '**', `*.${extension}`),
  path.join(baseDir, 'common', '**', `*.${extension}`),
  path.join(baseDir, 'database', '**', `*.${extension}`),
  path.join(baseDir, 'models', '**', `*.${extension}`),
  path.join(baseDir, 'controllers', '**', `*.${extension}`),
  path.join(baseDir, 'middleware', '**', `*.${extension}`),
  path.join(baseDir, 'jobs', '**', `*.${extension}`),
  path.join(baseDir, 'utils', '**', `*.${extension}`),
  path.join(baseDir, 'api', '**', `*.${extension}`),
  path.join(baseDir, `app.${extension}`),
];

patterns.forEach(pattern => {
  const files = globSync(pattern);
  console.log(`🔍 Buscando com padrão: ${pattern}`);
  files.forEach(file => {
    // Evita carregar arquivos de teste ou o próprio loader
    if (file.includes('.test.') || file.includes('ioc.loader')) return;
    
    console.log('🧩 IoC load:', file);
    require(file);
  });
});

container.load(buildProviderModule());

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client, type ClientConfig } from 'pg';

type PresenceMap = {
  dev: boolean;
  test: boolean;
  entity: boolean;
  ddl: boolean;
};

type DbColumn = {
  name: string;
  ordinal: number;
  type: string;
  isNullable: boolean;
  defaultValue: string | null;
};

type DbForeignKey = {
  constraintName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  updateRule: string | null;
  deleteRule: string | null;
};

type DbConstraint = {
  name: string;
  type: string;
  columns: string[];
  referencedTable: string | null;
  referencedColumns: string[];
  updateRule: string | null;
  deleteRule: string | null;
  checkClause: string | null;
};

type DbIndex = {
  name: string;
  definition: string;
  isUnique: boolean;
  isPrimary: boolean;
};

type DbTable = {
  name: string;
  columns: DbColumn[];
  foreignKeys: DbForeignKey[];
  constraints: DbConstraint[];
  indexes: DbIndex[];
};

type DatabaseSnapshot = {
  label: 'dev' | 'test';
  database: string;
  tables: Map<string, DbTable>;
};

type EntityColumnMeta = {
  name: string;
  propertyName: string;
  type: string;
  isNullable: boolean;
  isPrimary: boolean;
  defaultValue: string | null;
};

type EntityRelationMeta = {
  propertyName: string;
  relationType: string;
  targetTable: string;
  joinColumns: string[];
};

type EntityTableMeta = {
  tableName: string;
  entityName: string;
  filePath: string | null;
  columns: EntityColumnMeta[];
  relations: EntityRelationMeta[];
};

type DdlOperation = {
  filePath: string;
  line: number;
  operation: string;
};

type TableDoc = {
  name: string;
  group: string;
  description: string;
  responsibility: string;
  presence: PresenceMap;
  documentedFrom: 'dev' | 'test' | 'entity' | 'unknown';
  entity: EntityTableMeta | null;
  table: DbTable | null;
  relations: Array<DbForeignKey | EntityRelationMeta>;
  constraints: DbConstraint[];
  indexes: DbIndex[];
  ddlOperations: DdlOperation[];
  driftNotes: string[];
  columns: Array<{
    name: string;
    type: string;
    isNullable: boolean;
    defaultValue: string | null;
    responsibility: string;
    inDev: boolean;
    inTest: boolean;
    inEntity: boolean;
    isPrimary: boolean;
  }>;
};

const backendRoot = path.resolve(__dirname, '../..');
const srcRoot = path.join(backendRoot, 'src');
const entitiesRoot = path.join(srcRoot, 'entities');
const docsRoot = path.join(backendRoot, 'docs');
const docsOutput = path.join(docsRoot, 'database-schema.html');
const testEnvPath = path.join(backendRoot, '.env.test');

const TABLE_DESCRIPTION_OVERRIDES: Record<string, string> = {
  access_logs: 'Trilha de acessos administrativos e operacionais usada para auditoria e suporte.',
  condominiums: 'Cadastro mestre de condomínios atendidos pela plataforma.',
  condominium_access_requests: 'Solicitações de entrada/onboarding de condomínios, incluindo dados do responsável e fluxo de revisão.',
  condominium_events: 'Eventos/janelas especiais de operação dentro de um condomínio.',
  condominium_event_stores: 'Participação de lojas em eventos de condomínio com regras específicas por evento.',
  condominium_users: 'Usuários administrativos vinculados a um condomínio.',
  customer_addresses: 'Endereços salvos por clientes para checkout e reuso.',
  customer_email_otps: 'Códigos OTP enviados por e-mail para confirmação de identidade de clientes.',
  customer_push_tokens: 'Tokens de push notification usados para notificar clientes autenticados ou convidados.',
  customer_risk_events: 'Eventos de risco de clientes que alimentam análise antifraude e histórico de segurança.',
  customer_security_blocks: 'Bloqueios ativos/expirados de clientes por abuso, risco ou revisão manual.',
  destination_listing_hospitality_places: 'Vínculo N:N entre serviços/atrações de destinos e chalés/pousadas onde eles devem aparecer.',
  delivery_billing_charges: 'Cobranças unitárias que compõem o faturamento de delivery por ciclo.',
  delivery_billing_cycles: 'Ciclos agregados de cobrança de delivery por loja.',
  delivery_events: 'Linha do tempo operacional de cada entrega.',
  email_verifications: 'Tokens/hash de verificação de e-mail para ativação de conta.',
  featured_product_requests: 'Pedidos de destaque patrocinado para produtos dentro do hub.',
  guest_order_attempts: 'Tentativas de pedido como convidado, usadas para throttling e antifraude.',
  guest_order_phone_blocks: 'Bloqueios por telefone para impedir pedidos abusivos de convidados.',
  inventory_movements: 'Movimentações de estoque geradas manualmente ou por pedidos.',
  motoboys: 'Perfil operacional e estado de KYC dos entregadores.',
  motoboy_audit_logs: 'Logs administrativos de ações sobre motoboys.',
  motoboy_documents: 'Documentos enviados pelo motoboy para KYC e revisão.',
  motoboy_payment_accounts: 'Conexões OAuth/credenciais da conta Mercado Pago do entregador.',
  motoboy_push_tokens: 'Tokens de push notification para entregadores.',
  motoboy_stores: 'Vínculo entre motoboy e loja autorizada.',
  motoboy_store_requests: 'Solicitações de vínculo entre motoboy e loja, com decisão administrativa.',
  order_deliveries: 'Extensão 1:1 do pedido com dados de entrega e motoboy.',
  order_eta_estimates: 'Snapshots do cálculo de ETA por pedido.',
  order_items: 'Itens comprados dentro de um pedido.',
  order_payments: 'Pagamento operacional do pedido do lojista/cliente, separado da assinatura da plataforma.',
  order_reviews: 'Avaliações pós-pedido de loja e motoboy.',
  orders: 'Registro central do pedido, checkout, status e contexto de fulfillment.',
  order_shipments: 'Dados de envio postal/rastreio quando o pedido usa fulfillment postal.',
  password_resets: 'Recuperação de senha baseada em token.',
  payment_audit_logs: 'Auditoria técnica detalhada de interações com gateways de pagamento.',
  payments: 'Pagamentos/links da plataforma, especialmente para assinaturas e cobranças de planos.',
  payment_events: 'Eventos de status associados a pagamentos da plataforma.',
  plans: 'Planos comerciais e pricing da plataforma.',
  platform_admins: 'Contas de super admin da plataforma.',
  products: 'Catálogo de produtos vendidos pela loja.',
  promo_push: 'Campanhas de push promocional disparadas pela plataforma.',
  site_settings: 'Configuração global do site, termos e parâmetros editáveis pelo admin.',
  stores: 'Cadastro principal das lojas/estabelecimentos.',
  store_condominiums: 'Vínculo de uma loja com um condomínio fora do contexto de evento.',
  store_condominium_requests: 'Solicitações de adesão de loja a condomínio.',
  store_dashboard_daily_metrics: 'Snapshot diário agregado de métricas operacionais da loja.',
  store_dashboard_daily_products: 'Snapshot diário agregado por produto para analytics da loja.',
  store_link_hits: 'Acessos públicos capturados para links de loja.',
  store_payment_accounts: 'Conexões OAuth/credenciais da conta de pagamento do lojista.',
  storesettings: 'Configuração operacional da loja.',
  store_settings: 'Configuração operacional, visual e comercial da loja.',
  store_user_push_tokens: 'Tokens de push notification para lojistas e operadores.',
  store_users: 'Relaciona usuários com lojas e papéis operacionais.',
  subscriptions: 'Assinaturas/renovações de plano por loja.',
  users: 'Identidade base compartilhada entre clientes, lojistas, operadores e motoboys.',
  zip_code_cache: 'Cache local de consultas de CEP e geocodificação.',
};

const TABLE_RESPONSIBILITY_OVERRIDES: Record<string, string> = {
  orders: 'É a tabela âncora do fluxo de venda: quase todo processo de checkout, produção, entrega e acompanhamento converge aqui.',
  order_items: 'Quebra o pedido em linhas de item, permitindo preço, observação, modificadores e quantidade por produto.',
  order_deliveries: 'Complementa pedidos que entram em entrega com estado logístico, motoboy e confirmações de pagamento/recebimento.',
  payments: 'Representa a cobrança da plataforma, principalmente assinatura/trial/renovação, separada do pagamento operacional do pedido.',
  order_payments: 'Representa a cobrança do pedido do cliente no contexto da loja, com integração a gateway e payload técnico.',
  store_settings: 'Centraliza quase toda a parametrização do comportamento da loja no app e no checkout.',
  motoboys: 'Guarda a identidade operacional do entregador, validação documental e disponibilidade de atuação.',
  motoboy_payment_accounts: 'Permite cobrar gorjetas diretamente na conta conectada do entregador sem passar pelo fluxo manual da loja.',
  destination_listing_hospitality_places: 'Permite que um mesmo restaurante, serviço ou atração apareça em várias hospedagens sem duplicar cadastro.',
  condominiums: 'Define o domínio de condomínio que habilita hubs privados, eventos e experiências fechadas para moradores.',
  customer_security_blocks: 'Aplica enforcement antifraude efetivo sobre clientes, não apenas telemetria.',
  customer_risk_events: 'Registra telemetria de risco para análise histórica e decisões automáticas ou manuais.',
};

function readEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  return dotenv.parse(fs.readFileSync(filePath));
}

function getDevDbConfig(): ClientConfig & { database: string } {
  return {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'espetinho',
  };
}

function getTestDbConfig(testEnv: Record<string, string>): ClientConfig & { database: string } {
  return {
    host: testEnv.PGHOST || 'localhost',
    port: testEnv.PGPORT ? Number(testEnv.PGPORT) : 5432,
    user: testEnv.PGUSER || 'postgres',
    password: testEnv.PGPASSWORD || 'postgres',
    database: testEnv.PGDATABASE || 'espetinho_test',
  };
}

function normalizeStringArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (typeof value === 'string' && value.length > 0) return [value];
  return [];
}

async function inspectDatabase(label: 'dev' | 'test', config: ClientConfig & { database: string }): Promise<DatabaseSnapshot> {
  const client = new Client(config);
  await client.connect();

  const tablesResult = await client.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const columnsResult = await client.query<{
    table_name: string;
    column_name: string;
    ordinal_position: number;
    formatted_type: string;
    is_nullable: string;
    column_default: string | null;
  }>(`
    SELECT
      c.table_name,
      c.column_name,
      c.ordinal_position,
      pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_type,
      c.is_nullable,
      c.column_default
    FROM information_schema.columns c
    JOIN pg_catalog.pg_class cls
      ON cls.relname = c.table_name
    JOIN pg_catalog.pg_namespace ns
      ON ns.oid = cls.relnamespace
     AND ns.nspname = c.table_schema
    JOIN pg_catalog.pg_attribute a
      ON a.attrelid = cls.oid
     AND a.attname = c.column_name
    WHERE c.table_schema = 'public'
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY c.table_name, c.ordinal_position;
  `);

  const foreignKeysResult = await client.query<{
    table_name: string;
    constraint_name: string;
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
    update_rule: string | null;
    delete_rule: string | null;
  }>(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
     AND rc.constraint_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
  `);

  const constraintsResult = await client.query<{
    table_name: string;
    constraint_name: string;
    constraint_type: string;
    columns: string[] | null;
    foreign_table_name: string | null;
    foreign_columns: string[] | null;
    update_rule: string | null;
    delete_rule: string | null;
    check_clause: string | null;
  }>(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT kcu.column_name), NULL) AS columns,
      MAX(ccu.table_name) AS foreign_table_name,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT ccu.column_name), NULL) AS foreign_columns,
      MAX(rc.update_rule) AS update_rule,
      MAX(rc.delete_rule) AS delete_rule,
      MAX(chk.check_clause) AS check_clause
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
     AND rc.constraint_schema = tc.table_schema
    LEFT JOIN information_schema.check_constraints chk
      ON chk.constraint_name = tc.constraint_name
     AND chk.constraint_schema = tc.table_schema
    WHERE tc.table_schema = 'public'
    GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
    ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
  `);

  const indexesResult = await client.query<{
    table_name: string;
    index_name: string;
    index_definition: string;
    is_unique: boolean;
    is_primary: boolean;
  }>(`
    SELECT
      t.relname AS table_name,
      i.relname AS index_name,
      pg_get_indexdef(ix.indexrelid) AS index_definition,
      ix.indisunique AS is_unique,
      ix.indisprimary AS is_primary
    FROM pg_class t
    JOIN pg_index ix
      ON t.oid = ix.indrelid
    JOIN pg_class i
      ON i.oid = ix.indexrelid
    JOIN pg_namespace ns
      ON ns.oid = t.relnamespace
    WHERE ns.nspname = 'public'
      AND t.relkind = 'r'
    ORDER BY t.relname, i.relname;
  `);

  const tables = new Map<string, DbTable>();
  for (const row of tablesResult.rows) {
    tables.set(row.table_name, {
      name: row.table_name,
      columns: [],
      foreignKeys: [],
      constraints: [],
      indexes: [],
    });
  }

  for (const row of columnsResult.rows) {
    const table = tables.get(row.table_name);
    if (!table) continue;
    table.columns.push({
      name: row.column_name,
      ordinal: row.ordinal_position,
      type: row.formatted_type,
      isNullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
    });
  }

  for (const row of foreignKeysResult.rows) {
    const table = tables.get(row.table_name);
    if (!table) continue;
    table.foreignKeys.push({
      constraintName: row.constraint_name,
      columnName: row.column_name,
      referencedTable: row.foreign_table_name,
      referencedColumn: row.foreign_column_name,
      updateRule: row.update_rule,
      deleteRule: row.delete_rule,
    });
  }

  for (const row of constraintsResult.rows) {
    const table = tables.get(row.table_name);
    if (!table) continue;
    table.constraints.push({
      name: row.constraint_name,
      type: row.constraint_type,
      columns: normalizeStringArray(row.columns),
      referencedTable: row.foreign_table_name,
      referencedColumns: normalizeStringArray(row.foreign_columns),
      updateRule: row.update_rule,
      deleteRule: row.delete_rule,
      checkClause: row.check_clause,
    });
  }

  for (const row of indexesResult.rows) {
    const table = tables.get(row.table_name);
    if (!table) continue;
    table.indexes.push({
      name: row.index_name,
      definition: row.index_definition,
      isUnique: row.is_unique,
      isPrimary: row.is_primary,
    });
  }

  await client.end();
  return {
    label,
    database: config.database,
    tables,
  };
}

function listFilesRecursive(dirPath: string, extension: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, extension));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

function buildEntityFileMap(): Map<string, string> {
  const entityFiles = listFilesRecursive(entitiesRoot, '.ts');
  const map = new Map<string, string>();

  for (const filePath of entityFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/export\s+class\s+([A-Za-z0-9_]+)/);
    if (!match) continue;
    map.set(match[1], path.relative(backendRoot, filePath).replace(/\\/g, '/'));
  }

  return map;
}

async function loadEntityMetadata(testEnv: Record<string, string>): Promise<Map<string, EntityTableMeta>> {
  process.env.PGHOST = testEnv.PGHOST || 'localhost';
  process.env.PGPORT = testEnv.PGPORT || '5432';
  process.env.PGUSER = testEnv.PGUSER || 'postgres';
  process.env.PGPASSWORD = testEnv.PGPASSWORD || 'postgres';
  process.env.PGDATABASE = testEnv.PGDATABASE || 'espetinho_test';
  process.env.NODE_ENV = testEnv.NODE_ENV || 'test';

  const entityFileMap = buildEntityFileMap();
  const { AppDataSource } = await import('../config/database');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const result = new Map<string, EntityTableMeta>();
  for (const entity of AppDataSource.entityMetadatas) {
    result.set(entity.tableName, {
      tableName: entity.tableName,
      entityName: entity.name,
      filePath: entityFileMap.get(entity.name) || null,
      columns: entity.columns
        .map((column) => ({
          name: column.databaseName,
          propertyName: column.propertyName,
          type: formatEntityType(column.type),
          isNullable: column.isNullable,
          isPrimary: column.isPrimary,
          defaultValue: column.default !== undefined && column.default !== null ? String(column.default) : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      relations: entity.relations.map((relation) => ({
        propertyName: relation.propertyName,
        relationType: relation.relationType,
        targetTable: relation.inverseEntityMetadata.tableName,
        joinColumns: relation.joinColumns.map((joinColumn) => joinColumn.databaseName),
      })),
    });
  }

  await AppDataSource.destroy();
  return result;
}

function formatEntityType(type: unknown): string {
  if (typeof type === 'string') return type;
  if (typeof type === 'function' && type.name) return type.name;
  if (typeof type === 'object' && type !== null && 'name' in type && typeof (type as { name?: unknown }).name === 'string') {
    return (type as { name: string }).name;
  }
  return String(type);
}

function scanDdlOperations(rootDir: string): Map<string, DdlOperation[]> {
  const files = listFilesRecursive(rootDir, '.ts');
  const ddlMap = new Map<string, DdlOperation[]>();

  const patterns: Array<{ regex: RegExp; operation: string; tableIndex: number }> = [
    { regex: /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-z0-9_]+)/gi, operation: 'create-table', tableIndex: 1 },
    { regex: /ALTER\s+TABLE\s+IF\s+EXISTS\s+([a-z0-9_]+)/gi, operation: 'alter-table', tableIndex: 1 },
    { regex: /CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+[a-z0-9_]+\s+ON\s+([a-z0-9_]+)/gi, operation: 'create-index', tableIndex: 1 },
  ];

  for (const filePath of files) {
    const relativePath = path.relative(backendRoot, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');

    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern.regex)) {
        const tableName = match[pattern.tableIndex];
        if (!tableName) continue;
        const index = match.index ?? 0;
        const line = content.slice(0, index).split('\n').length;
        const entry: DdlOperation = {
          filePath: relativePath,
          line,
          operation: pattern.operation,
        };
        const existing = ddlMap.get(tableName) || [];
        existing.push(entry);
        ddlMap.set(tableName, existing);
      }
    }
  }

  return ddlMap;
}

function humanizeSnakeCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function lowerHumanizeSnakeCase(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .join(' ');
}

function groupForTable(tableName: string): string {
  if (tableName.startsWith('store_dashboard_')) return 'Analytics';
  if (tableName.startsWith('order') || tableName === 'orders' || tableName.startsWith('guest_order_')) return 'Pedidos & Fulfillment';
  if (tableName.startsWith('motoboy') || tableName.startsWith('delivery_')) return 'Motoboys & Logistica';
  if (tableName.startsWith('payment') || tableName === 'payments' || tableName === 'plans' || tableName === 'subscriptions' || tableName === 'store_payment_accounts') {
    return 'Pagamentos & Assinatura';
  }
  if (tableName.startsWith('condominium') || tableName.startsWith('store_condominium')) return 'Condominios';
  if (tableName.startsWith('customer') || tableName === 'users' || tableName === 'email_verifications' || tableName === 'password_resets') {
    return 'Clientes & Identidade';
  }
  if (tableName.startsWith('store_') || tableName === 'stores' || tableName === 'store_settings' || tableName === 'products' || tableName === 'inventory_movements') {
    return 'Lojas & Catalogo';
  }
  return 'Plataforma & Suporte';
}

function describeTable(tableName: string): string {
  if (TABLE_DESCRIPTION_OVERRIDES[tableName]) {
    return TABLE_DESCRIPTION_OVERRIDES[tableName];
  }

  if (tableName.endsWith('_events')) {
    return `Tabela de eventos do dominio ${lowerHumanizeSnakeCase(tableName.replace(/_events$/, ''))}.`;
  }
  if (tableName.endsWith('_requests')) {
    return `Tabela de solicitacoes e fila de aprovacao para ${lowerHumanizeSnakeCase(tableName.replace(/_requests$/, ''))}.`;
  }
  if (tableName.endsWith('_tokens')) {
    return `Tabela de tokens tecnicos ligados a ${lowerHumanizeSnakeCase(tableName.replace(/_tokens$/, ''))}.`;
  }
  if (tableName.endsWith('_logs')) {
    return `Tabela de auditoria/log para ${lowerHumanizeSnakeCase(tableName.replace(/_logs$/, ''))}.`;
  }
  return `Tabela do dominio ${groupForTable(tableName)} para ${lowerHumanizeSnakeCase(tableName)}.`;
}

function tableSubject(tableName: string): string {
  const map: Record<string, string> = {
    access_logs: 'acesso',
    customer_addresses: 'endereco do cliente',
    customer_email_otps: 'desafio OTP',
    customer_push_tokens: 'token de push do cliente',
    customer_risk_events: 'evento de risco',
    customer_security_blocks: 'bloqueio de cliente',
    delivery_billing_charges: 'cobranca de delivery',
    delivery_billing_cycles: 'ciclo de cobranca',
    delivery_events: 'evento de entrega',
    email_verifications: 'verificacao de email',
    featured_product_requests: 'pedido de destaque',
    guest_order_attempts: 'tentativa de pedido convidado',
    guest_order_phone_blocks: 'bloqueio de telefone convidado',
    inventory_movements: 'movimentacao de estoque',
    motoboys: 'motoboy',
    motoboy_audit_logs: 'auditoria de motoboy',
    motoboy_documents: 'documento do motoboy',
    motoboy_store_requests: 'solicitacao de vinculo do motoboy',
    order_deliveries: 'entrega do pedido',
    order_eta_estimates: 'estimativa de ETA',
    order_items: 'item do pedido',
    order_payments: 'pagamento do pedido',
    order_reviews: 'avaliacao do pedido',
    orders: 'pedido',
    order_shipments: 'envio postal',
    password_resets: 'recuperacao de senha',
    payment_audit_logs: 'log tecnico de pagamento',
    payments: 'pagamento da plataforma',
    payment_events: 'evento de pagamento',
    plans: 'plano',
    platform_admins: 'admin da plataforma',
    products: 'produto',
    promo_push: 'campanha de push',
    site_settings: 'configuracao global',
    stores: 'loja',
    store_condominiums: 'vinculo loja-condominio',
    store_condominium_requests: 'solicitacao loja-condominio',
    store_dashboard_daily_metrics: 'snapshot diario de metricas',
    store_dashboard_daily_products: 'snapshot diario por produto',
    store_link_hits: 'clique em link de loja',
    store_payment_accounts: 'conta de pagamento da loja',
    store_settings: 'configuracao da loja',
    store_users: 'vinculo usuario-loja',
    subscriptions: 'assinatura',
    users: 'usuario',
    zip_code_cache: 'cache de CEP',
  };
  return map[tableName] || lowerHumanizeSnakeCase(tableName);
}

function describeResponsibility(tableName: string): string {
  return TABLE_RESPONSIBILITY_OVERRIDES[tableName] || `Sustenta o dominio de ${tableSubject(tableName)} no backend.`;
}

function describeColumn(tableName: string, columnName: string, foreignKey: DbForeignKey | undefined): string {
  const subject = tableSubject(tableName);
  const human = lowerHumanizeSnakeCase(columnName);

  if (foreignKey) {
    return `Chave estrangeira para ${foreignKey.referencedTable}.${foreignKey.referencedColumn}; conecta este ${subject} ao registro relacionado.`;
  }
  if (columnName === 'id') return `Identificador unico do ${subject}.`;
  if (columnName === 'created_at') return `Timestamp de criacao do ${subject}.`;
  if (columnName === 'updated_at') return `Timestamp da ultima atualizacao do ${subject}.`;
  if (columnName === 'status') return `Estado atual do ${subject} dentro do fluxo de negocio.`;
  if (columnName === 'active' || columnName === 'is_active') return `Flag logica que indica se o ${subject} esta habilitado para uso.`;
  if (columnName === 'name') return `Nome principal de exibicao do ${subject}.`;
  if (columnName === 'title') return `Titulo resumido usado para identificar o ${subject}.`;
  if (columnName === 'description') return `Descricao livre com contexto funcional do ${subject}.`;
  if (columnName === 'notes' || columnName === 'note' || columnName === 'review_note') return `Observacao operacional/manual associada ao ${subject}.`;
  if (columnName === 'reason') return `Motivo de negocio ou seguranca associado ao ${subject}.`;
  if (columnName === 'message') return `Mensagem livre gravada junto ao ${subject}.`;
  if (columnName === 'slug') return 'Identificador amigavel usado em URLs e rotas publicas.';
  if (columnName === 'email' || columnName.endsWith('_email')) return `Endereco de e-mail ligado ao ${subject}.`;
  if (columnName === 'phone' || columnName.endsWith('_phone')) return `Telefone associado ao ${subject}.`;
  if (columnName === 'password_hash') return 'Hash da senha persistida para autenticacao.';
  if (columnName === 'token') return `Token bruto associado ao ${subject}.`;
  if (columnName === 'token_hash' || columnName === 'code_hash') return `Hash do segredo/token do ${subject}, evitando armazenamento em texto puro.`;
  if (columnName === 'provider') return `Provedor externo ou origem tecnica usada por este ${subject}.`;
  if (columnName === 'provider_id' || columnName === 'provider_user_id' || columnName === 'provider_payment_id') {
    return `Identificador do provedor externo para reconciliar o ${subject}.`;
  }
  if (columnName === 'external_reference') return `Referencia externa usada para correlacionar o ${subject} com sistemas terceiros.`;
  if (columnName === 'payment_method') return 'Metodo de pagamento escolhido no fluxo.';
  if (columnName === 'payment_status') return `Estado do pagamento relacionado ao ${subject}.`;
  if (columnName === 'fulfillment_mode') return 'Modo de fulfillment/entrega aplicado ao pedido.';
  if (columnName === 'type' || columnName.endsWith('_type')) return `Classificacao/tipo funcional do ${subject}.`;
  if (columnName === 'role' || columnName.endsWith('_role')) return `Papel/permissao associado ao ${subject}.`;
  if (columnName === 'metadata') return `JSON flexivel com metadados complementares do ${subject}.`;
  if (columnName.endsWith('_payload')) return `Payload tecnico em JSON ligado a ${human.replace(/_payload$/, '')}.`;
  if (columnName.endsWith('_url')) return `URL persistida para ${human.replace(/_url$/, '')}.`;
  if (columnName.endsWith('_name')) return `Nome textual para ${human.replace(/_name$/, '')}.`;
  if (columnName.endsWith('_code')) return `Codigo/identificador curto para ${human.replace(/_code$/, '')}.`;
  if (columnName.endsWith('_hash')) return `Hash persistido para ${human.replace(/_hash$/, '')}.`;
  if (columnName.endsWith('_at')) return `Timestamp do evento ${human.replace(/_at$/, '').replace(/_/g, ' ')}.`;
  if (columnName.endsWith('_until')) return `Limite temporal ate quando ${human.replace(/_until$/, '').replace(/_/g, ' ')} permanece valido.`;
  if (columnName === 'latitude' || columnName === 'lat') return 'Latitude geografica usada em mapas, entrega e geocodificacao.';
  if (columnName === 'longitude' || columnName === 'lng') return 'Longitude geografica usada em mapas, entrega e geocodificacao.';
  if (columnName === 'city' || columnName === 'state' || columnName === 'address' || columnName === 'zip_code') {
    return `Campo de endereco (${human.replace(/_/g, ' ')}) associado ao ${subject}.`;
  }
  if (columnName === 'amount' || columnName.endsWith('_amount')) return `Valor monetario associado ao ${subject}.`;
  if (columnName.endsWith('_price')) return `Preco/valor monetario de ${human.replace(/_price$/, '').replace(/_/g, ' ')}.`;
  if (columnName.endsWith('_fee')) return `Taxa monetaria de ${human.replace(/_fee$/, '').replace(/_/g, ' ')}.`;
  if (columnName.endsWith('_count') || columnName === 'quantity' || columnName.endsWith('_quantity') || columnName.endsWith('_qty')) {
    return `Quantidade agregada ou unitária de ${human.replace(/_(count|quantity|qty)$/, '').replace(/_/g, ' ')}.`;
  }
  if (columnName === 'score') return `Pontuacao numerica associada ao ${subject}.`;
  if (columnName === 'logo_url' || columnName === 'banner_url') return `Recurso visual persistido para identidade do ${subject}.`;
  if (columnName === 'order_types') return 'Lista JSON dos tipos de pedido permitidos pela loja.';
  if (columnName === 'social_links') return 'Lista JSON de links sociais/contato exibidos na loja.';
  if (columnName === 'opening_hours') return 'Agenda JSON de horarios de funcionamento da loja.';
  if (columnName === 'category_priorities') return 'JSON com prioridade de exibicao por categoria de produto.';
  if (columnName === 'selected_modifiers') return 'JSON com adicionais/modificadores escolhidos no item do pedido.';
  if (columnName === 'modifiers') return 'JSON com a configuracao de modificadores disponiveis no produto.';
  if (columnName === 'availability_days') return 'JSON indicando em quais dias o produto fica disponivel.';
  if (columnName === 'condominium_unit') return 'JSON com bloco/apartamento/unidade do pedido no contexto de condominio.';
  if (columnName === 'schedule') return 'JSON de agenda/grade operacional do vinculo com condominio.';
  if (columnName === 'guest_id' || columnName === 'guest_push_id') return 'Identificador tecnico do convidado/dispositivo para notificacao e antifraude.';
  if (columnName === 'ip_address') return 'Endereco IP capturado para rastreamento tecnico e seguranca.';
  if (columnName === 'app_version' || columnName === 'device_model' || columnName === 'platform') {
    return `Metadado tecnico do dispositivo/aplicacao para ${subject}.`;
  }
  if (columnName === 'response_payload' || columnName === 'request_payload' || columnName === 'error_payload') {
    return `Payload tecnico de integracao para ${subject}.`;
  }
  return `Campo ${human} que participa do contexto funcional de ${subject}.`;
}

function mergeTableDocs(
  dev: DatabaseSnapshot,
  test: DatabaseSnapshot,
  entities: Map<string, EntityTableMeta>,
  ddlMap: Map<string, DdlOperation[]>
): TableDoc[] {
  const tableNames = new Set<string>([
    ...Array.from(dev.tables.keys()),
    ...Array.from(test.tables.keys()),
    ...Array.from(entities.keys()),
    ...Array.from(ddlMap.keys()),
  ]);

  const docs: TableDoc[] = [];
  for (const tableName of Array.from(tableNames).sort()) {
    const devTable = dev.tables.get(tableName) || null;
    const testTable = test.tables.get(tableName) || null;
    const entity = entities.get(tableName) || null;
    const ddlOperations = ddlMap.get(tableName) || [];

    const documentedFrom: 'dev' | 'test' | 'entity' | 'unknown' =
      testTable ? 'test' : devTable ? 'dev' : entity ? 'entity' : 'unknown';
    const primaryTable = documentedFrom === 'test' ? testTable : documentedFrom === 'dev' ? devTable : null;

    const columnMap = new Map<string, TableDoc['columns'][number]>();
    for (const column of devTable?.columns || []) {
      columnMap.set(column.name, {
        name: column.name,
        type: column.type,
        isNullable: column.isNullable,
        defaultValue: column.defaultValue,
        responsibility: '',
        inDev: true,
        inTest: false,
        inEntity: false,
        isPrimary: false,
      });
    }
    for (const column of testTable?.columns || []) {
      const existing = columnMap.get(column.name);
      if (existing) {
        existing.inTest = true;
        existing.type = documentedFrom === 'test' ? column.type : existing.type;
        existing.isNullable = documentedFrom === 'test' ? column.isNullable : existing.isNullable;
        existing.defaultValue = documentedFrom === 'test' ? column.defaultValue : existing.defaultValue;
      } else {
        columnMap.set(column.name, {
          name: column.name,
          type: column.type,
          isNullable: column.isNullable,
          defaultValue: column.defaultValue,
          responsibility: '',
          inDev: false,
          inTest: true,
          inEntity: false,
          isPrimary: false,
        });
      }
    }
    for (const column of entity?.columns || []) {
      const existing = columnMap.get(column.name);
      if (existing) {
        existing.inEntity = true;
        if (!existing.type || documentedFrom === 'entity') existing.type = column.type;
        existing.isPrimary = existing.isPrimary || column.isPrimary;
      } else {
        columnMap.set(column.name, {
          name: column.name,
          type: column.type,
          isNullable: column.isNullable,
          defaultValue: column.defaultValue,
          responsibility: '',
          inDev: false,
          inTest: false,
          inEntity: true,
          isPrimary: column.isPrimary,
        });
      }
    }

    const pkColumns = new Set<string>();
    for (const constraint of primaryTable?.constraints || []) {
      if (constraint.type === 'PRIMARY KEY') {
        for (const columnName of constraint.columns) pkColumns.add(columnName);
      }
    }
    for (const column of entity?.columns || []) {
      if (column.isPrimary) pkColumns.add(column.name);
    }

    const foreignKeyMap = new Map<string, DbForeignKey>();
    for (const fk of primaryTable?.foreignKeys || []) {
      foreignKeyMap.set(fk.columnName, fk);
    }
    for (const column of columnMap.values()) {
      column.isPrimary = column.isPrimary || pkColumns.has(column.name);
      column.responsibility = describeColumn(tableName, column.name, foreignKeyMap.get(column.name));
    }

    const driftNotes: string[] = [];
    if (devTable && !testTable) driftNotes.push(`Presente no banco dev (${dev.database}) e ausente no banco de testes (${test.database}).`);
    if (!devTable && testTable) driftNotes.push(`Presente no banco de testes (${test.database}) e ausente no banco dev (${dev.database}).`);
    if (entity && !devTable && !testTable) driftNotes.push('Existe em metadata TypeORM, mas nao foi encontrada em nenhum snapshot local.');
    if (!entity && (devTable || testTable)) driftNotes.push('Tabela sem entity TypeORM; acesso provavelmente acontece por SQL manual.');
    if (!ddlOperations.length && (devTable || testTable)) driftNotes.push('Nenhuma operacao DDL foi detectada em arquivos backend/src para esta tabela.');

    const relationList: Array<DbForeignKey | EntityRelationMeta> = [];
    for (const fk of primaryTable?.foreignKeys || []) relationList.push(fk);
    for (const relation of entity?.relations || []) relationList.push(relation);

    docs.push({
      name: tableName,
      group: groupForTable(tableName),
      description: describeTable(tableName),
      responsibility: describeResponsibility(tableName),
      presence: {
        dev: Boolean(devTable),
        test: Boolean(testTable),
        entity: Boolean(entity),
        ddl: ddlOperations.length > 0,
      },
      documentedFrom,
      entity,
      table: primaryTable,
      relations: relationList,
      constraints: primaryTable?.constraints || [],
      indexes: primaryTable?.indexes || [],
      ddlOperations,
      driftNotes,
      columns: Array.from(columnMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  return docs.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function badge(label: string, tone: 'green' | 'blue' | 'amber' | 'slate' | 'red'): string {
  return `<span class="badge badge-${tone}">${escapeHtml(label)}</span>`;
}

function renderPresenceBadges(presence: PresenceMap): string {
  const badges: string[] = [];
  if (presence.dev) badges.push(badge('dev', 'green'));
  if (presence.test) badges.push(badge('test', 'blue'));
  if (presence.entity) badges.push(badge('entity', 'amber'));
  if (presence.ddl) badges.push(badge('ddl', 'slate'));
  if (!badges.length) badges.push(badge('sem origem detectada', 'red'));
  return badges.join(' ');
}

function summarizeDdlOperations(operations: DdlOperation[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const operation of operations) {
    const key = `${operation.filePath}::${operation.operation}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => {
      const [filePath, operation] = key.split('::');
      return { label: `${filePath} (${operation})`, count };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function renderHtml(tables: TableDoc[], dev: DatabaseSnapshot, test: DatabaseSnapshot): string {
  const generatedAt = new Date().toISOString();
  const grouped = new Map<string, TableDoc[]>();
  for (const table of tables) {
    const list = grouped.get(table.group) || [];
    list.push(table);
    grouped.set(table.group, list);
  }

  const onlyDev = tables.filter((table) => table.presence.dev && !table.presence.test).map((table) => table.name);
  const onlyTest = tables.filter((table) => table.presence.test && !table.presence.dev).map((table) => table.name);
  const rawSqlOnly = tables.filter((table) => !table.presence.entity && (table.presence.dev || table.presence.test));
  const withDrift = tables.filter((table) => table.driftNotes.length > 0);

  const navigation = Array.from(grouped.entries())
    .map(([group, groupTables]) => {
      const items = groupTables
        .map(
          (table) =>
            `<li><a href="#table-${escapeHtml(table.name)}">${escapeHtml(table.name)}</a> <span class="toc-badges">${renderPresenceBadges(
              table.presence
            )}</span></li>`
        )
        .join('');
      return `<section class="toc-group"><h3>${escapeHtml(group)}</h3><ul>${items}</ul></section>`;
    })
    .join('');

  const sections = tables
    .map((table) => {
      const entityMeta = table.entity
        ? `<li><strong>Entity:</strong> ${escapeHtml(table.entity.entityName)}${
            table.entity.filePath ? ` <code>${escapeHtml(table.entity.filePath)}</code>` : ''
          }</li>`
        : '<li><strong>Entity:</strong> sem entity TypeORM</li>';

      const ddlSummary = summarizeDdlOperations(table.ddlOperations);
      const ddlList = ddlSummary.length
        ? `<ul class="flat-list">${ddlSummary
            .map((item) => `<li><code>${escapeHtml(item.label)}</code> x${item.count}</li>`)
            .join('')}</ul>`
        : '<p class="muted">Nenhuma operacao DDL detectada em backend/src.</p>';

      const driftBlock = table.driftNotes.length
        ? `<div class="callout callout-amber"><strong>Drift / observacoes:</strong><ul class="flat-list">${table.driftNotes
            .map((note) => `<li>${escapeHtml(note)}</li>`)
            .join('')}</ul></div>`
        : '';

      const columnsTable = table.columns.length
        ? `<table>
            <thead>
              <tr>
                <th>Coluna</th>
                <th>Tipo</th>
                <th>Nulo?</th>
                <th>Default</th>
                <th>Presenca</th>
                <th>Responsabilidade</th>
              </tr>
            </thead>
            <tbody>
              ${table.columns
                .map((column) => {
                  const presenceBadges = [
                    column.inDev ? badge('dev', 'green') : '',
                    column.inTest ? badge('test', 'blue') : '',
                    column.inEntity ? badge('entity', 'amber') : '',
                    column.isPrimary ? badge('pk', 'slate') : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return `<tr>
                    <td><code>${escapeHtml(column.name)}</code></td>
                    <td>${escapeHtml(column.type)}</td>
                    <td>${column.isNullable ? 'sim' : 'nao'}</td>
                    <td>${column.defaultValue ? `<code>${escapeHtml(column.defaultValue)}</code>` : '<span class="muted">-</span>'}</td>
                    <td>${presenceBadges || '<span class="muted">-</span>'}</td>
                    <td>${escapeHtml(column.responsibility)}</td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>`
        : '<p class="muted">Sem colunas documentadas nos snapshots disponiveis.</p>';

      const relationsList = table.relations.length
        ? `<ul class="flat-list">${table.relations
            .map((relation) => {
              if ('constraintName' in relation) {
                return `<li><code>${escapeHtml(relation.columnName)}</code> → <code>${escapeHtml(
                  relation.referencedTable
                )}.${escapeHtml(relation.referencedColumn)}</code> (${escapeHtml(relation.deleteRule || 'NO ACTION')})</li>`;
              }
              return `<li><code>${escapeHtml(relation.propertyName)}</code> (${escapeHtml(relation.relationType)}) → <code>${escapeHtml(
                relation.targetTable
              )}</code>${relation.joinColumns.length ? ` via ${relation.joinColumns.map((item) => `<code>${escapeHtml(item)}</code>`).join(', ')}` : ''}</li>`;
            })
            .join('')}</ul>`
        : '<p class="muted">Nenhum relacionamento detectado.</p>';

      const constraintsList = table.constraints.length
        ? `<ul class="flat-list">${table.constraints
            .map((constraint) => {
              const details: string[] = [escapeHtml(constraint.type)];
              if (constraint.columns.length) details.push(`colunas: ${escapeHtml(constraint.columns.join(', '))}`);
              if (constraint.referencedTable) {
                details.push(
                  `ref: ${escapeHtml(constraint.referencedTable)}${constraint.referencedColumns.length ? `(${escapeHtml(constraint.referencedColumns.join(', '))})` : ''}`
                );
              }
              if (constraint.deleteRule) details.push(`delete: ${escapeHtml(constraint.deleteRule)}`);
              if (constraint.checkClause) details.push(`check: ${escapeHtml(constraint.checkClause)}`);
              return `<li><code>${escapeHtml(constraint.name)}</code> — ${details.join(' | ')}</li>`;
            })
            .join('')}</ul>`
        : '<p class="muted">Nenhuma constraint detectada.</p>';

      const indexesList = table.indexes.length
        ? `<ul class="flat-list">${table.indexes
            .map(
              (index) =>
                `<li><code>${escapeHtml(index.name)}</code>${index.isPrimary ? ` ${badge('pk', 'slate')}` : ''}${
                  index.isUnique ? ` ${badge('unique', 'amber')}` : ''
                }<br /><code>${escapeHtml(index.definition)}</code></li>`
            )
            .join('')}</ul>`
        : '<p class="muted">Nenhum indice detectado.</p>';

      return `
        <section id="table-${escapeHtml(table.name)}" class="table-card">
          <div class="table-header">
            <div>
              <h2>${escapeHtml(table.name)}</h2>
              <p class="table-subtitle">${escapeHtml(table.description)}</p>
            </div>
            <div class="table-badges">${renderPresenceBadges(table.presence)}</div>
          </div>
          <p class="responsibility"><strong>Papel no sistema:</strong> ${escapeHtml(table.responsibility)}</p>
          <ul class="meta-list">
            <li><strong>Grupo:</strong> ${escapeHtml(table.group)}</li>
            <li><strong>Documentado a partir de:</strong> <code>${escapeHtml(table.documentedFrom)}</code></li>
            ${entityMeta}
          </ul>
          ${driftBlock}
          <div class="grid">
            <div>
              <h3>Colunas</h3>
              ${columnsTable}
            </div>
            <div>
              <h3>Relacionamentos</h3>
              ${relationsList}
              <h3>Constraints</h3>
              ${constraintsList}
              <h3>Indices</h3>
              ${indexesList}
              <h3>Origem DDL</h3>
              ${ddlList}
            </div>
          </div>
        </section>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Database Schema - Ja no Caminho</title>
  <style>
    :root {
      --bg: #0b1020;
      --panel: #131a2d;
      --panel-soft: #172036;
      --text: #edf2ff;
      --muted: #9fb0d0;
      --accent: #64d2ff;
      --green: #8be9a8;
      --blue: #7fb3ff;
      --amber: #f6c56f;
      --red: #ff8c8c;
      --line: rgba(255,255,255,0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(100,210,255,0.12), transparent 30%),
        radial-gradient(circle at top right, rgba(246,197,111,0.08), transparent 25%),
        var(--bg);
      color: var(--text);
      line-height: 1.55;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.92em;
      background: rgba(255,255,255,0.06);
      padding: 0.12rem 0.28rem;
      border-radius: 0.35rem;
    }
    .page {
      width: min(1540px, calc(100% - 32px));
      margin: 0 auto;
      padding: 24px 0 48px;
    }
    .hero, .summary, .toc, .table-card {
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
      border: 1px solid var(--line);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 18px 50px rgba(0,0,0,0.18);
    }
    .hero {
      padding: 28px;
      margin-bottom: 20px;
    }
    .hero h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 4vw, 3rem);
      line-height: 1.02;
      letter-spacing: -0.03em;
    }
    .hero p {
      margin: 8px 0;
      color: var(--muted);
      max-width: 980px;
    }
    .hero .command {
      margin-top: 16px;
      display: inline-block;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(100,210,255,0.1);
      border: 1px solid rgba(100,210,255,0.24);
    }
    .summary {
      padding: 20px;
      margin-bottom: 20px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .metric {
      padding: 16px;
      border-radius: 16px;
      background: var(--panel-soft);
      border: 1px solid var(--line);
    }
    .metric strong {
      display: block;
      font-size: 1.9rem;
      line-height: 1;
      margin-bottom: 6px;
    }
    .metric span {
      color: var(--muted);
      font-size: 0.95rem;
    }
    .toc {
      padding: 20px;
      margin-bottom: 20px;
    }
    .toc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .toc-header input {
      width: min(360px, 100%);
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--line);
      color: var(--text);
      padding: 10px 14px;
      border-radius: 12px;
    }
    .toc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 18px;
    }
    .toc-group h3 {
      margin: 0 0 10px;
      font-size: 0.98rem;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .toc-group ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 8px;
    }
    .toc-group li {
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.05);
    }
    .toc-badges { display: inline-flex; gap: 6px; flex-wrap: wrap; margin-left: 8px; }
    .table-card {
      padding: 22px;
      margin-bottom: 18px;
    }
    .table-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    .table-header h2 {
      margin: 0;
      font-size: 1.55rem;
      line-height: 1.1;
    }
    .table-subtitle, .responsibility, .muted {
      color: var(--muted);
    }
    .meta-list, .flat-list {
      margin: 0;
      padding-left: 18px;
    }
    .flat-list li { margin-bottom: 6px; }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
      gap: 22px;
      margin-top: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(0,0,0,0.12);
    }
    thead {
      background: rgba(255,255,255,0.06);
    }
    th, td {
      padding: 12px 10px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 0.95rem;
    }
    th { font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.2rem 0.58rem;
      font-size: 0.76rem;
      border: 1px solid transparent;
      margin-right: 6px;
      margin-bottom: 6px;
      white-space: nowrap;
    }
    .badge-green { color: #0d2b15; background: var(--green); border-color: rgba(0,0,0,0.1); }
    .badge-blue { color: #071b36; background: var(--blue); border-color: rgba(0,0,0,0.1); }
    .badge-amber { color: #3f2900; background: var(--amber); border-color: rgba(0,0,0,0.1); }
    .badge-slate { color: var(--text); background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.08); }
    .badge-red { color: #3f0000; background: var(--red); border-color: rgba(0,0,0,0.1); }
    .callout {
      padding: 12px 14px;
      border-radius: 14px;
      margin: 14px 0;
      border: 1px solid transparent;
    }
    .callout-amber {
      background: rgba(246,197,111,0.12);
      border-color: rgba(246,197,111,0.22);
    }
    .footnote {
      color: var(--muted);
      font-size: 0.9rem;
      margin-top: 12px;
    }
    @media (max-width: 1024px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <h1>Documentacao do Schema PostgreSQL</h1>
      <p>Gerado a partir de tres fontes combinadas: snapshots locais de banco (<code>${escapeHtml(dev.database)}</code> e <code>${escapeHtml(
        test.database
      )}</code>), metadata TypeORM e varredura de DDL em <code>backend/src</code> (incluindo <code>runMigrations.ts</code> e SQL manual fora dele).</p>
      <p>Objetivo: responder rapidamente o que cada tabela guarda, como ela se relaciona com as demais e qual a responsabilidade funcional de cada coluna relevante.</p>
      <div class="command">Regenerar: <code>cd backend && npm run docs:schema</code></div>
      <p class="footnote">Gerado em ${escapeHtml(generatedAt)}.</p>
    </section>

    <section class="summary">
      <div class="summary-grid">
        <div class="metric"><strong>${tables.length}</strong><span>Tabelas na documentacao unificada</span></div>
        <div class="metric"><strong>${dev.tables.size}</strong><span>Tabelas no banco dev (${escapeHtml(dev.database)})</span></div>
        <div class="metric"><strong>${test.tables.size}</strong><span>Tabelas no banco de testes (${escapeHtml(test.database)})</span></div>
        <div class="metric"><strong>${rawSqlOnly.length}</strong><span>Tabelas sem entity TypeORM</span></div>
        <div class="metric"><strong>${withDrift.length}</strong><span>Tabelas com observacao de drift/origem</span></div>
      </div>
      <div class="callout callout-amber">
        <strong>Comparacao de ambientes:</strong>
        <ul class="flat-list">
          <li><strong>So no dev:</strong> ${onlyDev.length ? onlyDev.map((name) => `<code>${escapeHtml(name)}</code>`).join(', ') : 'nenhuma'}</li>
          <li><strong>So no test:</strong> ${onlyTest.length ? onlyTest.map((name) => `<code>${escapeHtml(name)}</code>`).join(', ') : 'nenhuma'}</li>
        </ul>
      </div>
      <p class="footnote">Se uma tabela aparecer apenas em um ambiente, a documentacao destaca isso na propria secao da tabela.</p>
    </section>

    <section class="toc">
      <div class="toc-header">
        <div>
          <h2>Mapa rapido</h2>
          <p class="muted">Use a busca para filtrar por tabela ou dominio.</p>
        </div>
        <input id="schema-filter" type="search" placeholder="Filtrar tabela..." />
      </div>
      <div class="toc-grid" id="toc-grid">${navigation}</div>
    </section>

    ${sections}
  </div>

  <script>
    const filterInput = document.getElementById('schema-filter');
    const cards = Array.from(document.querySelectorAll('.table-card'));
    filterInput?.addEventListener('input', (event) => {
      const value = String(event.target.value || '').trim().toLowerCase();
      for (const card of cards) {
        const text = card.textContent.toLowerCase();
        card.style.display = !value || text.includes(value) ? '' : 'none';
      }
    });
  </script>
</body>
</html>`;
}

async function main() {
  const testEnv = readEnvFile(testEnvPath);
  const devConfig = getDevDbConfig();
  const testConfig = getTestDbConfig(testEnv);

  const [devSnapshot, testSnapshot, entityMetadata] = await Promise.all([
    inspectDatabase('dev', devConfig),
    inspectDatabase('test', testConfig),
    loadEntityMetadata(testEnv),
  ]);

  const ddlMap = scanDdlOperations(srcRoot);
  const tableDocs = mergeTableDocs(devSnapshot, testSnapshot, entityMetadata, ddlMap);
  const html = renderHtml(tableDocs, devSnapshot, testSnapshot);

  fs.mkdirSync(docsRoot, { recursive: true });
  fs.writeFileSync(docsOutput, html, 'utf8');

  console.log(`Schema documentation generated at ${docsOutput}`);
  console.log(`Tables documented: ${tableDocs.length}`);
  console.log(`Dev DB: ${devSnapshot.database} (${devSnapshot.tables.size} tables)`);
  console.log(`Test DB: ${testSnapshot.database} (${testSnapshot.tables.size} tables)`);
}

main().catch((error) => {
  console.error('Failed to generate schema documentation.');
  console.error(error);
  process.exitCode = 1;
});

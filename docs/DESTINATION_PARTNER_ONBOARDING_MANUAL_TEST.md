# Teste manual - Onboarding de parceiros de destinos

Use este roteiro para validar chalés, pousadas, serviços e restaurantes que passam a manter seus próprios dados no portal `/parceiro`.

## Preparação local

1. Estar na branch da feature:

```bash
git checkout feature/destination-partner-onboarding
```

2. Subir os containers locais:

```bash
sh scripts/compose-dev-backend.sh
sh scripts/compose-dev-apis.sh
sh scripts/compose-dev-frontend.sh
```

3. Confirmar que o banco local tem dados:

```bash
docker exec janocaminho-postgres psql -U postgres -d espetinho -c "SELECT 'users' entidade, COUNT(*) total FROM users UNION ALL SELECT 'stores', COUNT(*) FROM stores UNION ALL SELECT 'products', COUNT(*) FROM products UNION ALL SELECT 'orders', COUNT(*) FROM orders UNION ALL SELECT 'site_settings', COUNT(*) FROM site_settings ORDER BY entidade;"
```

4. Acessar:

- Frontend local: `http://localhost:8080`
- Super Admin: `http://localhost:8080/superadmin/destinations`
- Portal parceiro: `http://localhost:8080/parceiro`

## Caso 1 - Super Admin enxerga onboarding

1. Entrar no Super Admin.
2. Ir em `Destinos > Parceiros`.
3. Validar o topo da tela:
   - título `Onboarding de parceiros`;
   - cards `Pendentes`, `Validação de posse`, `Sem ativar`, `Ativos`;
   - filtros rápidos `Todos`, `Pendentes`, `Validação de posse`, `Sem ativar`, `Ativos`, `Recusados`;
   - grupos por destino/cidade.

Resultado esperado: a tela mostra onde há pendência, quem está tentando assumir perfil existente e quem ainda não ativou o portal.

## Caso 2 - Chalé assume perfil existente sem duplicar cadastro

1. No Super Admin, escolha um chalé/pousada já cadastrado.
2. Gere ou copie o convite público para o responsável assumir o perfil.
3. Abra o link em janela anônima.
4. Confirme que o formulário já vem com dados do chalé/pousada preenchidos.
5. Preencha responsável com e-mail de teste.
6. Envie a solicitação.
7. Volte ao Super Admin em `Destinos > Parceiros`.
8. Localize a solicitação.

Validar no card:

- selo `Assumir perfil existente`;
- bloco `Verificação obrigatória`;
- texto orientando confirmar titularidade pelo contato oficial.
- botão `Detalhes e validação`.

9. Clique `Detalhes e validação`.

Resultado esperado:

- abre um modal comparando `Cadastro atual` versus `Enviado na solicitação`;
- campos diferentes aparecem destacados;
- aparecem status, responsável, e-mail, convite e ativação.

10. No card ou modal, clique `Aprovar` e cancele a confirmação do navegador.

Resultado esperado: a solicitação continua pendente.

11. Clique `Aprovar` novamente e confirme.

Resultado esperado:

- status vira `Aprovada`;
- aparece `Aguardando ativação`;
- o sistema não cria outro chalé/pousada duplicado.

Consulta opcional:

```sql
SELECT id, name, destination_id
FROM hospitality_places
WHERE lower(name) LIKE lower('%NOME_DO_CHALE%');

SELECT resource_type, resource_id, COUNT(*) AS donos_ativos
FROM destination_partner_permissions
WHERE status = 'active'
GROUP BY resource_type, resource_id
HAVING COUNT(*) > 1;
```

## Caso 3 - Reenvio e ativação do convite

1. Na solicitação aprovada, clique em `Reenviar convite`.
2. Confirme que o link foi copiado ou que aparece ação `Copiar link`.
3. Abra o link de ativação.
4. Crie uma senha.
5. Valide que entrou em `/parceiro`.

Resultado esperado:

- o parceiro vê apenas os cadastros liberados para ele;
- o checklist de publicação aparece;
- campos estratégicos não aparecem para edição.

## Caso 4 - Portal parceiro edita somente campos seguros

1. Logado em `/parceiro`, altere:
   - nome público;
   - descrição;
   - WhatsApp;
   - endereço;
   - imagem/logo/banner se quiser.
2. Clique `Salvar alterações`.
3. Abra `Ver página pública`.

Resultado esperado:

- alterações públicas aparecem;
- o parceiro não consegue alterar ativo/inativo, prioridade, destino, categoria, destaque ou vínculos.

## Caso 5 - Proteção contra fraude/segundo dono

1. Para o mesmo chalé/pousada já ativado por um parceiro, gere uma nova solicitação com outro e-mail.
2. No Super Admin, tente aprovar.

Resultado esperado:

- frontend pede confirmação de titularidade;
- backend bloqueia se já houver parceiro ativo no mesmo cadastro;
- mensagem esperada: `Este cadastro já tem um parceiro ativo. Revise o acesso atual antes de liberar outra conta.`

Consulta opcional:

```sql
SELECT
  p.resource_type,
  p.resource_id,
  a.email,
  a.status,
  p.created_at
FROM destination_partner_permissions p
JOIN destination_partner_accounts a ON a.id = p.account_id
WHERE p.resource_id = 'ID_DO_CHALE_OU_SERVICO'
ORDER BY p.created_at DESC;
```

## Caso 6 - Serviço/restaurante quer receber pedidos

1. Aprovar um serviço/restaurante como parceiro.
2. Ativar o convite e entrar no portal.
3. Clicar em `Quero receber pedidos`.

Resultado esperado:

- abre `/create`;
- dados principais do serviço/restaurante vêm pré-preenchidos;
- o vínculo final como loja continua dependendo da validação do Super Admin.

## Banco local e import

O banco local não deve ser zerado em validações comuns. Use o dump de produção já importado e rode apenas rebuild/migrations.

Só reimporte produção quando:

- o usuário pedir explicitamente;
- o banco local estiver zerado/incoerente;
- houver mudança real de schema/tabelas e for necessário validar migração com dump recente.

Antes de qualquer import destrutivo, salvar backup local em `.local-db-dumps/`.

## Regressão obrigatória

Validar que continuam funcionando:

- criação/edição normal de destino;
- criação/edição normal de chalé/pousada;
- criação/edição normal de serviço/lugar;
- vínculo loja x chalé;
- listagem pública do destino;
- página pública do chalé;
- rota `/parceiro` no mobile.

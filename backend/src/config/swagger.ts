import { env } from './env';

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Churras Sites API',
    version: '1.0.0',
    description: 'Documentação das rotas públicas da API de lojas e pedidos.',
  },
  servers: [
    {
      url: `http://localhost:${env.port}/api`,
      description: 'Ambiente local',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Store: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          slug: { type: 'string' },
          open: { type: 'boolean' },
          settings: { $ref: '#/components/schemas/StoreSettings' },
        },
      },
      StoreSettings: {
        type: 'object',
        properties: {
          logoUrl: { type: 'string', nullable: true },
          primaryColor: { type: 'string' },
          secondaryColor: { type: 'string', nullable: true },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          price: { type: 'number' },
          imageUrl: { type: 'string', nullable: true },
          available: { type: 'boolean' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          customerName: { type: 'string' },
          customerPhone: { type: 'string' },
          total: { type: 'number' },
          status: { type: 'string' },
          observation: { type: 'string', nullable: true },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'integer' },
                unitPrice: { type: 'number' },
              },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email', 'password', 'storeName', 'primaryColor'],
        properties: {
          fullName: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          storeName: { type: 'string' },
          logoUrl: { type: 'string' },
          primaryColor: { type: 'string' },
          secondaryColor: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          imageUrl: { type: 'string' },
          available: { type: 'boolean' },
        },
      },
      OrderInput: {
        type: 'object',
        required: ['customerName', 'customerPhone', 'items'],
        properties: {
          customerName: { type: 'string' },
          customerPhone: { type: 'string' },
          observation: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity', 'unitPrice'],
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'integer' },
                unitPrice: { type: 'number' },
              },
            },
          },
        },
      },
      Plan: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', enum: ['monthly', 'yearly'] },
          price: { type: 'number' },
          durationDays: { type: 'integer' },
          enabled: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          store: { $ref: '#/components/schemas/Store' },
          plan: { $ref: '#/components/schemas/Plan' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED'] },
          autoRenew: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateSubscriptionInput: {
        type: 'object',
        required: ['storeId', 'planId'],
        properties: {
          storeId: { type: 'string', format: 'uuid' },
          planId: { type: 'string', format: 'uuid' },
          autoRenew: { type: 'boolean' },
        },
      },
      RenewSubscriptionInput: {
        type: 'object',
        properties: {
          planId: { type: 'string', format: 'uuid' },
          autoRenew: { type: 'boolean' },
        },
      },
      UpdateSubscriptionStatusInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED'] },
          subscriptionId: { type: 'string', format: 'uuid', description: 'Opcional para admin' },
        },
      },
      AdminStore: {
        allOf: [
          { $ref: '#/components/schemas/Store' },
          {
            type: 'object',
            properties: {
              subscription: { $ref: '#/components/schemas/Subscription' },
            },
          },
        ],
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Autenticação'],
        summary: 'Cria um usuário e loja iniciais',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Usuário e loja criados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    store: { $ref: '#/components/schemas/Store' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { description: 'Erro de validação' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Autentica um usuário existente',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login realizado com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    store: { $ref: '#/components/schemas/Store' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { description: 'Credenciais inválidas' },
        },
      },
    },
    '/api/stores/{slug}': {
      get: {
        tags: ['Lojas'],
        summary: 'Busca loja pelo slug público',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Loja encontrada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Store' } } },
          },
          404: { description: 'Loja não encontrada' },
        },
      },
    },
    '/api/stores/{id}': {
      put: {
        tags: ['Lojas'],
        summary: 'Atualiza informações da loja',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  settings: { $ref: '#/components/schemas/StoreSettings' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Loja atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Store' } } } },
          400: { description: 'Erro de validação' },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    '/api/stores/{id}/status': {
      put: {
        tags: ['Lojas'],
        summary: 'Define se a loja está aberta',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['open'],
                properties: { open: { type: 'boolean' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Store' } } } },
          400: { description: 'Erro de validação' },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    '/api/stores/{storeId}/products': {
      post: {
        tags: ['Produtos'],
        summary: 'Cria um produto para a loja',
        parameters: [
          { name: 'storeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductInput' },
            },
          },
        },
        responses: {
          201: { description: 'Produto criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          400: { description: 'Erro de validação' },
        },
        security: [{ bearerAuth: [] }],
      },
      get: {
        tags: ['Produtos'],
        summary: 'Lista produtos da loja',
        parameters: [
          { name: 'storeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Lista de produtos',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
              },
            },
          },
        },
      },
    },
    '/api/stores/{storeId}/orders': {
      post: {
        tags: ['Pedidos'],
        summary: 'Cria um pedido',
        parameters: [
          { name: 'storeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderInput' },
            },
          },
        },
        responses: {
          201: { description: 'Pedido criado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          400: { description: 'Erro de validação' },
        },
      },
      get: {
        tags: ['Pedidos'],
        summary: 'Lista pedidos por loja',
        parameters: [
          { name: 'storeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Pedidos encontrados',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
              },
            },
          },
        },
      },
    },
    '/api/plans': {
      get: {
        tags: ['Planos'],
        summary: 'Lista planos disponíveis',
        responses: {
          200: {
            description: 'Planos encontrados',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Plan' } } } },
          },
        },
      },
    },
    '/api/subscriptions': {
      post: {
        tags: ['Assinaturas'],
        summary: 'Cria uma assinatura para uma loja',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateSubscriptionInput' } },
          },
        },
        responses: {
          201: { description: 'Assinatura criada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
          400: { description: 'Erro de validação' },
        },
      },
    },
    '/api/stores/{storeId}/subscription': {
      get: {
        tags: ['Assinaturas'],
        summary: 'Obtém a assinatura vigente de uma loja',
        parameters: [{ name: 'storeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Assinatura encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
          404: { description: 'Assinatura não encontrada' },
        },
      },
    },
    '/api/subscriptions/{id}/renew': {
      post: {
        tags: ['Assinaturas'],
        summary: 'Renova uma assinatura existente',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RenewSubscriptionInput' } } },
        },
        responses: {
          200: { description: 'Assinatura renovada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
          400: { description: 'Erro ao renovar' },
        },
      },
    },
    '/api/subscriptions/{id}/status': {
      patch: {
        tags: ['Assinaturas'],
        summary: 'Ativa ou suspende uma assinatura',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSubscriptionStatusInput' } } },
        },
        responses: {
          200: { description: 'Status atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
          400: { description: 'Erro ao atualizar' },
        },
      },
    },
    '/api/admin/stores': {
      get: {
        tags: ['Admin'],
        summary: 'Lista lojas e assinaturas',
        responses: {
          200: {
            description: 'Lojas retornadas',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AdminStore' } } } },
          },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    '/api/admin/stores/{storeId}/suspend': {
      patch: {
        tags: ['Admin'],
        summary: 'Suspende uma loja e assinatura',
        parameters: [{ name: 'storeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSubscriptionStatusInput' } } },
        },
        responses: {
          200: { description: 'Assinatura suspensa', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
          400: { description: 'Erro ao suspender' },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    '/api/admin/stores/{storeId}/reactivate': {
      patch: {
        tags: ['Admin'],
        summary: 'Reativa uma loja e assinatura',
        parameters: [{ name: 'storeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSubscriptionStatusInput' } } },
        },
        responses: {
          200: { description: 'Assinatura reativada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } } },
          400: { description: 'Erro ao reativar' },
        },
        security: [{ bearerAuth: [] }],
      },
    },
    '/api/stores/{storeId}/products/{productId}': {
      put: {
        tags: ['Produtos'],
        summary: 'Atualiza um produto da loja',
        parameters: [
          { name: 'storeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } } },
        responses: {
          200: { description: 'Produto atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          400: { description: 'Erro de validação' },
        },
      },
      delete: {
        tags: ['Produtos'],
        summary: 'Remove um produto da loja',
        parameters: [
          { name: 'storeId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'Produto removido' },
          400: { description: 'Erro ao remover' },
        },
      },
    },
  },
};

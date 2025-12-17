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
  },
};

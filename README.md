# Espetinho Datony

Aplicação web para pedidos e gestão do restaurante de espetinhos Datony. O projeto traz duas experiências principais:

- **Loja do cliente**: montagem e edição do pedido, envio para WhatsApp e pagamento via chave Pix.
- **Painel interno**: dashboard com métricas, CRUD de produtos, fila do churrasqueiro (atualização a cada 5s) e histórico de pedidos.

## Como executar

```bash
npm install
npm start
```

## Scripts adicionais

- `npm run build` – gera a versão de produção.
- `npm test` – executa a suíte de testes padrão do Create React App.

## Tecnologias

- React (Create React App)
- Tailwind CSS via CDN
- Firebase Auth + Firestore
- Lucide React
- Recharts

## Contribuição
- Os arquivos de texto são normalizados via `.gitattributes` para evitar que o repositório seja tratado como binário durante a criação do PR.

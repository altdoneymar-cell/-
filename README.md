# 🌩️ STORM STORE — Bot de vendas para Discord

Projeto inicial funcional em Node.js + Discord.js v14 + SQLite. Inclui catálogo por categorias, pedidos em canais privados, Pix manual, integração opcional com Pix do Mercado Pago, webhook, aprovação manual, entrega manual, estoque e logs.

## Requisitos
- Node.js 20 ou superior
- Uma aplicação/bot no Discord Developer Portal
- Um servidor Discord onde você tenha permissão para adicionar bots
- Para Pix automático: conta Mercado Pago habilitada para receber pagamentos via API e credenciais de produção
- Hospedagem Node.js 24h com HTTPS público para o webhook

## Instalação
1. Extraia o ZIP e abra a pasta do projeto.
2. Copie `.env.example` para `.env` e preencha os campos.
3. No Discord Developer Portal, crie a aplicação, adicione um Bot e copie o token para `DISCORD_TOKEN`. Nunca compartilhe o token.
4. Em OAuth2 > URL Generator, selecione `bot` e `applications.commands`; conceda permissões para ver canais, enviar mensagens, incorporar links, gerenciar canais e usar comandos. Convide o bot ao servidor.
5. Instale dependências: `npm install`
6. Inicie: `npm start`
7. No Discord, use `/painel-loja`.
8. Cadastre produtos com `/adicionar-produto`.

## Como operar
- `/adicionar-produto`: cadastra categoria, nome, descrição, preço em reais e estoque. Use estoque `-1` para ilimitado.
- `Pix manual`: o bot mostra a chave Pix configurada e cria canal privado de pedido. Um administrador confere o recebimento e usa `/aprovar-pagamento pedido:<número>`.
- `Pix automático`: gera cobrança Pix via Mercado Pago se `MP_ACCESS_TOKEN` estiver configurado. O webhook consulta o pagamento no Mercado Pago antes de marcar como pago.
- `/entregar pedido:<número>`: marca o pedido como entregue e baixa o estoque.
- `/pedidos`, `/estoque`, `/cancelar-pedido`: administração.
- O comprador também pode abrir atendimento pelo botão no painel.

## Hospedagem 24h
Use hospedagem que rode processos Node.js continuamente (VPS ou plataforma de aplicações Node). Configure as variáveis de ambiente no painel da hospedagem. A URL pública HTTPS deve apontar para o serviço e `PUBLIC_BASE_URL` deve conter essa URL sem barra no final. Mantenha o processo ativo com o gerenciador da plataforma ou PM2.

## Configuração do Pix automático
1. Configure `MP_ACCESS_TOKEN` com o Access Token de produção da sua conta Mercado Pago.
2. Configure `PUBLIC_BASE_URL` com o endereço HTTPS público.
3. Cadastre a URL `https://SEU-DOMINIO.com/webhook/mercadopago` nas notificações/webhooks do Mercado Pago, se exigido pelo painel da sua conta.
4. Faça testes de ponta a ponta em ambiente de teste antes de vender.
5. Não marque pagamentos como pagos com base em print ou mensagem do comprador. O webhook consulta o status na API.

## Importante antes de colocar em produção
- Este projeto é uma base funcional, mas precisa ser configurado com seus IDs, credenciais e regras reais.
- O fluxo atual cria um pedido por produto e quantidade 1; carrinho, cupons, variações e entrega automatizada não estão incluídos.
- A entrega é manual, conforme solicitado. Use `/entregar` somente depois de entregar o produto.
- O webhook usa consulta do pagamento na API, mas recomenda-se adicionar validação de assinatura conforme a configuração atual da conta Mercado Pago, rate limiting e monitoramento antes de operação comercial.
- Faça backup periódico de `data/storm.sqlite`.
- Nunca envie `DISCORD_TOKEN`, `MP_ACCESS_TOKEN` ou `.env` em chats, prints ou repositórios públicos.
- Venda apenas produtos/contas/serviços que você tenha direito de comercializar e respeite os termos das plataformas envolvidas.

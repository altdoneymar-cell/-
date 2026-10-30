const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const commands = [
 new SlashCommandBuilder().setName('painel-loja').setDescription('Publica o painel principal da loja.'),
 new SlashCommandBuilder().setName('adicionar-produto').setDescription('Cadastra um produto.')
  .addStringOption(o=>o.setName('categoria').setDescription('Categoria').setRequired(true))
  .addStringOption(o=>o.setName('nome').setDescription('Nome do produto').setRequired(true))
  .addStringOption(o=>o.setName('descricao').setDescription('Descrição').setRequired(true))
  .addNumberOption(o=>o.setName('preco').setDescription('Preço em reais').setRequired(true).setMinValue(0.01))
  .addIntegerOption(o=>o.setName('estoque').setDescription('-1 para ilimitado').setRequired(true)),
 new SlashCommandBuilder().setName('estoque').setDescription('Consulta o estoque de um produto.')
  .addIntegerOption(o=>o.setName('id').setDescription('ID do produto').setRequired(true)),
 new SlashCommandBuilder().setName('pedidos').setDescription('Lista os últimos pedidos.'),
 new SlashCommandBuilder().setName('aprovar-pagamento').setDescription('Aprova manualmente um pagamento Pix.')
  .addIntegerOption(o=>o.setName('pedido').setDescription('Número do pedido').setRequired(true)),
 new SlashCommandBuilder().setName('entregar').setDescription('Marca um pedido como entregue.')
  .addIntegerOption(o=>o.setName('pedido').setDescription('Número do pedido').setRequired(true)),
 new SlashCommandBuilder().setName('cancelar-pedido').setDescription('Cancela um pedido pendente.')
  .addIntegerOption(o=>o.setName('pedido').setDescription('Número do pedido').setRequired(true))
].map(c=>c.toJSON());
module.exports = commands;
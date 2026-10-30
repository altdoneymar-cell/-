const {
 Client, GatewayIntentBits, REST, Routes, EmbedBuilder, ActionRowBuilder,
 ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionsBitField
} = require('discord.js');
const express = require('express');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const config = require('./config');
const db = require('./db');
const commands = require('./commands');

if (!config.token || !config.clientId || !config.guildId) {
 console.error('Configure DISCORD_TOKEN, CLIENT_ID e GUILD_ID no arquivo .env'); process.exit(1);
}
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const money = cents => (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const isAdmin = i => i.memberPermissions?.has(PermissionsBitField.Flags.Administrator) ||
 (config.adminRoleId && i.member?.roles?.cache?.has(config.adminRoleId));
const mp = config.mpAccessToken ? new Payment(new MercadoPagoConfig({ accessToken: config.mpAccessToken })) : null;

async function registerCommands() {
 const rest = new REST({version:'10'}).setToken(config.token);
 await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {body:commands});
 console.log('Comandos registrados.');
}
function catalogEmbed() {
 const products = db.prepare('SELECT * FROM products WHERE active=1 ORDER BY category,name').all();
 const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('🌩️ STORM STORE | LOJA')
  .setDescription('Bem-vindo(a)! Escolha uma categoria e confira os produtos disponíveis.')
  .setFooter({text:'STORM STORE • Atendimento e vendas'});
 const cats = [...new Set(products.map(p=>p.category))];
 embed.addFields({name:'Categorias disponíveis',value:cats.length ? cats.map(c=>'• '+c).join('\\n') : 'Nenhum produto cadastrado ainda.'});
 return embed;
}
async function sendLog(guild, text) {
 if (!config.logChannelId) return;
 const ch = await guild.channels.fetch(config.logChannelId).catch(()=>null);
 if (ch) ch.send({content:text}).catch(()=>{});
}
async function createOrder(interaction, productId, quantity, method) {
 const p = db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(productId);
 if (!p) return interaction.reply({content:'Produto não encontrado.',ephemeral:true});
 if (p.stock !== -1 && p.stock < quantity) return interaction.reply({content:'Estoque insuficiente.',ephemeral:true});
 const total = p.price_cents * quantity;
 const result = db.prepare(`INSERT INTO orders(user_id,product_id,quantity,total_cents,payment_method)
 VALUES(?,?,?,?,?)`).run(interaction.user.id,p.id,quantity,total,method);
 const orderId = Number(result.lastInsertRowid);
 const embed = new EmbedBuilder().setColor(0xF1C40F).setTitle(`🧾 Pedido #${orderId}`)
  .setDescription(`**${p.name}**\\n${p.description}\\nQuantidade: ${quantity}\\nTotal: **${money(total)}**\\nPagamento: **${method==='MP'?'Pix automático':'Pix manual'}**\\n\\nApós a confirmação, a equipe fará a entrega manualmente.`);
 const rows = [];
 if (method === 'MANUAL') {
  embed.addFields({name:'Chave Pix',value:config.pixKey || 'A chave Pix ainda não foi configurada.'},
   {name:'Titular',value:config.pixReceiverName});
 } else if (mp) {
  try {
   const payment = await mp.create({body:{transaction_amount:total/100,description:`STORM STORE pedido #${orderId}`,
    payment_method_id:'pix',payer:{email:`cliente${interaction.user.id}@stormstore.invalid`},
    notification_url:config.publicBaseUrl ? `${config.publicBaseUrl}/webhook/mercadopago` : undefined,
    external_reference:String(orderId)}});
   db.prepare('UPDATE orders SET mp_payment_id=? WHERE id=?').run(String(payment.id),orderId);
   const tx = payment.point_of_interaction?.transaction_data;
 if (tx?.qr_code) embed.addFields({ name: 'Pix copia e cola', value: String(tx.qr_code) });
   if (tx?.qr_code_base64) embed.addFields({name:'QR Code',value:'Abra o app do Discord para consultar o QR Code no link de pagamento, se disponível.'});
  } catch(e) {
   console.error('Mercado Pago:',e.message);
   embed.addFields({name:'Aviso',value:'Não foi possível gerar o Pix automático. Chame o atendimento ou use o Pix manual.'});
  }
 } else {
  embed.addFields({name:'Aviso',value:'Pix automático não está configurado. Use o Pix manual ou fale com o atendimento.'});
 }
 const ticket = await interaction.guild.channels.create({
  name:`pedido-${orderId}`,type:ChannelType.GuildText,
  parent:config.ticketCategoryId || undefined,
  permissionOverwrites:[
   {id:interaction.guild.roles.everyone.id,deny:['ViewChannel']},
   {id:interaction.user.id,allow:['ViewChannel','SendMessages','ReadMessageHistory']},
   {id:client.user.id,allow:['ViewChannel','SendMessages','ReadMessageHistory','ManageChannels']}
  ]
 }).catch(()=>null);
 if (ticket) {
  db.prepare('INSERT INTO tickets(channel_id,user_id,order_id) VALUES(?,?,?)').run(ticket.id,interaction.user.id,orderId);
  await ticket.send({content:`<@${interaction.user.id}> equipe STORM STORE`,embeds:[embed],
   components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`close_${orderId}`).setLabel('Fechar atendimento').setStyle(ButtonStyle.Secondary))]});
  await interaction.reply({content:`Pedido criado! Acompanhe no canal ${ticket}.`,ephemeral:true});
 } else await interaction.reply({embeds:[embed],ephemeral:true});
 await sendLog(interaction.guild,`🛒 Novo pedido #${orderId} • ${interaction.user.tag} • ${money(total)}`);
}
client.on('interactionCreate',async i=>{
 try {
  if (i.isChatInputCommand()) {
   if (['adicionar-produto','estoque','pedidos','aprovar-pagamento','entregar','cancelar-pedido'].includes(i.commandName) && !isAdmin(i))
    return i.reply({content:'Você não tem permissão para usar este comando.',ephemeral:true});
   if (i.commandName==='painel-loja') {
    const row=new ActionRowBuilder().addComponents(
     new ButtonBuilder().setCustomId('open_catalog').setLabel('🛍️ Ver produtos').setStyle(ButtonStyle.Primary),
     new ButtonBuilder().setCustomId('open_support').setLabel('🎫 Atendimento').setStyle(ButtonStyle.Secondary));
    return i.reply({embeds:[catalogEmbed()],components:[row]});
   }
   if (i.commandName==='adicionar-produto') {
    const price=Math.round(i.options.getNumber('preco')*100);
    const r=db.prepare('INSERT INTO products(category,name,description,price_cents,stock) VALUES(?,?,?,?,?)')
     .run(i.options.getString('categoria'),i.options.getString('nome'),i.options.getString('descricao'),price,i.options.getInteger('estoque'));
    return i.reply({content:`Produto cadastrado com ID **${r.lastInsertRowid}**.`,ephemeral:true});
   }
   if (i.commandName==='estoque') {
    const p=db.prepare('SELECT * FROM products WHERE id=?').get(i.options.getInteger('id'));
    return i.reply({content:p?`**${p.name}** — estoque: ${p.stock===-1?'ilimitado':p.stock}`:'Produto não encontrado.',ephemeral:true});
   }
   if (i.commandName==='pedidos') {
    const rows=db.prepare('SELECT o.*,p.name FROM orders o JOIN products p ON p.id=o.product_id ORDER BY o.id DESC LIMIT 10').all();
    return i.reply({content:rows.length?rows.map(o=>`#${o.id} • ${o.name} • ${money(o.total_cents)} • ${o.status}`).join('\\n'):'Nenhum pedido.',ephemeral:true});
   }
   const id=i.options.getInteger('pedido'), order=db.prepare('SELECT * FROM orders WHERE id=?').get(id);
   if (!order) return i.reply({content:'Pedido não encontrado.',ephemeral:true});
   if (i.commandName==='aprovar-pagamento') {
    db.prepare("UPDATE orders SET status='PAGO' WHERE id=?").run(id);
    await sendLog(i.guild,`✅ Pagamento do pedido #${id} aprovado por ${i.user.tag}.`);
    return i.reply({content:`Pagamento do pedido #${id} aprovado. A equipe pode realizar a entrega.`,ephemeral:true});
   }
   if (i.commandName==='entregar') {
    db.prepare("UPDATE orders SET status='ENTREGUE',delivered_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    const p=db.prepare('SELECT product_id,quantity FROM orders WHERE id=?').get(id);
    db.prepare('UPDATE products SET stock=CASE WHEN stock=-1 THEN -1 ELSE MAX(0,stock-?) END WHERE id=?').run(p.quantity,p.product_id);
    await sendLog(i.guild,`📦 Pedido #${id} marcado como entregue por ${i.user.tag}.`);
    return i.reply({content:`Pedido #${id} marcado como entregue.`,ephemeral:true});
   }
   if (i.commandName==='cancelar-pedido') {
    db.prepare("UPDATE orders SET status='CANCELADO' WHERE id=?").run(id);
    return i.reply({content:`Pedido #${id} cancelado.`,ephemeral:true});
   }
  }
  if (i.isButton() && i.customId==='open_catalog') {
   const cats=db.prepare('SELECT DISTINCT category FROM products WHERE active=1 ORDER BY category').all();
   if (!cats.length) return i.reply({content:'A loja ainda não tem produtos. A equipe pode cadastrá-los com /adicionar-produto.',ephemeral:true});
   const menu=new StringSelectMenuBuilder().setCustomId('category_select').setPlaceholder('Escolha uma categoria')
    .addOptions(cats.slice(0,25).map(c=>({label:c.category.slice(0,100),value:c.category})));
   return i.reply({content:'Selecione uma categoria:',components:[new ActionRowBuilder().addComponents(menu)],ephemeral:true});
  }
  if (i.isStringSelectMenu() && i.customId==='category_select') {
   const products=db.prepare('SELECT * FROM products WHERE category=? AND active=1 ORDER BY id').all(i.values[0]).slice(0,25);
   const menu=new StringSelectMenuBuilder().setCustomId('product_select').setPlaceholder('Escolha um produto')
    .addOptions(products.map(p=>({label:`${p.name} — ${money(p.price_cents)}`.slice(0,100),description:p.stock===-1?'Estoque disponível':`Estoque: ${p.stock}`.slice(0,100),value:String(p.id)})));
   return i.reply({content:'Escolha o produto:',components:[new ActionRowBuilder().addComponents(menu)],ephemeral:true});
  }
  if (i.isStringSelectMenu() && i.customId==='product_select') {
   const p=db.prepare('SELECT * FROM products WHERE id=?').get(Number(i.values[0]));
   const embed=new EmbedBuilder().setColor(0x5865F2).setTitle(p.name).setDescription(p.description)
    .addFields({name:'Preço',value:money(p.price_cents),inline:true},{name:'Estoque',value:p.stock===-1?'Disponível':String(p.stock),inline:true});
   const row=new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`buy_manual_${p.id}`).setLabel('Pix manual').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`buy_mp_${p.id}`).setLabel('Pix automático').setStyle(ButtonStyle.Primary));
   return i.reply({embeds:[embed],components:[row],ephemeral:true});
  }
  if (i.isButton() && /^buy_(manual|mp)_\\d+$/.test(i.customId)) {
   const [,method,pid]=i.customId.split('_');
   return createOrder(i,Number(pid),1,method==='mp'?'MP':'MANUAL');
  }
  if (i.isButton() && i.customId==='open_support') {
   const ch=await i.guild.channels.create({name:`suporte-${i.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,90),
    type:ChannelType.GuildText,parent:config.ticketCategoryId||undefined,
    permissionOverwrites:[{id:i.guild.roles.everyone.id,deny:['ViewChannel']},{id:i.user.id,allow:['ViewChannel','SendMessages','ReadMessageHistory']},{id:client.user.id,allow:['ViewChannel','SendMessages','ManageChannels']} ]});
   return i.reply({content:`Atendimento criado: ${ch}`,ephemeral:true});
  }
  if (i.isButton() && i.customId.startsWith('close_')) {
   if (!isAdmin(i) && !i.memberPermissions?.has(PermissionsBitField.Flags.ManageChannels))
    return i.reply({content:'Somente a equipe pode fechar este canal.',ephemeral:true});
   await i.reply({content:'Atendimento encerrado.'});
   setTimeout(()=>i.channel.delete().catch(()=>{}),3000);
  }
 } catch(e) { console.error(e); if(!i.replied&&!i.deferred) await i.reply({content:'Ocorreu um erro. Avise a equipe.',ephemeral:true}).catch(()=>{}); }
});
const app=express(); app.use(express.json());
app.get('/health',(req,res)=>res.json({ok:true,service:'STORM STORE'}));
app.post('/webhook/mercadopago',async(req,res)=>{
 try {
  if (!mp) return res.status(503).send('Pix automático desativado');
  const paymentId=req.query['data.id'] || req.body?.data?.id;
  if (!paymentId) return res.sendStatus(200);
  const payment=await mp.get({id:String(paymentId)});
  if (payment.status==='approved' && payment.external_reference) {
   const orderId=Number(payment.external_reference);
   db.prepare("UPDATE orders SET status='PAGO' WHERE id=? AND mp_payment_id=?").run(orderId,String(payment.id));
   const order=db.prepare('SELECT user_id FROM orders WHERE id=?').get(orderId);
   if (order) {
    const user=await client.users.fetch(order.user_id).catch(()=>null);
    if(user) await user.send(`✅ O pagamento do pedido #${orderId} da STORM STORE foi confirmado. A equipe fará a entrega manualmente.`).catch(()=>{});
   }
  }
  res.sendStatus(200);
 } catch(e) { console.error('Webhook:',e.message); res.sendStatus(500); }
});
app.listen(config.port,()=>console.log(`Webhook ativo na porta ${config.port}`));
client.once('ready',async()=>{console.log(`Online como ${client.user.tag}`);});
registerCommands().then(()=>client.login(config.token)).catch(e=>{console.error(e);process.exit(1);});

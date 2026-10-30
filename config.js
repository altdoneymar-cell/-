require('dotenv').config();
module.exports = {
 token: process.env.DISCORD_TOKEN, clientId: process.env.CLIENT_ID,
 guildId: process.env.GUILD_ID, adminRoleId: process.env.ADMIN_ROLE_ID,
 logChannelId: process.env.LOG_CHANNEL_ID, ticketCategoryId: process.env.TICKET_CATEGORY_ID,
 port: Number(process.env.PORT || 3000), publicBaseUrl: process.env.PUBLIC_BASE_URL,
 mpAccessToken: process.env.MP_ACCESS_TOKEN, mpWebhookSecret: process.env.MP_WEBHOOK_SECRET,
 pixKey: process.env.PIX_KEY, pixReceiverName: process.env.PIX_RECEIVER_NAME || 'STORM STORE',
 pixReceiverCity: process.env.PIX_RECEIVER_CITY || 'SAO PAULO'
};
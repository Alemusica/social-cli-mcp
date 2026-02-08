import { Telegraf } from 'telegraf';

const token = process.env.BOT_TOKEN || '';
console.log('Token length:', token.length);
console.log('Creating bot...');

const bot = new Telegraf(token);

bot.command('test', async (ctx) => {
  console.log('Received /test');
  await ctx.reply('Working!');
});

console.log('Launching with polling...');
bot.launch({ dropPendingUpdates: true })
  .then(() => console.log('✅ Bot launched successfully!'))
  .catch((e) => console.error('❌ Launch error:', e));

// Keep alive
setTimeout(() => console.log('Still running...'), 10000);

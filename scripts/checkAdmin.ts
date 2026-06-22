import whatsappSingleton from '../src/services/whatsappSingleton';

const TARGET_GROUP_KEYWORD = 'figurinhas'; // parte do nome do grupo
const TARGET_USER_ID = '639474500179@c.us'; // MI500179
const TEST_USER_ID = '889983143220@c.us'; // número de teste

(async () => {
  const client = await whatsappSingleton.getClient();
  if (!client.info) await new Promise(r => client.once('ready', r));

  const chats = await client.getChats();
  const targetChat = chats.find(c => c.isGroup && c.name && c.name.toLowerCase().includes(TARGET_GROUP_KEYWORD));
  if (!targetChat) {
    console.error('❌ Grupo não encontrado');
    process.exit(1);
  }
  console.log(`✅ Grupo encontrado: ${targetChat.name} (${targetChat.id._serialized})`);

  const participants = targetChat.participants || [];
  const bot = participants.find(p => p.isMe);
  console.log('Bot admin?', Boolean(bot?.isAdmin || bot?.isSuperAdmin));

  const targetUser = participants.find(p => p.id && p.id._serialized === TARGET_USER_ID);
  console.log('Usuário alvo no grupo?', !!targetUser);
  if (targetUser) console.log('Usuário alvo admin?', Boolean(targetUser?.isAdmin || targetUser?.isSuperAdmin));

  // Tenta apagar mensagem recente do usuário de teste
  const messages = await targetChat.fetchMessages({ limit: 50 });
  const testMsg = messages.find(m => m.author === TEST_USER_ID || m.from === TEST_USER_ID);
  if (testMsg) {
    try {
      await testMsg.delete(true);
      console.log('✅ Mensagem de teste apagada.');
    } catch (e:any) {
      console.error('❌ Falha ao apagar mensagem de teste:', e.message);
    }
  } else {
    console.log('ℹ️ Nenhuma mensagem recente do número de teste encontrada.');
  }

  // Tenta banir usuário alvo usando lógica similar ao comando $ban
  if (!bot || !(bot.isAdmin || bot.isSuperAdmin)) {
    console.error('❌ Bot não é admin, não pode banir.');
    process.exit(1);
  }
  if (!targetUser) {
    console.error('❌ Usuário alvo não está no grupo.');
    process.exit(1);
  }
  if (targetUser.isAdmin || targetUser.isSuperAdmin) {
    console.error('❌ Usuário alvo é admin, não pode ser banido.');
    process.exit(1);
  }

  // Apagar mensagens do usuário alvo (últimas 100)
  const allMsgs = await targetChat.fetchMessages({ limit: 100 });
  const userMsgs = allMsgs.filter(m => m.author === TARGET_USER_ID);
  let deleted = 0;
  for (const m of userMsgs) {
    try { await m.delete(true); deleted++; } catch (_) {}
  }
  console.log(`🧹 Mensagens apagadas do usuário alvo: ${deleted}`);

  // Remover participante
  try {
    await targetChat.removeParticipants([TARGET_USER_ID]);
    console.log('✅ Usuário removido do grupo.');
  } catch (e:any) {
    console.error('❌ Falha ao remover usuário:', e.message);
  }

  // Bloquear contato
  try {
    await client.blockContact(TARGET_USER_ID);
    console.log('🔒 Contato bloqueado.');
  } catch (e:any) {
    console.error('⚠️ Falha ao bloquear contato:', e.message);
  }

  process.exit(0);
})();

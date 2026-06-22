// Script de teste para verificar se o bot é admin e tentar banir/ apagar mensagens
// Grupo alvo: contém "figurinhas" no nome
// Usuário alvo: +639474500179 (MI500179) e número de teste 889983143220

const whatsappSingleton = require('../src/services/whatsappSingleton');

const TARGET_GROUP_KEYWORD = 'figurinhas'; // parte do nome do grupo
const TARGET_USER_ID = '639474500179@c.us'; // MI500179
const TEST_USER_ID = '889983143220@c.us'; // número de teste fornecido

async function run() {
  const client = await whatsappSingleton.getClient();
  console.log('✅ Cliente obtido');

  // Aguarda ready se necessário
  if (!client.info) {
    await new Promise((resolve) => client.once('ready', resolve));
  }

  // Busca o grupo
  const chats = await client.getChats();
  const targetChat = chats.find((c) => c.isGroup && c.name && c.name.toLowerCase().includes(TARGET_GROUP_KEYWORD));
  if (!targetChat) {
    console.error('❌ Grupo com palavra-chave não encontrado.');
    process.exit(1);
  }
  console.log(`✅ Grupo encontrado: ${targetChat.name} (${targetChat.id._serialized})`);

  // Verifica se o bot é admin
  const participants = targetChat.participants || [];
  const botParticipant = participants.find((p) => p.isMe);
  const isBotAdmin = Boolean(botParticipant?.isAdmin || botParticipant?.isSuperAdmin);
  console.log(`Bot admin? ${isBotAdmin}`);

  // Verifica se o usuário alvo está no grupo
  const userParticipant = participants.find((p) => p.id && p.id._serialized === TARGET_USER_ID);
  console.log(`Usuário alvo presente no grupo? ${!!userParticipant}`);

  // Tenta apagar mensagem recente do usuário de teste (se houver)
  const messages = await targetChat.fetchMessages({ limit: 50 });
  const testMsg = messages.find((m) => m.author === TEST_USER_ID || m.from === TEST_USER_ID);
  if (testMsg) {
    try {
      await testMsg.delete(true);
      console.log('✅ Mensagem de teste apagada com sucesso.');
    } catch (e) {
      console.error('❌ Falha ao apagar mensagem de teste:', e.message);
    }
  } else {
    console.log('ℹ️ Nenhuma mensagem recente encontrada do número de teste.');
  }

  // Tenta banir o usuário alvo usando a mesma lógica do comando $ban
  if (!isBotAdmin) {
    console.error('❌ Bot não é admin, não pode banir.');
    process.exit(1);
  }
  if (!userParticipant) {
    console.error('❌ Usuário alvo não está no grupo.');
    process.exit(1);
  }
  const isUserAdmin = Boolean(userParticipant?.isAdmin || userParticipant?.isSuperAdmin);
  if (isUserAdmin) {
    console.error('❌ Usuário alvo é admin, não pode ser banido.');
    process.exit(1);
  }

  // Apagar mensagens do usuário alvo (últimas 100)
  const allMsgs = await targetChat.fetchMessages({ limit: 100 });
  const userMsgs = allMsgs.filter((m) => m.author === TARGET_USER_ID);
  let deleted = 0;
  for (const m of userMsgs) {
    try { await m.delete(true); deleted++; } catch (_) {}
  }
  console.log(`🧹 Mensagens apagadas do usuário alvo: ${deleted}`);

  // Remover participante
  try {
    await targetChat.removeParticipants([TARGET_USER_ID]);
    console.log('✅ Usuário removido do grupo.');
  } catch (e) {
    console.error('❌ Falha ao remover usuário:', e.message);
  }

  // Bloquear contato
  try {
    await client.blockContact(TARGET_USER_ID);
    console.log('🔒 Contato bloqueado.');
  } catch (e) {
    console.error('⚠️ Falha ao bloquear contato:', e.message);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});

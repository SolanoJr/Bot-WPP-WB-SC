# 📜 ChangeLog - WarriorBlack Bot

## [v1.0.0-JS-STABLE] - 2026-04-30
### 🚀 Estabilização e Blindagem de Produção

#### Adicionado
- **Novo Protocolo de Autenticação**: Implementada a variável `WARRIOR_AUTH_KEY` (16 caracteres) substituindo o sistema legado.
- **Middleware Manual de CORS**: Interceptor de Pre-flight (`OPTIONS`) respondendo com `204 No Content` para eliminar erros de `Failed to fetch`.
- **Diagnóstico Profundo**: Rota `/debug-env-check` no Relay para validar comprimentos de chaves e status de variáveis de ambiente.
- **Sanitização de URL**: Lógica no Frontend para remover automaticamente sufixos de porta (ex: `:296`) injetados por erro.

#### Alterado
- **Arquitetura Zero-Native (Anti-GLIBC)**: Remoção completa da dependência do SQLite no Relay. O armazenamento agora é **In-Memory** (Pure JS), resolvendo definitivamente os erros de `GLIBC_2.38` no Render.
- **Downgrade de Ambiente**: Node.js ajustado para **v20.x (LTS)** no `package.json` para máxima estabilidade em containers Linux.
- **Sincronização de Parâmetros**: Frontend e Bot agora utilizam `warriorKey` como padrão de comunicação.

#### Corrigido
- **CORS Pre-flight**: Erro de cabeçalho `x-api-key` não permitido resolvido com `Access-Control-Allow-Headers` explícito.
- **Polling Authentication**: Corrigido erro `401` no Bot ao tentar capturar localizações no Relay sem a chave Warrior.
- **Erro de Módulo**: Dependências `cors`, `express` e `dotenv` reinstaladas e formalizadas no `package.json`.

---
*Este é o estado estável pré-migração para TypeScript.*

# Configuração de Secrets do GitHub

Para ativar o CI/CD automático, adicione os seguintes secrets no repositório GitHub:

## Passos para adicionar secrets:

1. Vá para o repositório no GitHub
2. Clique em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Adicione os seguintes secrets:

### Secrets necessários:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `SERVER_HOST` | `100.101.218.16` | IP do servidor Linux |
| `SERVER_USER` | `solanojr` | Usuário do servidor |
| `SSH_PRIVATE_KEY` | `<sua chave SSH privada>` | Chave SSH para acesso ao servidor |

## Como obter a chave SSH privada:

No seu computador local, execute:
```bash
cat ~/.ssh/id_rsa
```

Copie todo o conteúdo (incluindo as linhas BEGIN e END) e cole no campo de valor do secret.

## Após configurar:

O workflow `.github/workflows/ci-cd.yml` irá:
1. Executar testes automaticamente em cada push/PR
2. Fazer deploy automático no servidor quando houver push na branch main

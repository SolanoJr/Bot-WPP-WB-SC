# Como obter a Chave SSH Privada

## Opção 1: Se você já tem acesso SSH ao servidor

No seu computador Windows, execute no PowerShell ou CMD:

```bash
cat ~/.ssh/id_rsa
```

Se esse arquivo não existir, pode ser `id_ed25519`:

```bash
cat ~/.ssh/id_ed25519
```

Copie **todo o conteúdo** incluindo as linhas:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...conteúdo da chave...
-----END OPENSSH PRIVATE KEY-----
```

## Opção 2: Gerar nova chave SSH (se não tiver)

No Windows (PowerShell):

```bash
ssh-keygen -t ed25519 -C "github-actions"
```

Quando perguntado onde salvar, pressione Enter para usar o padrão.
Quando pedir senha, pressione Enter (sem senha para automação).

Depois copie a chave privada:

```bash
cat ~/.ssh/id_ed25519
```

## Opção 3: No servidor Linux

Se você tem acesso ao servidor, pode gerar lá:

```bash
ssh-keygen -t ed25519 -C "github-actions"
cat ~/.ssh/id_ed25519
```

## Adicionar a chave pública ao servidor

Se você gerou uma nova chave, precisa adicionar a chave pública ao servidor:

No Windows (depois de gerar a chave):
```bash
cat ~/.ssh/id_ed25519.pub
```

Copie esse conteúdo e adicione ao arquivo `~/.ssh/authorized_keys` no servidor:

```bash
echo "sua-chave-publica-aqui" >> ~/.ssh/authorized_keys
```

## No GitHub

1. Vá para: Settings → Secrets and variables → Actions
2. Clique em "New repository secret"
3. Name: `SSH_PRIVATE_KEY`
4. Secret: Cole o conteúdo da chave privada (todo o arquivo)
5. Clique em "Add secret"

## Importante

- A chave privada deve começar com `-----BEGIN` e terminar com `-----END`
- Não compartilhe essa chave com ninguém
- Se usar chave com senha, o GitHub Actions não funcionará automaticamente

# Ambiente de Execução

## Windows (máquina local)
- **Git**: 2.54.0.windows.1
- **Node.js**: v24.15.0
- **npm**: 11.12.1

## Linux (servidor `100.101.218.16`)
- **SO**: Ubuntu 22.04 LTS (kernel 7.0.2-6-pve)
- **Git**: 2.43.0
- **Node.js**: v20.20.2
- **npm**: 10.8.2

## Observações
- Todas as versões atendem ao requisito mínimo (`node >= 20.x`).
- Caso precise atualizar, siga as instruções de `setup.sh`/`setup.ps1` que já estão no repositório.

## Vulnerabilidades conhecidas (npm audit)
- **esbuild** 0.27.3 → 0.28.0 (arbitrary‑file‑read on Windows)
- **js-yaml** ≤ 4.1.1 (quadratic‑complexity DoS)

As correções são aplicadas no próximo commit (overrides).
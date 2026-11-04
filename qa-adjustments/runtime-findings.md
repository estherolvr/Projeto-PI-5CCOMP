# Validação de agendamentos e notificações — 04/11/2026

Versão funcional publicada: `1be79f3`. Nenhuma alteração de plano ou cobrança foi efetuada.

- 79 testes de backend aprovados; builds aprovados.
- Produção: criação de agendamento com JPEG grande, consulta após reload, download e cancelamento do registro QA aprovados.
- Produção: marcar todas como lidas e consultar novamente após reload aprovado para Aluno e ASA.
- Regressão de chamado: bloqueada por HTTP 503 ao criar; uma nova execução falhou antes, na consulta da sessão.
- Teste sem anexo: primeira execução precisou sincronizar o carregamento das datas; a execução seguinte foi bloqueada por HTTP 503 no login. Não considerar aprovado após a publicação.

## Bloqueio confirmado nos logs da Cloudflare

O tail da versão publicada registrou `outcome: exceededCpu`, `cpuTime: 10`, HTTP 503 em `/api/auth/me` (duas requisições) e `/api/health`. A resposta externa apresentou `error code: 1102`. Portanto, há esgotamento do limite de CPU por requisição, inclusive em rotas sem anexos.

A redução do tráfego de anexos resolve a duplicação de bytes nas respostas e reduz trabalho, mas não permite declarar o 503 resolvido. É necessário adequar a capacidade de execução da Cloudflare ao backend Express/Prisma ou migrar o backend. Consultas da API de configurações retornaram uso `standard`, sem limite personalizado; a credencial atual não permite consultar assinaturas/cobrança (403).

Após habilitar uma capacidade adequada, configurar o limite de CPU compatível e repetir ADJ-001, ADJ-007 e ADJ-008. ADJ-008 altera o estado de leitura das contas de teste e exige autorização de escrita.

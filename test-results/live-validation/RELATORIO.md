# Validação dos acessos e fluxos em produção

Executada em 31/10/2026 22:32 -03, no endereço https://alvaro-ai.joao-fsantana.workers.dev.

## Resultado

- Produção: **120 aprovadas / 127 verificações**, com **7 falhas**.
- Backend local: **15 testes aprovados**, sem falhas, em SQLite isolado.
- Os três acessos foram autenticados pela API e pela interface Chromium. Nenhuma senha foi alterada.

## Correspondência das senhas fornecidas

Os números abaixo se referem à ordem original das três senhas enviadas pelo usuário; os valores completos não são armazenados neste relatório.

| Conta | Perfil | Senha na lista original | Terminação distintiva |
|---|---|---|---|
| joao.fsantana@outlook.com | ASA | 3ª | `barata` |
| higorlfonsecas@gmail.com | Aluno | 2ª | `BarataA` |
| oliveiracostaesther@gmail.com | Administradora | 1ª | `Barata` |

## Fluxos aprovados

- Login e identificação correta dos três perfis; rejeição das combinações incorretas verificadas.
- Navegação nas 24 páginas Admin, 12 ASA e seis Aluno incluídas no roteiro, mais os logins, guardas de perfil e verificação de overflow horizontal móvel.
- Bloqueios de API: aluno não acessa administração/equipe/métricas gerais; ASA não acessa prompts/integrações administrativos nem cria administradores; ausência de sessão e token inválido são recusados.
- Cadastro próprio do aluno e bloqueio de outro identificador de estudante.
- Criação de documento sintético, recuperação RAG pelo código de validação e persistência da conversa.
- Envio de mensagem pelo navegador e renderização da resposta, com HTTP 201. Isso não significa geração Gemini aprovada; ver falha abaixo.
- Abertura de chamado vinculado à conversa, leitura de contexto pelo ASA, atribuição, nota interna, resposta pública, ocultação da nota ao aluno, resolução, consulta pelo Admin e fechamento.
- Agendamento, consulta pelo ASA, bloqueio de conclusão pelo aluno e cancelamento pelo próprio aluno.
- Listagens de métricas, auditoria, equipe, feedback e configurações administrativas responderam sem erros nos cenários executados.

## Falhas confirmadas

| Prioridade | Falha | Evidência |
|---|---|---|
| Crítica | Aluno pode editar a base de conhecimento institucional | PUT no documento criado exclusivamente para teste retornou HTTP 200; esperado 403. A edição foi idêntica ao título de teste e não alterou documento preexistente. |
| Alta | Upload anuncia sucesso sem arquivo no R2 | POST de TXT retornou 201, mas document.r2Key veio vazio. Download desse arquivo retornou 404. Snapshot da conversa também retornou 404. Três verificações falharam. |
| Alta | Extração incorreta de PDF comprimido | PDF válido e sintético contendo ALVARO-PDF-VERIFICACAO-6421 foi aceito com 201, porém o texto extraído não continha o código. A leitura do binário como UTF-8 não substitui extração de PDF. |
| Alta | Gemini não gerou a resposta | O navegador recebeu uma resposta com o padrão exato de fallback; logs capturados confirmam falha ao chamar gemini-3.8-flash e mudança para sintetizador local. A chave/modelo configurados não comprovam geração funcional. |
| Média | Calendário ICS usa fuso incorreto | DTSTART não corresponde ao horário agendado em America/Sao_Paulo convertido para UTC. O serviço usa Date.UTC com os horários locais, causando deslocamento de três horas. |

## Registros de teste

O chamado de teste foi fechado; o agendamento foi cancelado; os três documentos criados (texto manual, TXT e PDF) foram arquivados. A conversa, feedback e auditoria foram mantidos para inspeção. Nenhum registro preexistente foi apagado. Os identificadores dos registros estão em results.json.

## Evidências

- results.json: roteiro consolidado e status de cada verificação.
- browser-results.json: verificações Chromium.
- chat-provider-results.json: envio pelo navegador e logs sanitizados de Gemini.
- admin-dashboard.png, asa-dashboard.png, aluno-dashboard.png, aluno-mobile.png e aluno-chat.png: capturas das interfaces.

## Limites da validação

Os testes de navegação comprovam carregamento, ausência dos erros observados e guardas de acesso, mas não aprovam como reais todos os números mostrados nas telas. Ainda há componentes com dados demonstrativos já identificados na revisão do projeto. Não houve criação de uma segunda conta de aluno para teste de isolamento entre dois alunos, nem validação de recuperação de senha, carga prolongada, todos os formatos PDF ou todas as combinações de formulários. As falhas encontradas não foram corrigidas nem publicadas nesta etapa, cujo escopo foi validar os acessos e executar testes.

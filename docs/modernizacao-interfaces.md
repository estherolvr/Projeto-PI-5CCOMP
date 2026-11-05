# Modernização das interfaces privadas

Escopo: Admin, ASA e Aluno. Home e Login não foram editados. Os estilos novos exigem `.workspace-shell`, presente exclusivamente nos layouts privados. Os diálogos renderizados em portal recebem estilo apenas enquanto um desses layouts está montado.

## Apresentação

- Navegação verde institucional, estado ativo claro, logotipo branco e agrupamento dos menus existentes.
- Cabeçalhos de dashboard com hierarquia editorial e identidade institucional.
- Indicadores reais com tipografia numérica e ações do aluno com ícones Lucide.
- Superfícies, tabelas, campos, foco de teclado e diálogos com acabamento consistente.
- Mobile e modo escuro preservados.
- Emojis dos assuntos de agendamento substituídos por Lucide.

Nenhum endpoint, payload, evento de negócio, permissão, consulta ou estrutura de dados foi alterado. Os contadores continuam calculados sobre as respostas reais das APIs.

## Validação

Build TypeScript/Vite aprovado. Testes em `qa-adjustments/design.spec.ts` percorrem os links dos menus de cada perfil, alternam tema e verificam dashboard e menu em 1440 × 1000 e 390 × 844. Capturas são geradas no diretório de resultados do Playwright. Executar com as seis variáveis E2E já documentadas; nenhuma credencial fica no código.

Quatro testes existentes de `roles.spec.ts` passaram contra o frontend modificado e API real: consulta e recarga do perfil acadêmico, descrição persistida de agendamento, isolamento dos perfis e monitor SLA/notificações.

O primeiro encaminhamento local falhou com HTTP 502 antes do login. A causa foi a configuração do proxy do ambiente de execução, resolvida no servidor temporário de validação, sem mudar a configuração de produção.

Limite da validação: esta rodada visual não executou todas as operações de escrita, exclusões, uploads ou chamadas ao Gemini. Não representa uma nova auditoria funcional exaustiva. As regras e os handlers existentes foram preservados no diff.

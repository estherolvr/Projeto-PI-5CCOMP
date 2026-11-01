-- Execute no SQL Editor do Supabase após revisar. Remove somente registros
-- gerados pela validação automatizada. Preserva User, Student e AuditEvent.
BEGIN;
CREATE TEMP TABLE cleanup_test_conversations ON COMMIT DROP AS
 SELECT c.id FROM public."Conversation" c
 WHERE c.id IN ('5be92351-81af-4b4a-a55c-bfd4fa73a4e7', '790f9158-2b14-44e9-bf0b-348fdd513dc1')
 AND c."studentId" = '0f8afa73-528c-42b2-bfd3-0e809de70e94'
 AND EXISTS (SELECT 1 FROM public."ChatMessage" m WHERE m."conversationId" = c.id AND m.content LIKE '%Teste automatizado%');
DELETE FROM public."AIFeedback" WHERE "conversationId" IN (SELECT id FROM cleanup_test_conversations);
DELETE FROM public."Ticket" WHERE id IN ('e8bb81c7-72c3-48d7-91b3-9d9538b7e564', '88ab29ab-11c9-4ef0-b6a4-102719de6a94') AND title LIKE 'TESTE-%';
DELETE FROM public."Conversation" WHERE id IN (SELECT id FROM cleanup_test_conversations)
 AND NOT EXISTS (SELECT 1 FROM public."Ticket" t WHERE t."conversationId" = public."Conversation".id);
DELETE FROM public."Appointment" WHERE id IN ('0b286d83-987a-4616-aa44-75ce5bdb5e21', '7150e6e1-4071-4aba-8984-b68b75917341') AND subject LIKE 'TESTE-%' AND status = 'cancelado';
SELECT 'Contas institucionais preservadas' AS verificacao,
 (SELECT count(*) FROM public."User") AS colaboradores,
 (SELECT count(*) FROM public."Student") AS alunos;
COMMIT;
-- Os snapshots R2 das conversas devem ser excluídos pelos caminhos exatos
-- listados abaixo, após a transação. Não apagar o bucket nem prefixos inteiros.
-- conversas/0f8afa73-528c-42b2-bfd3-0e809de70e94/5be92351-81af-4b4a-a55c-bfd4fa73a4e7.json
-- conversas/0f8afa73-528c-42b2-bfd3-0e809de70e94/790f9158-2b14-44e9-bf0b-348fdd513dc1.json

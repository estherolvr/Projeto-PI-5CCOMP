import test from 'node:test'
import assert from 'node:assert/strict'
import { AIService } from '../src/services/ai.service'

const ai = new AIService()
const introduction = 'Projeto interdisciplinar de agentes inteligentes. A aplicação oferece atendimento ao estudante, integração mobile e serviços em nuvem. '
// PDF text can contain thousands of characters without a single line break.
const schedule = 'Cronograma de Atividades. Entrega 1 (E1) parcial via GitHub: 20/09/2030 até 22:15. Entrega 2 (E2) final via GitHub: 12/12/2030 até 21:45. Atraso: perda de pontos por dia. '

test('flat PDF text retrieves deadlines near the end instead of its introduction', () => {
  const content = introduction.repeat(150) + schedule
  const result = ai.extractRelevantExcerpt(content, 'Qual o prazo de entrega do projeto?')
  assert.ok(result.score > 5)
  assert.match(result.excerpt, /20\/09\/2030 até 22:15/)
  assert.match(result.excerpt, /12\/12\/2030 até 21:45/)
  assert.ok(result.excerpt.length <= 6000)
})

test('multiple distant deadlines are retained in document order', () => {
  const content = introduction.repeat(25) + 'Cronograma: entrega parcial em 05/03/2031 até 20:00. '
    + introduction.repeat(65) + 'Cronograma: entrega final em 18/08/2031 até 19:30. '
    + introduction.repeat(25)
  const { excerpt } = ai.extractRelevantExcerpt(content, 'Quais as datas do cronograma de entregas?')
  assert.match(excerpt, /05\/03\/2031 até 20:00/)
  assert.match(excerpt, /18\/08\/2031 até 19:30/)
  assert.ok(excerpt.indexOf('05/03/2031') < excerpt.indexOf('18/08/2031'))
  assert.ok(excerpt.length <= 6000)
})

test('a bounded excerpt locates evidence before applying its character budget', () => {
  const content = introduction.repeat(90) + 'A entrega final ocorre em 07/07/2032 às 18:20. '
  const { excerpt } = ai.extractRelevantExcerpt(content, 'Quando é a entrega final?', 300)
  assert.match(excerpt, /07\/07\/2032 às 18:20/)
  assert.ok(excerpt.length <= 300)
})

test('short headings and table rows survive paragraph and line breaks', () => {
  const content = introduction.repeat(30) + '\n\nCronograma\n\nE1\n\nEntrega parcial\n09/04/2033 17:40\n\nE2\n\nEntrega final\n11/06/2033 16:30'
  const { excerpt } = ai.extractRelevantExcerpt(content, 'Qual o cronograma de entregas?')
  assert.match(excerpt, /09\/04\/2033 17:40/)
  assert.match(excerpt, /11\/06\/2033 16:30/)
})

test('accent and plural variants retain deadline evidence', () => {
  const { excerpt } = ai.extractRelevantExcerpt(introduction.repeat(30) + schedule, 'QUAIS OS PRAZOS DAS ENTREGAS?')
  assert.match(excerpt, /12\/12\/2030 até 21:45/)
})

test('unrelated questions and stopwords do not receive arbitrary source text', () => {
  for (const query of ['endereço hospital veterinário', 'Qual?', '']) {
    assert.deepEqual(ai.extractRelevantExcerpt(introduction + schedule, query), { excerpt: '', score: 0 })
  }
})

test('short keywords match whole words rather than parts of unrelated words', () => {
  assert.deepEqual(ai.extractRelevantExcerpt('Retire uma cópia impressa da documentação no balcão.', 'PI'), { excerpt: '', score: 0 })
})

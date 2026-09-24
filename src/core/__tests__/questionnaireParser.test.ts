// src/core/__tests__/questionnaireParser.test.ts
// Unit tests for the Markdown questionnaire parser.

import { parseQuestionnaire } from '../questionnaireParser';

const SAMPLE_MD = `
# Section: Pain Assessment

## Q1 | radio | required
Do you have knee pain?
- Never
- Sometimes
- Always

## Q2 | scale | required | min:0 | max:10 | minLabel:None | maxLabel:Severe
Rate your pain.

## Q3 | text | optional | maxLength:200
Describe the pain.

## Q4 | multiselect | required
What aggravates it?
- Walking
- Stairs
- Squatting

## Q5 | radio | required | dependsOn:Q1 | showIf:Sometimes,Always
Has it worsened?
- Yes
- No
`;

describe('parseQuestionnaire', () => {
  const items = parseQuestionnaire(SAMPLE_MD);

  test('should produce 6 items (1 section + 5 questions)', () => {
    expect(items).toHaveLength(6);
  });

  test('first item is a section header', () => {
    expect(items[0]).toMatchObject({ type: 'section', title: 'Pain Assessment' });
  });

  test('Q1 is a required radio question with 3 options', () => {
    expect(items[1]).toMatchObject({
      type: 'radio',
      meta: { id: 'Q1', isRequired: true },
      prompt: 'Do you have knee pain?',
      options: ['Never', 'Sometimes', 'Always'],
    });
  });

  test('Q2 is a scale question with correct min/max and labels', () => {
    expect(items[2]).toMatchObject({
      type: 'scale',
      meta: { id: 'Q2', isRequired: true },
      min: 0,
      max: 10,
      minLabel: 'None',
      maxLabel: 'Severe',
    });
  });

  test('Q3 is an optional text question with maxLength', () => {
    expect(items[3]).toMatchObject({
      type: 'text',
      meta: { id: 'Q3', isRequired: false },
      maxLength: 200,
    });
  });

  test('Q4 is a multiselect question', () => {
    expect(items[4]).toMatchObject({
      type: 'multiselect',
      options: ['Walking', 'Stairs', 'Squatting'],
    });
  });

  test('Q5 has conditional dependency on Q1', () => {
    const q5 = items[5] as any;
    expect(q5.meta.dependsOn).toBe('Q1');
    expect(q5.meta.showIf).toEqual(['Sometimes', 'Always']);
  });
});

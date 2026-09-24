// src/core/questionnaireParser.ts
// Parses structured Markdown questionnaire files into typed QuestionModel objects.
//
// Supported DSL:
//   # Section: <title>
//   ## <id> | <type> | [required|optional] | [key:value ...]
//   <prompt text>
//   - <option>   (for radio / multiselect)

// ── Type Definitions ──────────────────────────────────────────────────────────

export interface QuestionMeta {
  id: string;
  isRequired: boolean;
  dependsOn?: string;   // ID of a parent question
  showIf?: string[];    // Parent answer values that make this question visible
}

export interface SectionHeader {
  type: 'section';
  title: string;
}

export interface RadioQuestion {
  type: 'radio';
  meta: QuestionMeta;
  prompt: string;
  options: string[];
}

export interface MultiSelectQuestion {
  type: 'multiselect';
  meta: QuestionMeta;
  prompt: string;
  options: string[];
}

export interface TextQuestion {
  type: 'text';
  meta: QuestionMeta;
  prompt: string;
  maxLength?: number;
  maxLines?: number;
}

export interface ScaleQuestion {
  type: 'scale';
  meta: QuestionMeta;
  prompt: string;
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}

export type QuestionModel =
  | RadioQuestion
  | MultiSelectQuestion
  | TextQuestion
  | ScaleQuestion;

export type QuestionnaireItem = SectionHeader | QuestionModel;

// ── Parser ────────────────────────────────────────────────────────────────────

interface QuestionBlock {
  id: string;
  type: string;
  meta: QuestionMeta;
  attrs: Record<string, string>;
  prompt: string;
  options: string[];
}

/**
 * Parse a raw questionnaire Markdown string into an ordered list of items.
 * Each item is either a SectionHeader or a QuestionModel subtype.
 */
export function parseQuestionnaire(markdownContent: string): QuestionnaireItem[] {
  const lines = markdownContent.split('\n');
  const items: QuestionnaireItem[] = [];

  let currentBlock: QuestionBlock | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // ── Section header: # Section: ...
    if (line.startsWith('# ')) {
      if (currentBlock) flushBlock(currentBlock, items);
      currentBlock = null;
      const title = line.slice(2).replace(/^Section:\s*/i, '').trim();
      items.push({ type: 'section', title });
      continue;
    }

    // ── Question header: ## Q1 | radio | required | ...
    if (line.startsWith('## ')) {
      if (currentBlock) flushBlock(currentBlock, items);
      currentBlock = parseQuestionHeader(line.slice(3));
      continue;
    }

    // ── Option line: - Option text
    if (line.startsWith('- ') && currentBlock) {
      currentBlock.options.push(line.slice(2).trim());
      continue;
    }

    // ── Prompt text: non-empty, non-special line inside a question block
    if (line.length > 0 && currentBlock && currentBlock.prompt === '') {
      currentBlock.prompt = line;
      continue;
    }
  }

  // Flush last block
  if (currentBlock) flushBlock(currentBlock, items);

  return items;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse "Q1 | radio | required | min:0 | max:10 | dependsOn:Q3 | showIf:Yes,No"
 * into a QuestionBlock accumulator.
 */
function parseQuestionHeader(headerContent: string): QuestionBlock | null {
  const parts = headerContent.split('|').map((p) => p.trim());
  if (!parts.length) return null;

  const id = parts[0];
  const typeStr = (parts[1] ?? 'text').toLowerCase();
  const attrs: Record<string, string> = {};

  for (const part of parts.slice(2)) {
    if (part.includes(':')) {
      const colonIdx = part.indexOf(':');
      const key = part.slice(0, colonIdx).trim().toLowerCase();
      const value = part.slice(colonIdx + 1).trim();
      attrs[key] = value;
    } else {
      // Boolean flags: "required", "optional"
      attrs[part.toLowerCase()] = 'true';
    }
  }

  const meta: QuestionMeta = {
    id,
    isRequired: 'required' in attrs,
    dependsOn: attrs['dependson'],
    showIf: attrs['showif']?.split(',').map((s) => s.trim()),
  };

  return { id, type: typeStr, meta, attrs, prompt: '', options: [] };
}

/** Convert a collected QuestionBlock into a typed QuestionModel and push to items. */
function flushBlock(block: QuestionBlock, items: QuestionnaireItem[]): void {
  if (!block.prompt) return; // Skip malformed blocks

  const question = buildQuestion(block);
  if (question) items.push(question);
}

function buildQuestion(block: QuestionBlock): QuestionModel | null {
  switch (block.type) {
    case 'radio':
      if (!block.options.length) return null;
      return {
        type: 'radio',
        meta: block.meta,
        prompt: block.prompt,
        options: [...block.options],
      };

    case 'multiselect':
      if (!block.options.length) return null;
      return {
        type: 'multiselect',
        meta: block.meta,
        prompt: block.prompt,
        options: [...block.options],
      };

    case 'scale':
      return {
        type: 'scale',
        meta: block.meta,
        prompt: block.prompt,
        min: parseInt(block.attrs['min'] ?? '0', 10),
        max: parseInt(block.attrs['max'] ?? '10', 10),
        minLabel: block.attrs['minlabel'],
        maxLabel: block.attrs['maxlabel'],
      };

    case 'text':
    default:
      return {
        type: 'text',
        meta: block.meta,
        prompt: block.prompt,
        maxLength: block.attrs['maxlength'] ? parseInt(block.attrs['maxlength'], 10) : undefined,
        maxLines: 4,
      };
  }
}

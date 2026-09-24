// src/components/QuestionnaireRenderer.tsx
// Dynamically renders a parsed questionnaire.
// Each question type maps to a focused, accessible widget.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, Fonts, Spacing, Radius, GlobalStyles, MIN_TOUCH_TARGET } from '../theme';
import {
  QuestionnaireItem,
  QuestionModel,
  RadioQuestion,
  MultiSelectQuestion,
  TextQuestion,
  ScaleQuestion,
  SectionHeader,
} from '../core/questionnaireParser';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Answers = Record<string, unknown>;

interface QuestionnaireRendererProps {
  items: QuestionnaireItem[];
  answers: Answers;
  onAnswerChange: (questionId: string, value: unknown) => void;
}

// ── Main Renderer ─────────────────────────────────────────────────────────────

export function QuestionnaireRenderer({
  items,
  answers,
  onAnswerChange,
}: QuestionnaireRendererProps) {
  return (
    <ScrollView
      style={GlobalStyles.flex1}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {items.map((item, index) => {
        if (item.type === 'section') {
          return <SectionHeaderWidget key={`section-${index}`} item={item} />;
        }

        const question = item as QuestionModel;

        // Conditional visibility: check dependsOn / showIf
        if (question.meta.dependsOn && question.meta.showIf) {
          const parentAnswer = answers[question.meta.dependsOn] as string | undefined;
          if (!parentAnswer || !question.meta.showIf.includes(parentAnswer)) {
            return null; // Hidden
          }
        }

        return (
          <QuestionCard key={question.meta.id} question={question}>
            {renderQuestion(question, answers, onAnswerChange)}
          </QuestionCard>
        );
      })}
    </ScrollView>
  );
}

function renderQuestion(
  question: QuestionModel,
  answers: Answers,
  onAnswerChange: (id: string, value: unknown) => void
): React.ReactNode {
  switch (question.type) {
    case 'radio':
      return (
        <RadioWidget
          question={question}
          selected={answers[question.meta.id] as string | undefined}
          onSelect={(val) => onAnswerChange(question.meta.id, val)}
        />
      );
    case 'multiselect':
      return (
        <MultiSelectWidget
          question={question}
          selected={(answers[question.meta.id] as string[]) ?? []}
          onSelect={(val) => onAnswerChange(question.meta.id, val)}
        />
      );
    case 'scale':
      return (
        <ScaleWidget
          question={question}
          value={(answers[question.meta.id] as number) ?? question.min}
          onChange={(val) => onAnswerChange(question.meta.id, val)}
        />
      );
    case 'text':
    default:
      return (
        <TextWidget
          question={question}
          value={(answers[question.meta.id] as string) ?? ''}
          onChange={(val) => onAnswerChange(question.meta.id, val)}
        />
      );
  }
}

// ── Question Card Wrapper ─────────────────────────────────────────────────────

function QuestionCard({
  question,
  children,
}: {
  question: QuestionModel;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.questionCard}>
      <View style={styles.questionIdRow}>
        <Text style={GlobalStyles.questionId}>{question.meta.id}</Text>
        {question.meta.isRequired && (
          <Text style={styles.requiredAsterisk}> *</Text>
        )}
      </View>
      <Text style={styles.promptText}>{question.prompt}</Text>
      <View style={styles.inputArea}>{children}</View>
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeaderWidget({ item }: { item: SectionHeader }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{item.title}</Text>
    </View>
  );
}

// ── Radio Widget ──────────────────────────────────────────────────────────────

function RadioWidget({
  question,
  selected,
  onSelect,
}: {
  question: RadioQuestion;
  selected?: string;
  onSelect: (val: string) => void;
}) {
  return (
    <View>
      {question.options.map((option) => {
        const isSelected = selected === option;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.optionRow, isSelected && styles.optionRowSelected]}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option}
          >
            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── MultiSelect Widget ────────────────────────────────────────────────────────

function MultiSelectWidget({
  question,
  selected,
  onSelect,
}: {
  question: MultiSelectQuestion;
  selected: string[];
  onSelect: (val: string[]) => void;
}) {
  const toggle = (option: string) => {
    const updated = selected.includes(option)
      ? selected.filter((o) => o !== option)
      : [...selected, option];
    onSelect(updated);
  };

  return (
    <View>
      {question.options.map((option) => {
        const isChecked = selected.includes(option);
        return (
          <TouchableOpacity
            key={option}
            style={[styles.optionRow, isChecked && styles.optionRowSelected]}
            onPress={() => toggle(option)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isChecked }}
            accessibilityLabel={option}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.optionText, isChecked && styles.optionTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Scale Widget ──────────────────────────────────────────────────────────────

function ScaleWidget({
  question,
  value,
  onChange,
}: {
  question: ScaleQuestion;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <View>
      <View style={styles.scaleValueRow}>
        <Text style={styles.scaleCurrentValue}>{value}</Text>
        <Text style={styles.scaleUnit}>/ {question.max}</Text>
      </View>
      <Slider
        minimumValue={question.min}
        maximumValue={question.max}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={Colors.primaryBlue}
        maximumTrackTintColor={Colors.border}
        thumbTintColor={Colors.primaryBlue}
        accessibilityLabel={question.prompt}
        accessibilityValue={{ min: question.min, max: question.max, now: value }}
      />
      <View style={GlobalStyles.spaceBetween}>
        <Text style={styles.scaleLabel}>{question.minLabel ?? question.min}</Text>
        <Text style={styles.scaleLabel}>{question.maxLabel ?? question.max}</Text>
      </View>
    </View>
  );
}

// ── Text Widget ───────────────────────────────────────────────────────────────

function TextWidget({
  question,
  value,
  onChange,
}: {
  question: TextQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <View>
      <TextInput
        style={[GlobalStyles.inputField, styles.textArea]}
        value={value}
        onChangeText={onChange}
        multiline
        numberOfLines={question.maxLines ?? 4}
        maxLength={question.maxLength}
        placeholder="Enter your response..."
        placeholderTextColor={Colors.textDisabled}
        textAlignVertical="top"
        accessibilityLabel={question.prompt}
      />
      {question.maxLength && (
        <Text style={styles.charCount}>
          {value.length} / {question.maxLength}
        </Text>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    backgroundColor: Colors.primaryBlue,
    borderRadius: Radius.sm,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    color: Colors.primaryDark,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },

  // Question card
  questionCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  questionIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requiredAsterisk: {
    color: Colors.requiredRed,
    fontSize: Fonts.sizes.base,
    fontWeight: '700',
  },
  promptText: {
    fontSize: Fonts.sizes.base,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  inputArea: {
    marginTop: Spacing.sm,
  },

  // Options (shared)
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    minHeight: MIN_TOUCH_TARGET,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: Spacing.xs,
  },
  optionRowSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryBlue,
  },
  optionText: {
    fontSize: Fonts.sizes.base,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  optionTextSelected: {
    color: Colors.primaryBlue,
    fontWeight: '500',
  },

  // Radio
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primaryBlue,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: Colors.primaryBlue,
  },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primaryBlue,
    borderColor: Colors.primaryBlue,
  },
  checkmark: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },

  // Scale
  scaleValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 2,
    marginBottom: Spacing.xs,
  },
  scaleCurrentValue: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '700',
    color: Colors.primaryBlue,
  },
  scaleUnit: {
    fontSize: Fonts.sizes.base,
    color: Colors.textSecondary,
  },
  scaleLabel: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
  },

  // Text area
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  charCount: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textDisabled,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});

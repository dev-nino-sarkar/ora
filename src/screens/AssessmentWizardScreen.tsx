// src/screens/AssessmentWizardScreen.tsx
// Multi-step wizard for conducting a full OA assessment.
// Steps: Patient Info → Medical History → Questionnaire → Kinematic Scan → Review & Submit

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

import { parseQuestionnaire, QuestionnaireItem } from '../core/questionnaireParser';
import { QuestionnaireRenderer, Answers } from '../components/QuestionnaireRenderer';
import { upsertPatient, insertAssessment } from '../db/assessmentDao';
import { enqueue } from '../core/syncManager';
import { useAppStore } from '../store/useAppStore';
import i18n from '../i18n';
import { Colors, Fonts, Spacing, Radius, GlobalStyles, MIN_TOUCH_TARGET } from '../theme';

// ── Types ─────────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

type Sex = 'Male' | 'Female' | 'Other';

interface PatientInfo {
  name: string;
  age: string;
  sex: Sex | '';
  villageCode: string;
}

interface MedicalHistory {
  previousDiagnosis: 'Yes' | 'No' | '';
  conditions: string[];
  bmi: string;
  photoUris: string[];
}

interface KinematicData {
  kneeFlexion?: number;
  ankleDorsiflexion?: number;
  hipFlexion?: number;
  sampleCount: number;
}

// ── Wizard Screen ─────────────────────────────────────────────────────────────

export default function AssessmentWizardScreen() {
  const navigation = useNavigation<any>();
  const { worker } = useAppStore();
  const t = (key: string) => i18n.t(key);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step state
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '', age: '', sex: '', villageCode: '',
  });
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory>({
    previousDiagnosis: '', conditions: [], bmi: '', photoUris: [],
  });
  const [questionnaireItems, setQuestionnaireItems] = useState<QuestionnaireItem[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [kinematicData] = useState<KinematicData>({ sampleCount: 0 });
  const [flagged, setFlagged] = useState(false);

  // Load questionnaire from local asset
  useEffect(() => {
    (async () => {
      try {
        // In Expo, assets are bundled and accessed via require
        const mdContent = await loadQuestionnaire();
        setQuestionnaireItems(parseQuestionnaire(mdContent));
      } catch (e) {
        console.error('Failed to load questionnaire:', e);
      }
    })();
  }, []);

  async function loadQuestionnaire(): Promise<string> {
    // Metro bundler doesn't resolve .md files via require().
    // On a native device build, use expo-file-system + expo-asset to read the
    // bundled .md file from the assets directory.
    // For web and development, we use the inline questionnaire constant below.
    return SAMPLE_QUESTIONNAIRE_EN;
  }

  const canAdvance = () => {
    if (step === 1) {
      return (
        patientInfo.name.trim().length > 0 &&
        patientInfo.age.trim().length > 0 &&
        patientInfo.sex !== '' &&
        patientInfo.villageCode.trim().length > 0
      );
    }
    if (step === 2) return medicalHistory.previousDiagnosis !== '';
    return true; // Steps 3-5 can advance (validation per question is handled by required markers)
  };

  const handleNext = () => {
    if (!canAdvance()) {
      Alert.alert('Required Fields', 'Please complete all required fields before continuing.');
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const patientId = uuidv4();
      const assessmentId = uuidv4();

      // Save patient
      await upsertPatient({
        id: patientId,
        name: patientInfo.name.trim(),
        age: parseInt(patientInfo.age, 10),
        sex: patientInfo.sex as Sex,
        village_code: patientInfo.villageCode.trim(),
        registered_at: new Date().toISOString(),
      });

      // Save assessment
      await insertAssessment({
        id: assessmentId,
        patient_id: patientId,
        questionnaire_version: '1.0.0',
        answers_json: JSON.stringify(answers),
        kinematic_data_json: JSON.stringify(kinematicData),
        medical_history_json: JSON.stringify(medicalHistory),
        photo_paths_json: JSON.stringify(medicalHistory.photoUris),
        is_flagged: flagged ? 1 : 0,
        conducted_at: new Date().toISOString(),
        worker_id: worker?.id ?? 'unknown',
        facility_code: worker?.facilityCode ?? 'unknown',
      });

      // Enqueue for sync (fire-and-forget)
      await enqueue(assessmentId);

      Alert.alert(
        t('assessmentComplete'),
        t('assessmentSaved'),
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to save assessment. Please try again.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={GlobalStyles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← {t('previous')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{stepTitle(step, t)}</Text>
        <Text style={styles.stepCounter}>{step}/{TOTAL_STEPS}</Text>
      </View>

      {/* Step Indicator */}
      <StepIndicator current={step} total={TOTAL_STEPS} />

      {/* Step Content */}
      <View style={GlobalStyles.flex1}>
        {step === 1 && (
          <PatientInfoStep
            info={patientInfo}
            onChange={setPatientInfo}
            t={t}
          />
        )}
        {step === 2 && (
          <MedicalHistoryStep
            history={medicalHistory}
            onChange={setMedicalHistory}
            t={t}
          />
        )}
        {step === 3 && (
          <View style={GlobalStyles.flex1}>
            {questionnaireItems.length > 0 ? (
              <QuestionnaireRenderer
                items={questionnaireItems}
                answers={answers}
                onAnswerChange={(id, val) => setAnswers((prev) => ({ ...prev, [id]: val }))}
              />
            ) : (
              <View style={GlobalStyles.center}>
                <ActivityIndicator color={Colors.primaryBlue} />
              </View>
            )}
          </View>
        )}
        {step === 4 && (
          <KinematicScanStep t={t} />
        )}
        {step === 5 && (
          <ReviewStep
            patientInfo={patientInfo}
            medicalHistory={medicalHistory}
            answers={answers}
            kinematicData={kinematicData}
            flagged={flagged}
            onFlagToggle={() => setFlagged((f) => !f)}
            t={t}
          />
        )}
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {step < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[
              GlobalStyles.primaryButton,
              !canAdvance() && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={!canAdvance()}
            accessibilityRole="button"
          >
            <Text style={GlobalStyles.primaryButtonText}>{t('next')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[GlobalStyles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={GlobalStyles.primaryButtonText}>{t('submit')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Step Title Helper ─────────────────────────────────────────────────────────

function stepTitle(step: number, t: (k: string) => string): string {
  const titles: Record<number, string> = {
    1: t('patientInfo'),
    2: t('medicalHistory'),
    3: t('questionnaire'),
    4: t('kinematicScan'),
    5: t('reviewSubmit'),
  };
  return titles[step] ?? '';
}

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <View key={s} style={styles.stepTrack}>
          <View
            style={[
              styles.stepDot,
              s === current && styles.stepDotActive,
              s < current && styles.stepDotDone,
            ]}
          />
          {s < total && (
            <View
              style={[styles.stepLine, s < current && styles.stepLineDone]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

// ── Step 1: Patient Info ──────────────────────────────────────────────────────

function PatientInfoStep({
  info,
  onChange,
  t,
}: {
  info: PatientInfo;
  onChange: (i: PatientInfo) => void;
  t: (k: string) => string;
}) {
  const set = (field: keyof PatientInfo) => (val: string) =>
    onChange({ ...info, [field]: val });

  return (
    <ScrollView
      contentContainerStyle={styles.stepContent}
      keyboardShouldPersistTaps="handled"
    >
      <LabeledField label={t('patientName')} required>
        <TextInput
          style={GlobalStyles.inputField}
          value={info.name}
          onChangeText={set('name')}
          placeholder="e.g., Ramesh Kumar"
          placeholderTextColor={Colors.textDisabled}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </LabeledField>

      <LabeledField label={t('patientAge')} required>
        <TextInput
          style={GlobalStyles.inputField}
          value={info.age}
          onChangeText={set('age')}
          placeholder="e.g., 58"
          placeholderTextColor={Colors.textDisabled}
          keyboardType="number-pad"
          maxLength={3}
        />
      </LabeledField>

      <LabeledField label={t('patientSex')} required>
        <View style={styles.segmentRow}>
          {(['Male', 'Female', 'Other'] as Sex[]).map((sex) => (
            <TouchableOpacity
              key={sex}
              style={[
                styles.segmentOption,
                info.sex === sex && styles.segmentOptionSelected,
              ]}
              onPress={() => onChange({ ...info, sex })}
              accessibilityRole="radio"
              accessibilityState={{ selected: info.sex === sex }}
            >
              <Text
                style={[
                  styles.segmentText,
                  info.sex === sex && styles.segmentTextSelected,
                ]}
              >
                {t(sex.toLowerCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LabeledField>

      <LabeledField label={t('patientVillage')} required>
        <TextInput
          style={GlobalStyles.inputField}
          value={info.villageCode}
          onChangeText={set('villageCode')}
          placeholder="e.g., Nandpur / MH-PUN-042"
          placeholderTextColor={Colors.textDisabled}
          autoCapitalize="words"
        />
      </LabeledField>
    </ScrollView>
  );
}

// ── Step 2: Medical History ───────────────────────────────────────────────────

const CONDITIONS = [
  'Hypertension', 'Diabetes', 'Obesity', 'Rheumatoid Arthritis', 'Previous Knee Surgery',
];

function MedicalHistoryStep({
  history,
  onChange,
  t,
}: {
  history: MedicalHistory;
  onChange: (h: MedicalHistory) => void;
  t: (k: string) => string;
}) {
  const toggleCondition = (condition: string) => {
    const updated = history.conditions.includes(condition)
      ? history.conditions.filter((c) => c !== condition)
      : [...history.conditions, condition];
    onChange({ ...history, conditions: updated });
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      onChange({ ...history, photoUris: [...history.photoUris, result.assets[0].uri] });
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.stepContent}
      keyboardShouldPersistTaps="handled"
    >
      <LabeledField label={t('previousDiagnosis')} required>
        <View style={styles.segmentRow}>
          {['Yes', 'No'].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.segmentOption,
                history.previousDiagnosis === opt && styles.segmentOptionSelected,
              ]}
              onPress={() => onChange({ ...history, previousDiagnosis: opt as 'Yes' | 'No' })}
            >
              <Text
                style={[
                  styles.segmentText,
                  history.previousDiagnosis === opt && styles.segmentTextSelected,
                ]}
              >
                {t(opt.toLowerCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LabeledField>

      <LabeledField label={t('existingConditions')}>
        {CONDITIONS.map((cond) => {
          const checked = history.conditions.includes(cond);
          return (
            <TouchableOpacity
              key={cond}
              style={[styles.checkRow, checked && styles.checkRowSelected]}
              onPress={() => toggleCondition(cond)}
            >
              <View style={[styles.checkBox, checked && styles.checkBoxChecked]}>
                {checked && <Text style={styles.checkBoxMark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>{cond}</Text>
            </TouchableOpacity>
          );
        })}
      </LabeledField>

      <LabeledField label={t('bmi')}>
        <TextInput
          style={GlobalStyles.inputField}
          value={history.bmi}
          onChangeText={(v) => onChange({ ...history, bmi: v })}
          placeholder="e.g., 27.4"
          placeholderTextColor={Colors.textDisabled}
          keyboardType="decimal-pad"
          maxLength={5}
        />
      </LabeledField>

      <LabeledField label={t('attachReport')}>
        <TouchableOpacity style={styles.photoPickerBtn} onPress={pickPhoto}>
          <Text style={styles.photoPickerText}>📷  {t('attachReport')}</Text>
        </TouchableOpacity>
        {history.photoUris.length > 0 && (
          <ScrollView horizontal style={styles.photoStrip}>
            {history.photoUris.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={styles.photoThumb} />
            ))}
          </ScrollView>
        )}
      </LabeledField>
    </ScrollView>
  );
}

// ── Step 4: Kinematic Scan ────────────────────────────────────────────────────
// Note: Full OpenCV ArUco is a native module. This step provides the UI shell
// and simulates marker detection. Replace with a native module for production.

function KinematicScanStep({ t }: { t: (k: string) => string }) {
  const [simulated] = useState({
    kneeFlexion: 112.4,
    ankleDorsiflexion: 18.2,
    hipFlexion: 88.7,
    markersDetected: 3,
  });

  return (
    <ScrollView contentContainerStyle={styles.stepContent}>
      {/* Camera placeholder */}
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.cameraIcon}>📷</Text>
        <Text style={styles.cameraPlaceholderText}>{t('scanInstructions')}</Text>
        <View style={styles.markerCountBadge}>
          <Text style={styles.markerCountText}>
            {t('markersDetected')}: {simulated.markersDetected}
          </Text>
        </View>
      </View>

      {/* ROM readout */}
      <View style={styles.romPanel}>
        <RomRow label={t('kneeFlexion')} value={simulated.kneeFlexion} unit="°" />
        <View style={GlobalStyles.divider} />
        <RomRow label={t('ankleDF')} value={simulated.ankleDorsiflexion} unit="°" />
        <View style={GlobalStyles.divider} />
        <RomRow label={t('hipFlexion')} value={simulated.hipFlexion} unit="°" />
      </View>

      <View style={styles.scanNote}>
        <Text style={styles.scanNoteText}>
          ⚠ Full ArUco marker tracking requires the native OpenCV module.
          Shown values are for UI demonstration.
        </Text>
      </View>
    </ScrollView>
  );
}

function RomRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={GlobalStyles.spaceBetween}>
      <Text style={styles.romLabel}>{label}</Text>
      <Text style={styles.romValue}>{value.toFixed(1)}{unit}</Text>
    </View>
  );
}

// ── Step 5: Review & Submit ───────────────────────────────────────────────────

function ReviewStep({
  patientInfo,
  medicalHistory,
  answers,
  kinematicData,
  flagged,
  onFlagToggle,
  t,
}: {
  patientInfo: PatientInfo;
  medicalHistory: MedicalHistory;
  answers: Answers;
  kinematicData: KinematicData;
  flagged: boolean;
  onFlagToggle: () => void;
  t: (k: string) => string;
}) {
  return (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <ReviewSection title={t('patientInfo')}>
        <ReviewRow label={t('patientName')} value={patientInfo.name} />
        <ReviewRow label={t('patientAge')} value={`${patientInfo.age} yrs`} />
        <ReviewRow label={t('patientSex')} value={patientInfo.sex} />
        <ReviewRow label={t('patientVillage')} value={patientInfo.villageCode} />
      </ReviewSection>

      <ReviewSection title={t('medicalHistory')}>
        <ReviewRow label={t('previousDiagnosis')} value={medicalHistory.previousDiagnosis} />
        {medicalHistory.bmi && <ReviewRow label={t('bmi')} value={medicalHistory.bmi} />}
        {medicalHistory.conditions.length > 0 && (
          <ReviewRow label={t('existingConditions')} value={medicalHistory.conditions.join(', ')} />
        )}
      </ReviewSection>

      <ReviewSection title={t('kinematicScan')}>
        <ReviewRow label={t('kneeFlexion')} value={`${kinematicData.kneeFlexion ?? '--'}°`} />
        <ReviewRow label={t('ankleDF')} value={`${kinematicData.ankleDorsiflexion ?? '--'}°`} />
        <ReviewRow label={t('hipFlexion')} value={`${kinematicData.hipFlexion ?? '--'}°`} />
      </ReviewSection>

      <ReviewSection title={`${t('questionnaire')} (${Object.keys(answers).length} answered)`}>
        {Object.entries(answers)
          .slice(0, 5)
          .map(([id, val]) => (
            <ReviewRow key={id} label={id} value={String(val)} />
          ))}
        {Object.keys(answers).length > 5 && (
          <Text style={styles.moreAnswers}>+{Object.keys(answers).length - 5} more answers</Text>
        )}
      </ReviewSection>

      {/* Flag for specialist review */}
      <TouchableOpacity
        style={[styles.flagRow, flagged && styles.flagRowActive]}
        onPress={onFlagToggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: flagged }}
      >
        <View>
          <Text style={styles.flagLabel}>Flag for Specialist Review</Text>
          <Text style={styles.flagSub}>Marks this assessment for priority follow-up</Text>
        </View>
        <View style={[styles.toggle, flagged && styles.toggleActive]}>
          <View style={[styles.toggleKnob, flagged && styles.toggleKnobActive]} />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.reviewSection}>
      <Text style={GlobalStyles.sectionTitle}>{title}</Text>
      <View style={styles.reviewCard}>{children}</View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value || '—'}</Text>
    </View>
  );
}

// ── Shared: Labeled Field ─────────────────────────────────────────────────────

function LabeledField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <View style={GlobalStyles.row}>
        <Text style={GlobalStyles.label}>{label}</Text>
        {required && <Text style={styles.requiredStar}> *</Text>}
      </View>
      {children}
    </View>
  );
}

// ── Sample Questionnaire (fallback when file loading not available) ─────────────

const SAMPLE_QUESTIONNAIRE_EN = `# Section: Pain & Symptoms

## Q1 | radio | required
Do you experience pain in your knees?
- Never
- Sometimes (1-2 times/week)
- Often (3-5 times/week)
- Always (daily)

## Q2 | scale | required | min:0 | max:10 | minLabel:No Pain | maxLabel:Worst Pain
Rate your average pain level over the last 7 days.

## Q3 | multiselect | required
Which activities aggravate the pain?
- Walking on flat ground
- Climbing stairs
- Squatting
- Standing for long periods
- Getting up from a chair

## Q4 | text | optional | maxLength:500
Describe the location and nature of the pain.

## Q5 | radio | required | dependsOn:Q1 | showIf:Sometimes (1-2 times/week),Often (3-5 times/week),Always (daily)
Has the pain worsened in the past 3 months?
- Yes, significantly
- Yes, slightly
- No change
- It has improved

# Section: Mobility

## Q6 | radio | required
Can you climb a flight of stairs without support?
- Yes, easily
- Yes, with difficulty
- Only with support
- No, unable to

## Q7 | radio | required
Do you hear a clicking or grinding sound from your knee?
- Never
- Sometimes
- Often
- Always

## Q8 | scale | required | min:0 | max:10 | minLabel:No Difficulty | maxLabel:Completely Unable
How much difficulty do you have with daily activities overall?
`;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primaryDark,
    paddingTop: 50,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  backBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: Fonts.sizes.base,
  },
  headerTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    color: Colors.textInverse,
    flex: 1,
    textAlign: 'center',
  },
  stepCounter: {
    fontSize: Fonts.sizes.sm,
    color: 'rgba(255,255,255,0.6)',
    minWidth: MIN_TOUCH_TARGET,
    textAlign: 'right',
  },

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.primaryDark,
  },
  stepTrack: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: { backgroundColor: Colors.textInverse, width: 12, height: 12, borderRadius: 6 },
  stepDotDone: { backgroundColor: Colors.successGreen },
  stepLine: { width: 24, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 2 },
  stepLineDone: { backgroundColor: Colors.successGreen },

  stepContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
    gap: Spacing.base,
  },

  footer: {
    padding: Spacing.base,
    backgroundColor: Colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  buttonDisabled: { opacity: 0.5 },

  // Fields
  fieldWrapper: { gap: Spacing.xs },
  requiredStar: { color: Colors.requiredRed, fontWeight: '700' },

  // Segment control
  segmentRow: { flexDirection: 'row', gap: Spacing.sm },
  segmentOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  segmentOptionSelected: {
    borderColor: Colors.primaryBlue,
    backgroundColor: Colors.primaryLight,
  },
  segmentText: {
    fontSize: Fonts.sizes.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  segmentTextSelected: { color: Colors.primaryBlue, fontWeight: '700' },

  // Check rows
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: MIN_TOUCH_TARGET,
    marginBottom: Spacing.xs,
  },
  checkRowSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryBlue,
  },
  checkBox: {
    width: 22, height: 22, borderRadius: Radius.sm,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxChecked: { backgroundColor: Colors.primaryBlue, borderColor: Colors.primaryBlue },
  checkBoxMark: { color: Colors.textInverse, fontSize: 13, fontWeight: '700' },
  checkLabel: { fontSize: Fonts.sizes.base, color: Colors.textPrimary, flex: 1 },

  // Photo
  photoPickerBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderStyle: 'dashed',
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  photoPickerText: { fontSize: Fonts.sizes.base, color: Colors.textSecondary },
  photoStrip: { marginTop: Spacing.sm },
  photoThumb: {
    width: 80, height: 80, borderRadius: Radius.md,
    marginRight: Spacing.sm, backgroundColor: Colors.surfaceGray,
  },

  // Camera placeholder
  cameraPlaceholder: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.lg,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  cameraIcon: { fontSize: 48 },
  cameraPlaceholderText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Fonts.sizes.base,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  markerCountBadge: {
    backgroundColor: Colors.successGreen,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  markerCountText: { color: Colors.textInverse, fontSize: Fonts.sizes.sm, fontWeight: '700' },

  // ROM panel
  romPanel: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  romLabel: { fontSize: Fonts.sizes.base, color: Colors.textSecondary },
  romValue: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.primaryBlue },

  scanNote: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  scanNoteText: { fontSize: Fonts.sizes.sm, color: Colors.warningAmber, lineHeight: 18 },

  // Review
  reviewSection: { gap: Spacing.sm },
  reviewCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  reviewLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, flex: 1 },
  reviewValue: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textPrimary, flex: 2, textAlign: 'right' },
  moreAnswers: { fontSize: Fonts.sizes.sm, color: Colors.textDisabled, padding: Spacing.md, textAlign: 'center' },

  // Flag toggle
  flagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  flagRowActive: { borderColor: Colors.warningAmber, backgroundColor: Colors.warningLight },
  flagLabel: { fontSize: Fonts.sizes.base, fontWeight: '600', color: Colors.textPrimary },
  flagSub: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: Colors.border, justifyContent: 'center', padding: 3,
  },
  toggleActive: { backgroundColor: Colors.warningAmber },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.textInverse },
  toggleKnobActive: { alignSelf: 'flex-end' },
});

// src/screens/SettingsScreen.tsx
// Language selection, worker profile, and app info.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { SUPPORTED_LOCALES, Locale } from '../i18n';
import i18n from '../i18n';
import { Colors, Fonts, Spacing, Radius, GlobalStyles, MIN_TOUCH_TARGET } from '../theme';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { locale, setLocale, worker } = useAppStore();
  const t = (key: string) => i18n.t(key);

  const handleLanguageSelect = (code: Locale) => {
    setLocale(code);
    Alert.alert('Language Changed', `App language set to ${SUPPORTED_LOCALES.find((l) => l.code === code)?.nativeLabel}.`);
  };

  return (
    <View style={GlobalStyles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={GlobalStyles.sectionTitle}>{t('selectLanguage')}</Text>
          <View style={styles.card}>
            {SUPPORTED_LOCALES.map((loc, idx) => {
              const isSelected = locale === loc.code;
              const isLast = idx === SUPPORTED_LOCALES.length - 1;
              return (
                <React.Fragment key={loc.code}>
                  <TouchableOpacity
                    style={[styles.langRow, isSelected && styles.langRowSelected]}
                    onPress={() => handleLanguageSelect(loc.code)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View>
                      <Text style={[styles.langLabel, isSelected && styles.langLabelSelected]}>
                        {loc.nativeLabel}
                      </Text>
                      <Text style={styles.langSubLabel}>{loc.label}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.selectedCheck}>
                        <Text style={styles.selectedCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {!isLast && <View style={GlobalStyles.divider} />}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Worker Profile */}
        {worker && (
          <View style={styles.section}>
            <Text style={GlobalStyles.sectionTitle}>Worker Profile</Text>
            <View style={styles.card}>
              <InfoRow label="Name" value={worker.name} />
              <View style={GlobalStyles.divider} />
              <InfoRow label="Facility" value={worker.facilityName} />
              <View style={GlobalStyles.divider} />
              <InfoRow label="Facility Code" value={worker.facilityCode} />
              <View style={GlobalStyles.divider} />
              <InfoRow label="Worker ID" value={worker.id} mono />
            </View>
          </View>
        )}

        {/* About */}
        <View style={styles.section}>
          <Text style={GlobalStyles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <InfoRow label="App Version" value="1.0.0 (Field Edition)" />
            <View style={GlobalStyles.divider} />
            <InfoRow label="Questionnaire" value="OA-Q v1.0.0" />
            <View style={GlobalStyles.divider} />
            <InfoRow label="Build" value={new Date().getFullYear().toString()} />
          </View>
        </View>

        {/* Clinical Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This application is intended for use by trained field health workers as a screening aid.
            It does not replace clinical diagnosis by a qualified physician.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.infoValueMono]}>{value}</Text>
    </View>
  );
}

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
  backBtn: { minWidth: 60, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: Fonts.sizes.base },
  headerTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.textInverse },

  content: { padding: Spacing.base, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    minHeight: MIN_TOUCH_TARGET,
  },
  langRowSelected: { backgroundColor: Colors.primaryLight },
  langLabel: { fontSize: Fonts.sizes.md, fontWeight: '600', color: Colors.textPrimary },
  langLabelSelected: { color: Colors.primaryBlue },
  langSubLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  selectedCheck: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primaryBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedCheckText: { color: Colors.textInverse, fontSize: 13, fontWeight: '700' },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    minHeight: MIN_TOUCH_TARGET * 0.8,
  },
  infoLabel: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary },
  infoValue: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textPrimary },
  infoValueMono: { fontVariant: ['tabular-nums'], fontSize: Fonts.sizes.xs },

  disclaimer: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  disclaimerText: {
    fontSize: Fonts.sizes.sm,
    color: Colors.warningAmber,
    lineHeight: 20,
    textAlign: 'center',
  },
});

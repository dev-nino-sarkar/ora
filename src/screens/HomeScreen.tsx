// src/screens/HomeScreen.tsx
// Minimalist clinical home screen.
// Three primary actions: New Assessment, Sync Queue, Settings.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getSyncStatusCounts } from '../db/syncQueueDao';
import { useAppStore } from '../store/useAppStore';
import i18n from '../i18n';
import { Colors, Fonts, Spacing, Radius, GlobalStyles, MIN_TOUCH_TARGET } from '../theme';

// ── Home Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { worker, locale } = useAppStore();
  const [syncCounts, setSyncCounts] = useState({ pending: 0, synced: 0, failed: 0 });
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Refresh sync counts every time the screen comes into focus
  useEffect(() => {
    loadCounts();
    const unsubscribe = navigation.addListener('focus', loadCounts);
    return unsubscribe;
  }, [navigation]);

  async function loadCounts() {
    setLoadingCounts(true);
    try {
      const counts = await getSyncStatusCounts();
      setSyncCounts(counts);
    } finally {
      setLoadingCounts(false);
    }
  }

  const t = (key: string) => i18n.t(key);

  return (
    <View style={GlobalStyles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* ── App Bar ── */}
      <View style={styles.appBar}>
        <View>
          <Text style={styles.appBarTitle}>{t('appTitle')}</Text>
          <Text style={styles.appBarSubtitle}>{t('appSubtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.appBarAction}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel={t('settings')}
        >
          <Text style={styles.appBarActionIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={GlobalStyles.flex1}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Worker Info Banner ── */}
        {worker && (
          <View style={styles.workerBanner}>
            <View style={styles.workerAvatar}>
              <Text style={styles.workerAvatarText}>
                {worker.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{worker.name}</Text>
              <Text style={styles.workerFacility}>{worker.facilityName}</Text>
            </View>
            <View style={styles.workerCode}>
              <Text style={styles.workerCodeText}>{worker.facilityCode}</Text>
            </View>
          </View>
        )}

        {/* ── Sync Status Strip ── */}
        <View style={styles.syncStrip}>
          <SyncCounter
            count={syncCounts.pending}
            label={t('pending')}
            color={Colors.syncPending}
            loading={loadingCounts}
          />
          <View style={styles.syncDivider} />
          <SyncCounter
            count={syncCounts.synced}
            label={t('synced')}
            color={Colors.syncSynced}
            loading={loadingCounts}
          />
          <View style={styles.syncDivider} />
          <SyncCounter
            count={syncCounts.failed}
            label={t('failed')}
            color={Colors.syncFailed}
            loading={loadingCounts}
          />
        </View>

        {/* ── Primary Actions ── */}
        <View style={styles.actionsSection}>

          {/* Start New Assessment — Primary CTA */}
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => navigation.navigate('AssessmentWizard')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('startNewAssessment')}
          >
            <View style={styles.primaryActionIcon}>
              <Text style={styles.iconText}>＋</Text>
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={styles.primaryActionTitle}>{t('startNewAssessment')}</Text>
              <Text style={styles.primaryActionSub}>Assess a new patient</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Sync Queue */}
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('SyncQueue')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('viewSyncQueue')}
          >
            <View style={[styles.secondaryActionIcon, { backgroundColor: Colors.warningLight }]}>
              <Text style={styles.iconText}>↑</Text>
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={styles.secondaryActionTitle}>{t('viewSyncQueue')}</Text>
              <Text style={styles.secondaryActionSub}>
                {syncCounts.pending} {t('pending')}
                {syncCounts.failed > 0 ? ` · ${syncCounts.failed} ${t('failed')}` : ''}
              </Text>
            </View>
            {syncCounts.pending > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{syncCounts.pending}</Text>
              </View>
            )}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Settings / Language */}
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('settings')}
          >
            <View style={[styles.secondaryActionIcon, { backgroundColor: Colors.primaryLight }]}>
              <Text style={styles.iconText}>⚙</Text>
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={styles.secondaryActionTitle}>{t('settings')}</Text>
              <Text style={styles.secondaryActionSub}>Language · Profile · About</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

        </View>

        {/* ── Footer ── */}
        <Text style={styles.version}>OA Scout v1.0.0 · Field Edition</Text>

      </ScrollView>
    </View>
  );
}

// ── Sync Counter Widget ───────────────────────────────────────────────────────

function SyncCounter({
  count,
  label,
  color,
  loading,
}: {
  count: number;
  label: string;
  color: string;
  loading: boolean;
}) {
  return (
    <View style={styles.syncCounter}>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text style={[styles.syncCountValue, { color }]}>{count}</Text>
      )}
      <Text style={styles.syncCountLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  appBar: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.base,
    paddingTop: 50,
    paddingBottom: Spacing.base,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  appBarTitle: {
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    color: Colors.textInverse,
    letterSpacing: -0.3,
  },
  appBarSubtitle: {
    fontSize: Fonts.sizes.sm,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  appBarAction: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarActionIcon: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.8)',
  },

  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
    gap: Spacing.base,
  },

  // Worker banner
  workerBanner: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerAvatarText: {
    color: Colors.textInverse,
    fontSize: Fonts.sizes.lg,
    fontWeight: '700',
  },
  workerInfo: { flex: 1 },
  workerName: {
    fontSize: Fonts.sizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  workerFacility: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  workerCode: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  workerCodeText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.primaryBlue,
    letterSpacing: 0.5,
  },

  // Sync strip
  syncStrip: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
  },
  syncCounter: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  syncCountValue: {
    fontSize: Fonts.sizes.xxl,
    fontWeight: '700',
  },
  syncCountLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  syncDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },

  // Actions
  actionsSection: {
    gap: Spacing.sm,
  },
  primaryAction: {
    backgroundColor: Colors.primaryBlue,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: MIN_TOUCH_TARGET + 12,
  },
  primaryActionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
    color: Colors.textInverse,
    fontWeight: '300',
  },
  primaryActionTitle: {
    fontSize: Fonts.sizes.md,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  primaryActionSub: {
    fontSize: Fonts.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  secondaryAction: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: MIN_TOUCH_TARGET + 12,
  },
  secondaryActionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionTitle: {
    fontSize: Fonts.sizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  secondaryActionSub: {
    fontSize: Fonts.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  actionTextBlock: { flex: 1 },
  chevron: {
    fontSize: 22,
    color: Colors.textDisabled,
    fontWeight: '300',
  },
  badge: {
    backgroundColor: Colors.syncPending,
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    fontSize: Fonts.sizes.xs,
    color: Colors.textDisabled,
    marginTop: Spacing.sm,
  },
});

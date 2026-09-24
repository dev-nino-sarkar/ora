// src/screens/SyncQueueScreen.tsx
// Displays all queued assessments and their sync status.
// Allows manual sync trigger and viewing error details.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAllSyncRecords, SyncQueueEntry, deleteSyncRecord } from '../db/syncQueueDao';
import { syncNow } from '../core/syncManager';
import i18n from '../i18n';
import { Colors, Fonts, Spacing, Radius, GlobalStyles, MIN_TOUCH_TARGET } from '../theme';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:     { label: 'Pending',     color: Colors.syncPending, bg: Colors.warningLight, icon: '⏳' },
  in_progress: { label: 'Uploading',   color: Colors.syncInProgress, bg: Colors.primaryLight, icon: '↑' },
  synced:      { label: 'Synced',      color: Colors.syncSynced, bg: Colors.successLight, icon: '✓' },
  failed:      { label: 'Failed',      color: Colors.syncFailed, bg: Colors.errorLight, icon: '✕' },
  conflict:    { label: 'Conflict',    color: Colors.syncFailed, bg: Colors.errorLight, icon: '!' },
};

export default function SyncQueueScreen() {
  const navigation = useNavigation<any>();
  const t = (key: string) => i18n.t(key);

  const [records, setRecords] = useState<SyncQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      const data = await getAllSyncRecords();
      setRecords(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    const unsub = navigation.addListener('focus', loadRecords);
    return unsub;
  }, [navigation, loadRecords]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await syncNow();
      if (result.offline) {
        Alert.alert('Offline', 'No internet connection. Records will sync automatically when online.');
      } else if (result.succeeded > 0) {
        Alert.alert('Sync Complete', `${result.succeeded} record(s) uploaded successfully.`);
      } else if (result.failed > 0) {
        Alert.alert('Sync Issues', `${result.failed} record(s) failed to upload. They will retry automatically.`);
      } else {
        Alert.alert('Up to Date', 'No records needed syncing.');
      }
      await loadRecords();
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (record: SyncQueueEntry) => {
    Alert.alert(
      t('confirmDelete'),
      t('confirmDeleteMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteSyncRecord(record.id);
            await loadRecords();
          },
        },
      ]
    );
  };

  const pendingCount = records.filter((r) => r.status === 'pending' || r.status === 'in_progress').length;
  const failedCount = records.filter((r) => r.status === 'failed' || r.status === 'conflict').length;

  return (
    <View style={GlobalStyles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('viewSyncQueue')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Summary Strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: Colors.syncPending }]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>{t('pending')}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: Colors.syncSynced }]}>
            {records.filter((r) => r.status === 'synced').length}
          </Text>
          <Text style={styles.summaryLabel}>{t('synced')}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: Colors.syncFailed }]}>{failedCount}</Text>
          <Text style={styles.summaryLabel}>{t('failed')}</Text>
        </View>
      </View>

      {/* Sync Now Button */}
      <View style={styles.syncButtonArea}>
        <TouchableOpacity
          style={[GlobalStyles.primaryButton, syncing && { opacity: 0.6 }]}
          onPress={handleSyncNow}
          disabled={syncing}
          accessibilityRole="button"
        >
          {syncing ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={GlobalStyles.primaryButtonText}>
              ↑  {t('syncNow')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Records List */}
      {loading ? (
        <View style={GlobalStyles.center}>
          <ActivityIndicator color={Colors.primaryBlue} />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRecords(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>No Records</Text>
              <Text style={styles.emptyBody}>Completed assessments will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <SyncRecordCard
              record={item}
              onDelete={() => handleDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}
    </View>
  );
}

// ── Sync Record Card ──────────────────────────────────────────────────────────

function SyncRecordCard({
  record,
  onDelete,
}: {
  record: SyncQueueEntry;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[record.status] ?? STATUS_CONFIG.pending;
  const date = new Date(record.created_at).toLocaleDateString();
  const time = new Date(record.created_at).toLocaleTimeString();

  return (
    <View style={styles.recordCard}>
      <TouchableOpacity
        style={styles.recordHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusIcon, { color: statusConfig.color }]}>
            {statusConfig.icon}
          </Text>
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        <View style={styles.recordMeta}>
          <Text style={styles.recordId} numberOfLines={1}>
            {record.assessment_id.slice(0, 8)}...
          </Text>
          <Text style={styles.recordDate}>{date} · {time}</Text>
        </View>

        <Text style={styles.expandChevron}>{expanded ? '∧' : '∨'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.recordDetail}>
          <DetailRow label="Queue ID" value={record.id.slice(0, 8) + '...'} />
          <DetailRow label="Assessment ID" value={record.assessment_id.slice(0, 8) + '...'} />
          <DetailRow label="Retry Count" value={String(record.retry_count)} />
          {record.last_attempt_at && (
            <DetailRow
              label="Last Attempt"
              value={new Date(record.last_attempt_at).toLocaleString()}
            />
          )}
          {record.last_error && (
            <DetailRow label="Error" value={record.last_error} error />
          )}

          {record.status !== 'synced' && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={onDelete}
              accessibilityRole="button"
            >
              <Text style={styles.deleteBtnText}>🗑 Remove from Queue</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function DetailRow({
  label,
  value,
  error,
}: {
  label: string;
  value: string;
  error?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, error && styles.detailValueError]}>{value}</Text>
    </View>
  );
}

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
  backBtn: { minWidth: 60, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: Fonts.sizes.base },
  headerTitle: { fontSize: Fonts.sizes.md, fontWeight: '700', color: Colors.textInverse },

  summaryStrip: {
    backgroundColor: Colors.surfaceCard,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  summaryCount: { fontSize: Fonts.sizes.xxl, fontWeight: '700' },
  summaryLabel: {
    fontSize: Fonts.sizes.xs,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  summaryDivider: { width: 1, backgroundColor: Colors.borderLight },

  syncButtonArea: {
    padding: Spacing.base,
    backgroundColor: Colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
  },

  recordCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  statusIcon: { fontSize: Fonts.sizes.sm, fontWeight: '700' },
  statusLabel: { fontSize: Fonts.sizes.sm, fontWeight: '700' },
  recordMeta: { flex: 1 },
  recordId: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  recordDate: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  expandChevron: { fontSize: 16, color: Colors.textDisabled },

  recordDetail: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceGray,
    gap: Spacing.xs,
  },
  detailRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between' },
  detailLabel: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, fontWeight: '600', flex: 1 },
  detailValue: { fontSize: Fonts.sizes.xs, color: Colors.textPrimary, flex: 2, textAlign: 'right' },
  detailValueError: { color: Colors.errorRed },

  deleteBtn: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.errorRed,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  deleteBtnText: { color: Colors.errorRed, fontSize: Fonts.sizes.sm, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyIcon: { fontSize: 48, color: Colors.successGreen },
  emptyTitle: { fontSize: Fonts.sizes.lg, fontWeight: '700', color: Colors.textPrimary },
  emptyBody: { fontSize: Fonts.sizes.base, color: Colors.textSecondary, textAlign: 'center' },
});

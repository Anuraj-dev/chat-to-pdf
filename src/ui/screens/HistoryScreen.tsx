// [UI] History — design/DESIGN-SPEC.md §1f. List newest-first (title + date), tap
// reopens Preview (no detail screen), long-press reveals an inline action row,
// Delete confirms once. Empty state offers a single route back to Home.

import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { ScreenTopBar } from '../components/TopBar';
import { HistoryItem } from '../components/HistoryItem';
import { EmptyState } from '../components/EmptyState';
import { Toast } from '../components/Toast';
import { formatHistoryDate } from '../format';
import type { HistoryDoc } from '../../types';
import type { OutputAction } from './PreviewScreen';

export function HistoryScreen({
  docs,
  onBack,
  onOpen,
  onMakeFirst,
  onPrint,
  onShare,
  onDelete,
}: {
  docs: HistoryDoc[];
  onBack: () => void;
  onOpen: (id: string) => void;
  onMakeFirst: () => void;
  onPrint: (doc: HistoryDoc) => OutputAction;
  onShare: (doc: HistoryDoc) => OutputAction;
  onDelete: (doc: HistoryDoc) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function runAction(action: OutputAction) {
    return async () => {
      setExpandedId(null);
      const message = await action();
      if (message) setNote(message);
    };
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenTopBar title="History" onBack={onBack} titleSize={22} />

      {docs.length === 0 ? (
        <EmptyState
          title="No PDFs yet"
          body="Your PDFs will appear here, saved on your phone — no internet needed to open them."
          actionLabel="Make your first PDF"
          onAction={onMakeFirst}
        />
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.caption}>
              Saved on your phone. Open any of these without internet.
            </Text>
          }
          renderItem={({ item }) => (
            <HistoryItem
              doc={item}
              dateLabel={formatHistoryDate(item.createdAt)}
              expanded={expandedId === item.id}
              onPress={() => onOpen(item.id)}
              onLongPress={() =>
                setExpandedId((prev) => (prev === item.id ? null : item.id))
              }
              onPrint={runAction(onPrint(item))}
              onShare={runAction(onShare(item))}
              onDelete={() => {
                setExpandedId(null);
                onDelete(item);
              }}
            />
          )}
        />
      )}

      <Toast message={note ?? ''} visible={note !== null} onHide={() => setNote(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  caption: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.mutedIcon,
    marginBottom: 12,
  },
});

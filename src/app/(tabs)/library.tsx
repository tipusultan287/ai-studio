import { FolderOpen, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addToLibrary, pickMedia } from '@/lib/media';
import { AssetTile } from '@/features/shell/AssetTile';
import { openAsset } from '@/features/shell/navigate';
import { useLibrary } from '@/store/library';
import { Button, colors, EmptyState, IconButton, Segmented, Text } from '@/ui';

type Filter = 'all' | 'image' | 'video' | 'audio';
const COLS = 3;

export default function Library() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const assets = useLibrary((s) => s.assets);
  const [filter, setFilter] = useState<Filter>('all');
  const data = useMemo(() => (filter === 'all' ? assets : assets.filter((a) => a.kind === filter)), [assets, filter]);
  const size = (width - 32 - (COLS - 1) * 8) / COLS;

  const importMedia = async () => {
    const picked = await pickMedia('any', { multiple: true });
    for (const p of picked) await addToLibrary({ uri: p.uri, kind: p.kind, source: 'import', width: p.width, height: p.height, durationMs: p.durationMs });
  };
  const importAudio = async () => {
    const picked = await pickMedia('audio', { multiple: true });
    for (const p of picked) await addToLibrary({ uri: p.uri, kind: 'audio', source: 'import', title: p.name });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text variant="display">Library</Text>
          <Text dim>{assets.length} items</Text>
        </View>
        <IconButton icon={Plus} onPress={importMedia} size={44} active accessibilityLabel="Import media" />
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 12 }}>
        <Segmented
          options={[
            { value: 'all', label: 'All' },
            { value: 'image', label: 'Photos' },
            { value: 'video', label: 'Videos' },
            { value: 'audio', label: 'Audio' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(a) => a.id}
        numColumns={COLS}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item }) => <AssetTile asset={item} size={size} onPress={() => openAsset(item)} />}
        ListEmptyComponent={
          <EmptyState
            icon={FolderOpen}
            title="Nothing here yet"
            body="Everything you generate, edit or import shows up here."
            action={
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <Button title="Import media" size="sm" onPress={importMedia} />
                <Button title="Import audio" size="sm" variant="secondary" onPress={importAudio} />
              </View>
            }
          />
        }
      />
    </View>
  );
}

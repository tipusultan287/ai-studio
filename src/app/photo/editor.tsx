import { router, useLocalSearchParams } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { PickPhoto } from '@/features/photo/common/PickPhoto';
import { PhotoEditor } from '@/features/photo/editor/PhotoEditor';

export default function PhotoEditorScreen() {
  const { uri, assetId } = useLocalSearchParams<{ uri?: string; assetId?: string }>();
  if (!uri)
    return (
      <PickPhoto
        title="Edit photo"
        subtitle="Crop, adjust, filters, text, drawing and stickers — then hand off to AI tools in one tap."
        icon={SlidersHorizontal}
        onPicked={(u, id) => router.setParams({ uri: u, assetId: id })}
      />
    );
  return <PhotoEditor key={uri} uri={uri} assetId={assetId} onChangePhoto={() => router.setParams({ uri: '', assetId: '' })} />;
}

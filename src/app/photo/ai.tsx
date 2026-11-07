import { router, useLocalSearchParams } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { PhotoAI } from '@/features/photo/ai/PhotoAI';
import { PickPhoto } from '@/features/photo/common/PickPhoto';

export default function PhotoAIScreen() {
  const { uri, assetId, tool } = useLocalSearchParams<{ uri?: string; assetId?: string; tool?: string }>();
  if (!uri)
    return (
      <PickPhoto
        ai
        title="AI Photo"
        subtitle="Replace backgrounds, erase objects, change outfits, cut out, upscale or restyle — powered by AI."
        icon={Sparkles}
        onPicked={(u, id) => router.setParams({ uri: u, assetId: id })}
      />
    );
  return <PhotoAI key={uri} uri={uri} assetId={assetId} initialTool={tool} />;
}

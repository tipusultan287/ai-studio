import * as Linking from 'expo-linking';
import { Check, ChevronDown, ExternalLink, KeyRound, RotateCcw, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Switch, TextInput, View } from 'react-native';
import { ffmpegAvailable } from '@/lib/ffmpeg';
import { getApiKey, maskKey, PROXY_URL, setApiKey, ENV_API_KEY } from '@/lib/runware/config';
import { MODEL_CATALOG, ModelSlot } from '@/lib/runware/models';
import { useSettings } from '@/store/settings';
import { Button, Card, colors, radius, ScalePressable, Screen, SectionHeader, Segmented, Text } from '@/ui';

export default function Settings() {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState('');
  const [open, setOpen] = useState<ModelSlot | null>(null);
  const models = useSettings((s) => s.models);
  const setModel = useSettings((s) => s.setModel);
  const resetModels = useSettings((s) => s.resetModels);
  const quality = useSettings((s) => s.exportQuality);
  const autoSave = useSettings((s) => s.saveToPhotosAutomatically);
  const set = useSettings((s) => s.set);

  useEffect(() => {
    getApiKey().then(setSaved);
  }, []);

  const save = async () => {
    await setApiKey(key);
    setSaved(await getApiKey());
    setKey('');
    Alert.alert('Saved', key.trim() ? 'Your Runware API key is stored securely on this device.' : 'API key removed.');
  };

  return (
    <Screen>
      <Text variant="display" style={{ marginTop: 8 }}>
        Settings
      </Text>

      <SectionHeader title="Runware" />
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: saved || PROXY_URL ? 'rgba(61,220,151,0.15)' : colors.aiSoft, alignItems: 'center', justifyContent: 'center' }}>
            {saved || PROXY_URL ? <ShieldCheck size={18} color={colors.success} /> : <KeyRound size={18} color={colors.ai} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label">{PROXY_URL ? 'Using your proxy server' : saved ? 'API key connected' : 'No API key yet'}</Text>
            <Text variant="caption" dim>
              {PROXY_URL ? PROXY_URL : saved ? `${maskKey(saved)}${saved === ENV_API_KEY ? ' · from .env' : ''}` : 'All AI features run on Runware.'}
            </Text>
          </View>
        </View>
        <TextInput
          value={key}
          onChangeText={setKey}
          placeholder="Paste your Runware API key"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={{ height: 48, borderRadius: radius.md, backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, color: colors.text, fontSize: 15 }}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={key ? 'Save key' : saved ? 'Remove key' : 'Save key'} size="sm" onPress={save} disabled={!key && !saved} variant={!key && saved ? 'danger' : 'primary'} />
          <Button title="Get a key" size="sm" variant="secondary" icon={ExternalLink} onPress={() => Linking.openURL('https://my.runware.ai/signup')} />
        </View>
      </Card>

      <SectionHeader
        title="AI models"
        action={
          <ScalePressable onPress={resetModels} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <RotateCcw size={14} color={colors.textDim} />
            <Text variant="label" dim>
              Reset
            </Text>
          </ScalePressable>
        }
      />
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {(Object.keys(MODEL_CATALOG) as ModelSlot[]).map((slot, i) => {
          const cat = MODEL_CATALOG[slot];
          const cur = cat.options.find((o) => o.id === models[slot]);
          const isOpen = open === slot;
          return (
            <View key={slot} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
              <ScalePressable scaleTo={0.99} onPress={() => setOpen(isOpen ? null : slot)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="label">{cat.label}</Text>
                  <Text variant="caption" dim>
                    {cur?.name ?? models[slot]}
                  </Text>
                </View>
                <ChevronDown size={18} color={colors.textFaint} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
              </ScalePressable>
              {isOpen ? (
                <View style={{ paddingBottom: 8 }}>
                  {cat.options.map((o) => (
                    <ScalePressable key={o.id} scaleTo={0.99} onPress={() => setModel(slot, o.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="body">{o.name}</Text>
                        <Text variant="caption" faint>
                          {o.note ? `${o.note} · ` : ''}
                          {o.id}
                        </Text>
                      </View>
                      {models[slot] === o.id ? <Check size={18} color={colors.accent} /> : null}
                    </ScalePressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>

      <SectionHeader title="Export" />
      <Card style={{ gap: 14 }}>
        <Text variant="label" dim>
          Video & audio export quality
        </Text>
        <Segmented
          options={[
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Small file' },
          ]}
          value={quality}
          onChange={(v) => set({ exportQuality: v })}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="label">Also save exports to Photos</Text>
          <Switch value={autoSave} onValueChange={(v) => set({ saveToPhotosAutomatically: v })} trackColor={{ true: colors.accent, false: colors.surfacePressed }} thumbColor="#fff" />
        </View>
      </Card>

      <SectionHeader title="About" />
      <Card style={{ gap: 6 }}>
        <Text variant="label">AI Studio 1.0</Text>
        <Text variant="caption" dim>
          On-device video/audio engine: {ffmpegAvailable() ? 'ready' : 'not in this build (use a development build to export video & audio)'}
        </Text>
        <Text variant="caption" dim>
          AI by Runware. Generated media URLs expire after 7 days on Runware; everything you keep is saved in your Library on this device.
        </Text>
      </Card>
    </Screen>
  );
}

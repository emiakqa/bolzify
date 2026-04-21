// Bolzify — Avatar-Picker + Upload zu Supabase Storage.
//
// Flow:
// 1. Permission-Request für die Foto-Library
// 2. Bild-Picker mit 1:1-Crop, Quality 0.7 (Upload-Bytes sparen)
// 3. Upload als ArrayBuffer an Bucket `avatars`, Pfad `<userId>/<ts>.<ext>`
//    (ArrayBuffer ist stabiler als Blob auf Android mit fetch())
// 4. profiles.avatar_url auf die neue Public-URL patchen

import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Keine Foto-Berechtigung erteilt.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    exif: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const ext = (asset.fileName?.split('.').pop() ?? 'jpg').toLowerCase();
  const contentType = asset.mimeType ?? 'image/jpeg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const res = await fetch(asset.uri);
  const arrayBuffer = await res.arrayBuffer();

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType, upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-Buster, sonst lädt RN das alte Bild aus dem Cache
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (updErr) throw new Error(updErr.message);

  return url;
}

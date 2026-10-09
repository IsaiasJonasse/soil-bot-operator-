import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportRecordFile(content: string, name: string, mimeType: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: `Export ${name}` });
}

export async function pickRecordJson() {
  const selection = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/json'] });
  if (selection.canceled || !selection.result) return null;
  return selection.result.text();
}

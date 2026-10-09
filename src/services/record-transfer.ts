export async function exportRecordFile(content: string, name: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(href);
}

export async function pickRecordJson() {
  if (typeof document === 'undefined') return null;

  return new Promise<string | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/json';
    input.style.display = 'none';

    const onChange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        resolve(await file.text());
      } catch {
        resolve(null);
      } finally {
        input.remove();
      }
    };

    input.addEventListener('change', () => {
      void onChange();
    });

    document.body.appendChild(input);
    input.click();
  });
}

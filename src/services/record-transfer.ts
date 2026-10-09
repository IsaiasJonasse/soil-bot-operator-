export async function exportRecordFile(content: string, name: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = name;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(href);
    anchor.remove();
  }, 1000);
}

export async function pickRecordJson() {
  if (typeof document === 'undefined') return null;

  return new Promise<string | null>((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/json';
    input.style.display = 'none';
    const finish = (value: string | null) => {
      input.remove();
      resolve(value);
    };

    const onChange = async () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }

      try {
        finish(await file.text());
      } catch (error) {
        input.remove();
        reject(error);
      }
    };

    input.addEventListener('change', () => {
      void onChange();
    });
    input.addEventListener('cancel', () => finish(null), { once: true });

    document.body.appendChild(input);
    input.click();
  });
}

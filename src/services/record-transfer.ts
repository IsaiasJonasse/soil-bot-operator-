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
    let settled = false;
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    input.type = 'file';
    input.accept = '.json,application/json,text/json';
    input.style.display = 'none';
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      if (focusTimer) window.clearTimeout(focusTimer);
      window.removeEventListener('focus', onWindowFocus);
      input.remove();
      resolve(value);
    };
    const onWindowFocus = () => {
      focusTimer = window.setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 300);
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
        settled = true;
        window.removeEventListener('focus', onWindowFocus);
        input.remove();
        reject(error);
      }
    };

    input.addEventListener('change', () => {
      void onChange();
    });
    input.addEventListener('cancel', () => finish(null), { once: true });

    document.body.appendChild(input);
    window.addEventListener('focus', onWindowFocus);
    input.click();
  });
}

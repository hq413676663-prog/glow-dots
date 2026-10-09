export function createIntegerField(slider, output) {
  if (!slider || !output) return { input: slider, output };
  const min = Number(slider.dataset.min ?? slider.min ?? 0);
  const max = Number(slider.dataset.max ?? slider.max ?? 100);
  const step = Number(slider.dataset.step ?? slider.step ?? 1);
  const scale = max <= 10 && step < 1 ? 100 : 1;
  const field = document.createElement('input');
  field.type = 'number';
  field.step = '1';
  field.min = String(Math.ceil(min * scale));
  field.max = String(Math.floor(max * scale));
  field.inputMode = 'numeric';
  field.className = 'settings-integer-input';
  field.setAttribute('aria-label', (slider.getAttribute('aria-label') || 'Parameter') + (scale === 100 ? ' (%)' : ''));
  output.textContent = '';
  output.classList.add('settings-integer-field');
  output.append(field);
  if (scale === 100) {
    const unit = document.createElement('span');
    unit.className = 'settings-integer-unit';
    unit.textContent = '%';
    output.append(unit);
  }
  const sync = () => { field.value = String(Math.round(Number(slider.value) * scale)); };
  const commit = () => {
    if (!/^-?\d+$/.test(field.value)) { sync(); return; }
    const value = Math.max(Number(field.min), Math.min(Number(field.max), Number(field.value)));
    slider.value = String(value / scale);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
  };
  field.addEventListener('beforeinput', event => {
    if (event.data && !/^\d+$/.test(event.data)) event.preventDefault();
  });
  field.addEventListener('keydown', event => {
    if (['.', ',', 'e', 'E', '+'].includes(event.key)) event.preventDefault();
    if (event.key === 'Enter') { event.preventDefault(); commit(); field.blur(); }
    if (event.key === 'Escape') { sync(); field.blur(); }
  });
  field.addEventListener('input', () => {
    if (/^-?\d+$/.test(field.value) && Number(field.value) >= Number(field.min) && Number(field.value) <= Number(field.max)) commit();
  });
  field.addEventListener('change', commit);
  field.addEventListener('blur', commit);
  sync();
  return { input: slider, output: field, integerScale: scale };
}

export function syncIntegerField(record) {
  if (record.output && record.output.ownerDocument.activeElement !== record.output) {
    record.output.value = String(Math.round(Number(record.input.value) * record.integerScale));
  }
}

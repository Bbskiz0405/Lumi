export interface TaskTagOption {
  value: string;
  label: string;
  color: string;
}

export const DEFAULT_TASK_TAGS: TaskTagOption[] = [
  { value: 'work', label: '工作', color: '#88AAFF' },
  { value: 'school', label: '學校', color: '#A78BFA' },
  { value: 'research', label: '研究', color: '#7C9BFF' },
  { value: 'application', label: '申請', color: '#E69A62' },
  { value: 'life', label: '生活', color: '#55DDAA' },
  { value: 'health', label: '健康', color: '#64C7C1' },
  { value: 'family', label: '家庭', color: '#E48CA6' },
  { value: 'social', label: '社交', color: '#C49BE8' },
  { value: 'errand', label: '雜務', color: '#A7ADB4' },
  { value: 'important', label: '重要日', color: '#E2BD62' },
];

const CUSTOM_COLORS = [
  '#7FB7D8',
  '#8EC7A4',
  '#C6A6D9',
  '#D7A178',
  '#A6B5D9',
  '#C6C878',
];

export function getTaskTagMeta(tag: string): TaskTagOption {
  const preset = DEFAULT_TASK_TAGS.find(option => option.value === tag);
  if (preset) return preset;

  let hash = 0;
  for (let index = 0; index < tag.length; index += 1) {
    hash = ((hash << 5) - hash + tag.charCodeAt(index)) | 0;
  }
  return {
    value: tag,
    label: tag,
    color: CUSTOM_COLORS[Math.abs(hash) % CUSTOM_COLORS.length],
  };
}

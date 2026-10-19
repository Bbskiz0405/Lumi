import { TrackerModuleDefinition } from '../types/trackerModule';

// Ready-made modules that need no AI call. Each goes through the same validation as AI output.
export interface TrackerTemplate { id: string; title: string; hint: string; definition: TrackerModuleDefinition }

export const TRACKER_TEMPLATES: TrackerTemplate[] = [
  {
    id: 'period',
    title: '月經紀錄',
    hint: '推算下次、排卵日與易孕期',
    definition: {
      name: '月經紀錄',
      description: '記錄經期，推算下次日期與排卵期（僅供參考）',
      fields: [
        { key: 'start_date', label: '開始日', type: 'date', required: true },
        { key: 'end_date', label: '結束日', type: 'date', required: false },
        { key: 'flow', label: '經血量', type: 'select', required: false, options: ['少', '中', '多'] },
      ],
      insights: [
        {
          type: 'cycle', label: '下次月經', field: 'start_date',
          offsets: [{ label: '排卵日', from: -14, to: -14 }, { label: '易孕期', from: -19, to: -13 }],
        },
        { type: 'duration', label: '經期天數', start: 'start_date', end: 'end_date' },
      ],
    },
  },
  {
    id: 'weight',
    title: '體重紀錄',
    hint: '看每週變化趨勢',
    definition: {
      name: '體重紀錄',
      description: '記錄體重並看每週變化',
      fields: [
        { key: 'date', label: '日期', type: 'date', required: true },
        { key: 'weight', label: '體重', type: 'number', required: true, unit: '公斤' },
      ],
      insights: [{ type: 'trend', label: '體重趨勢', field: 'weight', window: 10 }],
    },
  },
  {
    id: 'routine',
    title: '定期事項',
    hint: '剪頭髮、換機油等，推算下次',
    definition: {
      name: '定期事項',
      description: '記錄每次日期，推算下次大概什麼時候',
      fields: [
        { key: 'date', label: '日期', type: 'date', required: true },
        { key: 'note', label: '備註', type: 'text', required: false },
      ],
      insights: [{ type: 'cycle', label: '下次預計', field: 'date', offsets: [] }],
    },
  },
];

/** A fresh copy so editing a preview never mutates the shared template. */
export function templateDefinition(id: string): TrackerModuleDefinition | null {
  const template = TRACKER_TEMPLATES.find(item => item.id === id);
  return template ? JSON.parse(JSON.stringify(template.definition)) : null;
}

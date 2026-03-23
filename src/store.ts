import { AppData } from './types';

const DATA_KEY = 'goc_game_data';

const defaultData: AppData = {
  subjects: [
    {
      id: 's1', name: 'Toán lớp 4-5', color: '#1565C0',
      topics: [{ id: 't1', name: 'Số học' }, { id: 't2', name: 'Hình học' }, { id: 't3', name: 'Đo lường' }]
    },
    {
      id: 's2', name: 'TNXH lớp 4-5', color: '#2E7D32',
      topics: [{ id: 't4', name: 'Con người' }, { id: 't5', name: 'Tự nhiên' }, { id: 't6', name: 'Xã hội' }]
    }
  ],
  questions: [],
  settings: { lastUpdated: Date.now(), version: '1.0' }
};

const diffs: any[] = ['easy', 'medium', 'hard', 'super_hard'];
for (let i = 0; i < 15; i++) {
  defaultData.questions.push({
    id: `q_toan_${i}`, subjectId: 's1', topicId: `t${(i % 3) + 1}`,
    text: `Câu hỏi Toán mẫu số ${i + 1}: 123 + ${i} = ?`,
    options: [`${123 + i}`, `${120 + i}`, `${125 + i}`, `${130 + i}`],
    answer: 0, difficulty: diffs[i % 4], image: null, createdAt: Date.now()
  });
  defaultData.questions.push({
    id: `q_tnxh_${i}`, subjectId: 's2', topicId: `t${(i % 3) + 4}`,
    text: `Câu hỏi TNXH mẫu số ${i + 1}: Hiện tượng nào sau đây là tự nhiên?`,
    options: ['Mưa', 'Nhà cháy', 'Xe chạy', 'Nấu ăn'],
    answer: 0, difficulty: diffs[i % 4], image: null, createdAt: Date.now()
  });
}

export const loadData = (): AppData => {
  const str = localStorage.getItem(DATA_KEY);
  if (!str) {
    saveData(defaultData);
    return defaultData;
  }
  try { return JSON.parse(str); } catch { return defaultData; }
};

export const saveData = (data: AppData) => {
  data.settings.lastUpdated = Date.now();
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
};

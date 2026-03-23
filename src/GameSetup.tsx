import React, { useState } from 'react';
import { AppData, Question } from './types';
import { X, Play } from 'lucide-react';

export default function GameSetup({ gameId, gameName, data, onBack, onStart }: { gameId: string, gameName?: string, data: AppData, onBack: () => void, onStart: (qs: Question[]) => void }) {
  const [subjs, setSubjs] = useState<string[]>([]);
  const [diffs, setDiffs] = useState<string[]>(['easy', 'medium', 'hard', 'super_hard']);
  const [topics, setTopics] = useState<string[]>([]);
  const [count, setCount] = useState(15);

  const toggleSubj = (id: string) => setSubjs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleDiff = (id: string) => setDiffs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleTopic = (id: string) => setTopics(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const availableTopics = data.subjects.filter(s => subjs.length === 0 || subjs.includes(s.id)).flatMap(s => s.topics);

  const filtered = data.questions.filter(q => 
    (subjs.length === 0 || subjs.includes(q.subjectId)) &&
    (topics.length === 0 || topics.includes(q.topicId)) &&
    (diffs.length === 0 || diffs.includes(q.difficulty))
  );

  const handleStart = () => {
    if (filtered.length < count) {
      if (!confirm(`Chỉ có ${filtered.length} câu hỏi phù hợp. Bạn có muốn tiếp tục?`)) return;
    }
    // Shuffle and pick
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    onStart(shuffled.slice(0, count));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{gameName ? `Cài đặt: ${gameName}` : 'Cài đặt Game'}</h2>
          <button onClick={onBack} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="font-bold block mb-2">Môn học (Bỏ trống = Tất cả)</label>
            <div className="flex flex-wrap gap-2">
              {data.subjects.map(s => (
                <button key={s.id} onClick={() => toggleSubj(s.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${subjs.includes(s.id) ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-gray-200'}`}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {availableTopics.length > 0 && (
            <div>
              <label className="font-bold block mb-2">Chủ đề (Bỏ trống = Tất cả)</label>
              <div className="flex flex-wrap gap-2">
                {availableTopics.map(t => (
                  <button key={t.id} onClick={() => toggleTopic(t.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${topics.includes(t.id) ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-200'}`}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="font-bold block mb-2">Độ khó</label>
            <div className="flex flex-wrap gap-2">
              {['easy', 'medium', 'hard', 'super_hard'].map(d => (
                <button key={d} onClick={() => toggleDiff(d)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${diffs.includes(d) ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white border-gray-200'}`}>
                  {d === 'easy' ? 'Dễ' : d === 'medium' ? 'Trung bình' : d === 'hard' ? 'Khó' : 'Siêu khó'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold block mb-2">Số lượng câu hỏi: {count}</label>
            <input type="range" min="5" max="50" value={count} onChange={e => setCount(Number(e.target.value))} className="w-full" />
          </div>

          <div className={`p-4 rounded-xl ${filtered.length < count ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            Kho có <strong>{filtered.length}</strong> câu hỏi phù hợp.
          </div>

          <button onClick={handleStart} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex justify-center items-center gap-2 text-lg">
            <Play size={24} /> BẮT ĐẦU CHƠI
          </button>
        </div>
      </div>
    </div>
  );
}

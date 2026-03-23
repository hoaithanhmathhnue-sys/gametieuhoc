import React, { useState, useEffect, useRef } from 'react';
import { AppData, Question, Classroom, SelectedPlayer } from './types';
import { X, Play, Users, Shuffle, UserCheck, Dices } from 'lucide-react';

type PlayerMode = 'none' | 'assign' | 'random';

export default function GameSetup({ gameId, gameName, data, onBack, onStart }: {
  gameId: string,
  gameName?: string,
  data: AppData,
  onBack: () => void,
  onStart: (qs: Question[], player: SelectedPlayer) => void
}) {
  const [subjs, setSubjs] = useState<string[]>([]);
  const [diffs, setDiffs] = useState<string[]>(['easy', 'medium', 'hard', 'super_hard']);
  const [topics, setTopics] = useState<string[]>([]);
  const [count, setCount] = useState(15);

  // Player selection
  const [playerMode, setPlayerMode] = useState<PlayerMode>('none');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<SelectedPlayer>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinIndex, setSpinIndex] = useState(0);
  const spinTimerRef = useRef<any>(null);

  const toggleSubj = (id: string) => setSubjs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleDiff = (id: string) => setDiffs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleTopic = (id: string) => setTopics(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const availableTopics = data.subjects.filter(s => subjs.length === 0 || subjs.includes(s.id)).flatMap(s => s.topics);

  const filtered = data.questions.filter(q =>
    (subjs.length === 0 || subjs.includes(q.subjectId)) &&
    (topics.length === 0 || topics.includes(q.topicId)) &&
    (diffs.length === 0 || diffs.includes(q.difficulty))
  );

  const selectedClass = data.classrooms.find(c => c.id === selectedClassId);
  const students = selectedClass?.students || [];

  useEffect(() => {
    // Reset player when mode changes
    setSelectedPlayer(null);
    setSelectedClassId('');
    setIsSpinning(false);
  }, [playerMode]);

  useEffect(() => {
    setSelectedPlayer(null);
  }, [selectedClassId]);

  // Cleanup spin timer
  useEffect(() => {
    return () => { if (spinTimerRef.current) clearInterval(spinTimerRef.current); };
  }, []);

  const handleSpin = () => {
    if (students.length === 0) return;
    setIsSpinning(true);
    setSelectedPlayer(null);

    let tick = 0;
    const totalTicks = 20 + Math.floor(Math.random() * 15);
    let currentIdx = 0;

    spinTimerRef.current = setInterval(() => {
      tick++;
      currentIdx = (currentIdx + 1) % students.length;
      setSpinIndex(currentIdx);

      if (tick >= totalTicks) {
        clearInterval(spinTimerRef.current);
        const finalStudent = students[currentIdx];
        setSelectedPlayer({
          studentId: finalStudent.id,
          studentName: finalStudent.name,
          classroomId: selectedClassId,
          classroomName: selectedClass?.name || ''
        });
        setIsSpinning(false);
      }
    }, 60 + tick * 8); // Slow down gradually
  };

  const handleAssignPlayer = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    setSelectedPlayer({
      studentId: student.id,
      studentName: student.name,
      classroomId: selectedClassId,
      classroomName: selectedClass?.name || ''
    });
  };

  const handleStart = () => {
    if (filtered.length < count) {
      if (!confirm(`Chỉ có ${filtered.length} câu hỏi phù hợp. Bạn có muốn tiếp tục?`)) return;
    }
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    onStart(shuffled.slice(0, count), playerMode === 'none' ? null : selectedPlayer);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Player Selection Section */}
          <div className="border-t pt-5">
            <label className="font-bold block mb-3 flex items-center gap-2">
              <Users size={18} className="text-teal-600" />
              Chọn người chơi
            </label>
            <div className="flex gap-2 mb-4">
              {([
                { mode: 'none' as PlayerMode, label: 'Bỏ qua', icon: <X size={14} /> },
                { mode: 'assign' as PlayerMode, label: 'Chỉ định', icon: <UserCheck size={14} /> },
                { mode: 'random' as PlayerMode, label: 'Ngẫu nhiên', icon: <Dices size={14} /> },
              ]).map(opt => (
                <button
                  key={opt.mode}
                  onClick={() => setPlayerMode(opt.mode)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                    ${playerMode === opt.mode
                      ? 'bg-teal-100 border-teal-500 text-teal-700 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {playerMode !== 'none' && (
              <div className="space-y-3">
                {/* Class selector */}
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full p-2.5 border-2 border-gray-200 rounded-xl font-medium focus:border-teal-400 focus:outline-none"
                >
                  <option value="">-- Chọn lớp học --</option>
                  {data.classrooms.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.students.length} HS)</option>
                  ))}
                </select>

                {data.classrooms.length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                    ⚠️ Chưa có lớp nào. Hãy thêm lớp học trong mục <strong>Quản lý → Lớp học</strong>.
                  </p>
                )}

                {/* Assign mode - show student list */}
                {playerMode === 'assign' && selectedClassId && students.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-xl p-2 bg-gray-50">
                    {students.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleAssignPlayer(s.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                          ${selectedPlayer?.studentId === s.id
                            ? 'bg-teal-500 text-white shadow-md'
                            : 'bg-white hover:bg-teal-50 text-gray-700 border border-gray-100'}`}
                      >
                        <UserCheck size={14} className={selectedPlayer?.studentId === s.id ? 'text-white' : 'text-gray-400'} />
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Random mode - spin animation */}
                {playerMode === 'random' && selectedClassId && students.length > 0 && (
                  <div className="text-center space-y-3">
                    {/* Spin display */}
                    <div className={`relative p-6 rounded-2xl border-2 ${isSpinning ? 'border-teal-400 bg-gradient-to-br from-teal-50 to-cyan-50' : selectedPlayer ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'} transition-all`}>
                      {isSpinning ? (
                        <div className="animate-pulse">
                          <Shuffle size={32} className="mx-auto text-teal-500 mb-2 animate-spin" />
                          <p className="text-2xl font-black text-teal-700">
                            {students[spinIndex]?.name || '...'}
                          </p>
                          <p className="text-xs text-teal-500 mt-1">Đang quay...</p>
                        </div>
                      ) : selectedPlayer ? (
                        <div>
                          <span className="text-4xl mb-2 block">🎉</span>
                          <p className="text-2xl font-black text-green-700">{selectedPlayer.studentName}</p>
                          <p className="text-sm text-green-500 mt-1">Đã chọn!</p>
                        </div>
                      ) : (
                        <div>
                          <Dices size={32} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-400 font-bold">Nhấn "Quay" để chọn ngẫu nhiên</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSpin}
                      disabled={isSpinning}
                      className={`w-full py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
                        ${isSpinning
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-teal-500/30 hover:scale-[1.02]'}`}
                    >
                      <Shuffle size={20} />
                      {isSpinning ? 'Đang quay...' : selectedPlayer ? '🔄 Quay lại' : '🎲 Quay ngẫu nhiên'}
                    </button>
                  </div>
                )}

                {/* Selected player display */}
                {selectedPlayer && !isSpinning && (
                  <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                    <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {selectedPlayer.studentName.charAt(selectedPlayer.studentName.lastIndexOf(' ') + 1) || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-teal-800">{selectedPlayer.studentName}</p>
                      <p className="text-xs text-teal-600">Lớp {selectedPlayer.classroomName}</p>
                    </div>
                    <button onClick={() => setSelectedPlayer(null)} className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-lg">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
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

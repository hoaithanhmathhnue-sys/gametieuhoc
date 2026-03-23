import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Question, Subject, Topic, Difficulty } from './types';
import { saveData } from './store';
import { parseDocx } from './docxParser';
import ClassroomManage from './ClassroomManage';
import { GoogleGenAI } from '@google/genai';
import { Trash2, Edit, Plus, Upload, Download, Image as ImageIcon, ArrowLeft, Save, Search, ChevronLeft, ChevronRight, Sparkles, CheckSquare, Square, Loader2, Key, Play, School } from 'lucide-react';

export default function Manage({ data, onBack, onDataChange }: { data: AppData, onBack: () => void, onDataChange: (d: AppData) => void }) {
  const [tab, setTab] = useState<'questions'|'subjects'|'import'|'classrooms'>('questions');
  const [subjects, setSubjects] = useState(data.subjects);
  const [questions, setQuestions] = useState(data.questions);
  const [classrooms, setClassrooms] = useState(data.classrooms || []);
  
  // Question Form
  const [editingQ, setEditingQ] = useState<Partial<Question> | null>(null);
  const [filterSubj, setFilterSubj] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;
  
  // AI Generation
  const [showAiModal, setShowAiModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(data.settings.geminiApiKey || '');
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSubjId, setAiSubjId] = useState(subjects[0]?.id || '');
  const [aiTopicId, setAiTopicId] = useState('');
  
  // Subject/Topic Form
  const [editingSubj, setEditingSubj] = useState<Partial<Subject> | null>(null);
  const [editingTopic, setEditingTopic] = useState<{subjId: string, topic: Partial<Topic>} | null>(null);

  const handleSave = () => {
    const newData = { ...data, subjects, questions, classrooms, settings: { ...data.settings, geminiApiKey: apiKey } };
    saveData(newData);
    onDataChange(newData);
    alert('Đã lưu thành công!');
  };

  // Select All / Deselect All
  const selectAll = () => {
    setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
  };
  const deselectAll = () => setSelectedIds(new Set());
  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Xóa ${selectedIds.size} câu hỏi đã chọn?`)) return;
    setQuestions(p => p.filter(q => !selectedIds.has(q.id)));
    setSelectedIds(new Set());
  };
  const deleteAllQuestions = () => {
    if (!confirm(`CẢNH BÁO: Xóa tất cả ${questions.length} câu hỏi? Hành động này không thể hoàn tác!`)) return;
    setQuestions([]);
    setSelectedIds(new Set());
  };
  const loadSelectedToGame = () => {
    if (selectedIds.size === 0) return alert('Vui lòng chọn ít nhất 1 câu hỏi!');
    const selectedQs = questions.filter(q => selectedIds.has(q.id));
    const newData = { ...data, subjects, questions, classrooms, selectedQuestionIds: Array.from(selectedIds) as string[], settings: { ...data.settings, geminiApiKey: apiKey } };
    saveData(newData);
    onDataChange(newData);
    alert(`Đã nạp ${selectedQs.length} câu hỏi vào trò chơi! Quay lại trang chủ để chơi.`);
  };

  // AI Question Generation
  const generateAiQuestions = async () => {
    if (!apiKey) { setShowApiKeyModal(true); return; }
    if (!aiTopic.trim()) return alert('Vui lòng nhập chủ đề cho câu hỏi!');
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const diffLabel = aiDifficulty === 'easy' ? 'dễ, phù hợp tiểu học' : aiDifficulty === 'medium' ? 'trung bình' : aiDifficulty === 'hard' ? 'khó' : 'rất khó';
      const prompt = `Hãy tạo ${aiCount} câu hỏi trắc nghiệm (4 đáp án A, B, C, D) về chủ đề "${aiTopic}", mức độ ${diffLabel}. Trả về JSON array với format:\n[{\n  "text": "Nội dung câu hỏi",\n  "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],\n  "answer": 0\n}]\nTrong đó answer là index (0-3) của đáp án đúng. CHỈ trả về JSON, không thêm text nào khác.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
      });
      
      let text = response.text || '';
      // Clean markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('AI trả về format không hợp lệ');
      
      const newQs: Question[] = parsed.map((p: any, i: number) => ({
        id: `q_ai_${Date.now()}_${i}`,
        subjectId: aiSubjId || subjects[0]?.id || '',
        topicId: aiTopicId || subjects.find(s => s.id === aiSubjId)?.topics[0]?.id || '',
        text: p.text,
        options: p.options,
        answer: typeof p.answer === 'number' ? p.answer : 0,
        difficulty: aiDifficulty as Difficulty,
        image: null,
        createdAt: Date.now()
      }));
      
      setQuestions(prev => [...newQs, ...prev]);
      setShowAiModal(false);
      setAiTopic('');
      alert(`Đã tạo ${newQs.length} câu hỏi bằng AI thành công!`);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('API key') || err.status === 401) {
        alert('API key không hợp lệ. Vui lòng kiểm tra lại.');
        setShowApiKeyModal(true);
      } else {
        alert('Lỗi tạo câu hỏi AI: ' + (err.message || 'Không xác định'));
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Cảnh báo khi rời trang mà chưa lưu
  const hasChanges = JSON.stringify(data.subjects) !== JSON.stringify(subjects) || JSON.stringify(data.questions) !== JSON.stringify(questions) || JSON.stringify(data.classrooms || []) !== JSON.stringify(classrooms);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  const handleBack = () => {
    if (hasChanges && !confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn quay lại?')) return;
    onBack();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) return alert('Ảnh quá lớn! Vui lòng chọn ảnh < 500KB');
    const reader = new FileReader();
    reader.onload = (ev) => setEditingQ(prev => ({ ...prev, image: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const saveQuestion = () => {
    if (!editingQ?.text || !editingQ.subjectId || !editingQ.topicId) return alert('Vui lòng điền đủ thông tin');
    const newQ: Question = {
      id: editingQ.id || `q_${Date.now()}`,
      subjectId: editingQ.subjectId,
      topicId: editingQ.topicId,
      text: editingQ.text,
      options: editingQ.options || ['', '', '', ''],
      answer: editingQ.answer || 0,
      difficulty: editingQ.difficulty || 'medium',
      image: editingQ.image || null,
      createdAt: editingQ.createdAt || Date.now()
    };
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === newQ.id);
      if (idx >= 0) { const arr = [...prev]; arr[idx] = newQ; return arr; }
      return [newQ, ...prev];
    });
    setEditingQ(null);
  };

  const handleImportWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseDocx(file);
      if (parsed.length === 0) return alert('Không tìm thấy câu hỏi nào hợp lệ trong file.');
      if (confirm(`Tìm thấy ${parsed.length} câu hỏi. Bạn có muốn thêm vào kho?`)) {
        const newQs = parsed.map((p, i) => ({
          id: `q_import_${Date.now()}_${i}`,
          subjectId: subjects[0]?.id || '',
          topicId: subjects[0]?.topics[0]?.id || '',
          text: p.text,
          options: p.options,
          answer: p.answer,
          difficulty: p.difficulty as Difficulty,
          image: p.image || null,
          createdAt: Date.now()
        }));
        setQuestions(prev => [...newQs, ...prev]);
        alert('Đã nhập thành công!');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ subjects, questions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'goc_game_data.json'; a.click();
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.subjects && parsed.questions) {
          if (confirm('Nhập dữ liệu sẽ ghi đè dữ liệu hiện tại chưa lưu. Tiếp tục?')) {
            setSubjects(parsed.subjects);
            setQuestions(parsed.questions);
            alert('Đã nhập dữ liệu thành công! Nhấn Lưu thay đổi để áp dụng.');
          }
        } else {
          alert('File JSON không đúng định dạng.');
        }
      } catch (err) {
        alert('Lỗi đọc file JSON.');
      }
    };
    reader.readAsText(file);
  };

  const deleteAllData = () => {
    if (confirm('CẢNH BÁO: Xóa toàn bộ dữ liệu (câu hỏi, môn học, chủ đề)? Hành động này không thể hoàn tác!')) {
      setSubjects([]);
      setQuestions([]);
      alert('Đã xóa toàn bộ dữ liệu. Nhấn Lưu thay đổi để áp dụng.');
    }
  };

  const saveSubject = () => {
    if (!editingSubj?.name) return alert('Vui lòng nhập tên môn học');
    const newSubj: Subject = {
      id: editingSubj.id || `s_${Date.now()}`,
      name: editingSubj.name,
      color: editingSubj.color || '#3B82F6',
      topics: editingSubj.topics || []
    };
    setSubjects(prev => {
      const idx = prev.findIndex(s => s.id === newSubj.id);
      if (idx >= 0) { const arr = [...prev]; arr[idx] = newSubj; return arr; }
      return [...prev, newSubj];
    });
    setEditingSubj(null);
  };

  const saveTopic = () => {
    if (!editingTopic?.topic.name || !editingTopic.subjId) return alert('Vui lòng nhập tên chủ đề');
    const newTopic: Topic = {
      id: editingTopic.topic.id || `t_${Date.now()}`,
      name: editingTopic.topic.name
    };
    setSubjects(prev => prev.map(s => {
      if (s.id === editingTopic.subjId) {
        const tIdx = s.topics.findIndex(t => t.id === newTopic.id);
        if (tIdx >= 0) {
          const newTopics = [...s.topics];
          newTopics[tIdx] = newTopic;
          return { ...s, topics: newTopics };
        }
        return { ...s, topics: [...s.topics, newTopic] };
      }
      return s;
    }));
    setEditingTopic(null);
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchSubj = filterSubj ? q.subjectId === filterSubj : true;
      const matchSearch = searchQ ? q.text.toLowerCase().includes(searchQ.toLowerCase()) : true;
      return matchSubj && matchSearch;
    });
  }, [questions, filterSubj, searchQ]);

  const paginatedQuestions = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredQuestions.slice(start, start + itemsPerPage);
  }, [filteredQuestions, page]);

  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm">
        <button onClick={handleBack} className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl hover:bg-gray-200"><ArrowLeft size={20}/> Quay lại</button>
        <h1 className="text-2xl font-bold">Quản lý kho câu hỏi</h1>
        <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700"><Save size={20}/> Lưu thay đổi</button>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <button onClick={() => setTab('questions')} className={`px-4 py-2 rounded-xl font-bold ${tab==='questions'?'bg-blue-600 text-white':'bg-white'}`}>Câu hỏi ({questions.length})</button>
        <button onClick={() => setTab('subjects')} className={`px-4 py-2 rounded-xl font-bold ${tab==='subjects'?'bg-blue-600 text-white':'bg-white'}`}>Môn học & Chủ đề</button>
        <button onClick={() => setTab('import')} className={`px-4 py-2 rounded-xl font-bold ${tab==='import'?'bg-blue-600 text-white':'bg-white'}`}>Nhập / Xuất</button>
        <button onClick={() => setTab('classrooms')} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1 ${tab==='classrooms'?'bg-teal-600 text-white':'bg-white'}`}><School size={16} /> Lớp học</button>
      </div>

      {tab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white p-4 rounded-2xl shadow-sm h-fit">
            <h2 className="font-bold mb-4">{editingQ?.id ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</h2>
            <div className="space-y-3">
              <select className="w-full p-2 border rounded-lg" value={editingQ?.subjectId || ''} onChange={e => setEditingQ(p => ({...p, subjectId: e.target.value}))}>
                <option value="">-- Chọn môn --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className="w-full p-2 border rounded-lg" value={editingQ?.topicId || ''} onChange={e => setEditingQ(p => ({...p, topicId: e.target.value}))}>
                <option value="">-- Chọn chủ đề --</option>
                {subjects.find(s => s.id === editingQ?.subjectId)?.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <textarea placeholder="Nội dung câu hỏi" className="w-full p-2 border rounded-lg h-24" value={editingQ?.text || ''} onChange={e => setEditingQ(p => ({...p, text: e.target.value}))} />
              {['A', 'B', 'C', 'D'].map((lbl, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="radio" name="ans" checked={editingQ?.answer === i} onChange={() => setEditingQ(p => ({...p, answer: i}))} />
                  <input type="text" placeholder={`Đáp án ${lbl}`} className="flex-1 p-2 border rounded-lg" value={editingQ?.options?.[i] || ''} onChange={e => {
                    const opts = [...(editingQ?.options || ['', '', '', ''])];
                    opts[i] = e.target.value;
                    setEditingQ(p => ({...p, options: opts}));
                  }} />
                </div>
              ))}
              <select className="w-full p-2 border rounded-lg" value={editingQ?.difficulty || 'medium'} onChange={e => setEditingQ(p => ({...p, difficulty: e.target.value as Difficulty}))}>
                <option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option><option value="super_hard">Siêu khó</option>
              </select>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer bg-gray-100 p-2 rounded-lg flex items-center gap-2 text-sm"><ImageIcon size={16}/> Chọn ảnh <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></label>
                {editingQ?.image && <img src={editingQ.image} className="h-10 w-10 object-cover rounded" />}
                {editingQ?.image && <button onClick={() => setEditingQ(p => ({...p, image: null}))} className="text-red-500"><Trash2 size={16}/></button>}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveQuestion} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">Lưu</button>
                <button onClick={() => setEditingQ(null)} className="flex-1 bg-gray-200 py-2 rounded-lg font-bold">Hủy</button>
              </div>
            </div>
          </div>
          <div className="col-span-1 lg:col-span-2 bg-white p-4 rounded-2xl shadow-sm flex flex-col h-[700px]">
            <div className="flex gap-3 mb-3 flex-wrap">
              <select className="p-2 border rounded-lg w-1/4" value={filterSubj} onChange={e => { setFilterSubj(e.target.value); setPage(1); }}>
                <option value="">Tất cả môn học</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input type="text" placeholder="Tìm kiếm câu hỏi..." className="w-full pl-10 p-2 border rounded-lg" value={searchQ} onChange={e => { setSearchQ(e.target.value); setPage(1); }} />
              </div>
              <button onClick={() => { setShowAiModal(true); if (!apiKey) setShowApiKeyModal(true); }} className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-2 rounded-lg font-bold text-sm hover:bg-purple-200"><Sparkles size={14} /> Tạo bằng AI</button>
            </div>
            {/* Action bar */}
            <div className="flex gap-2 mb-3 flex-wrap items-center">
              <button onClick={selectedIds.size === filteredQuestions.length ? deselectAll : selectAll} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-100">
                {selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0 ? <><CheckSquare size={14} /> Bỏ chọn tất cả</> : <><Square size={14} /> Chọn tất cả</>}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs text-gray-500 font-medium">Đã chọn: {selectedIds.size}</span>
                  <button onClick={deleteSelected} className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-200"><Trash2 size={14} /> Xóa đã chọn</button>
                  <button onClick={loadSelectedToGame} className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-green-200"><Play size={14} /> Nạp vào trò chơi ({selectedIds.size})</button>
                </>
              )}
              <button onClick={deleteAllQuestions} className="flex items-center gap-1 bg-red-50 text-red-500 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-100 ml-auto"><Trash2 size={14} /> Xóa tất cả</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {paginatedQuestions.map(q => (
                <div key={q.id} className="p-3 border rounded-xl flex justify-between items-center hover:bg-gray-50">
                  <div className="flex gap-3 items-center">
                    <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (next.has(q.id)) next.delete(q.id); else next.add(q.id);
                      return next;
                    })} className="w-4 h-4 rounded" />
                    {q.image && <img src={q.image} className="w-12 h-12 object-cover rounded-lg" />}
                    <div>
                      <p className="font-bold line-clamp-1">{q.text}</p>
                      <p className="text-sm text-gray-500">{subjects.find(s=>s.id===q.subjectId)?.name} • {q.difficulty}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingQ(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                    <button onClick={() => { if(confirm('Xóa?')) setQuestions(p => p.filter(x => x.id !== q.id)) }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
              {paginatedQuestions.length === 0 && <p className="text-center text-gray-500 py-8">Không tìm thấy câu hỏi nào.</p>}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-4 border-t mt-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"><ChevronLeft size={20}/></button>
                <span className="text-sm font-medium">Trang {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"><ChevronRight size={20}/></button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white p-4 rounded-2xl shadow-sm h-fit">
            <h2 className="font-bold mb-4">{editingSubj ? 'Sửa môn học' : editingTopic ? 'Sửa chủ đề' : 'Thêm mới'}</h2>
            
            {!editingTopic && (
              <div className="space-y-3 mb-6 p-4 border rounded-xl bg-gray-50">
                <h3 className="font-medium text-sm text-gray-600">Môn học</h3>
                <input type="text" placeholder="Tên môn học" className="w-full p-2 border rounded-lg" value={editingSubj?.name || ''} onChange={e => setEditingSubj(p => ({...p, name: e.target.value}))} />
                <div className="flex items-center gap-2">
                  <label className="text-sm">Màu sắc:</label>
                  <input type="color" className="w-8 h-8 rounded cursor-pointer" value={editingSubj?.color || '#3B82F6'} onChange={e => setEditingSubj(p => ({...p, color: e.target.value}))} />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveSubject} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm">Lưu môn</button>
                  <button onClick={() => setEditingSubj(null)} className="flex-1 bg-gray-200 py-2 rounded-lg font-bold text-sm">Hủy</button>
                </div>
              </div>
            )}

            {!editingSubj && (
              <div className="space-y-3 p-4 border rounded-xl bg-gray-50">
                <h3 className="font-medium text-sm text-gray-600">Chủ đề</h3>
                <select className="w-full p-2 border rounded-lg" value={editingTopic?.subjId || ''} onChange={e => setEditingTopic(p => ({subjId: e.target.value, topic: p?.topic || {}}))}>
                  <option value="">-- Chọn môn học --</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input type="text" placeholder="Tên chủ đề" className="w-full p-2 border rounded-lg" value={editingTopic?.topic.name || ''} onChange={e => setEditingTopic(p => p ? {...p, topic: {...p.topic, name: e.target.value}} : {subjId: '', topic: {name: e.target.value}})} />
                <div className="flex gap-2">
                  <button onClick={saveTopic} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm">Lưu chủ đề</button>
                  <button onClick={() => setEditingTopic(null)} className="flex-1 bg-gray-200 py-2 rounded-lg font-bold text-sm">Hủy</button>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Danh sách môn học</h2>
              <button onClick={() => setEditingSubj({})} className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100"><Plus size={16}/> Thêm môn</button>
            </div>
            <div className="space-y-4">
              {subjects.map(s => (
                <div key={s.id} className="border p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full" style={{backgroundColor: s.color}}></span> {s.name}
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingTopic({subjId: s.id, topic: {}})} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Thêm chủ đề"><Plus size={16}/></button>
                      <button onClick={() => setEditingSubj(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button>
                      <button onClick={() => { if(confirm('Xóa môn học này và tất cả chủ đề bên trong?')) setSubjects(p => p.filter(x => x.id !== s.id)) }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {s.topics.map(t => (
                      <div key={t.id} className="bg-gray-100 pl-3 pr-1 py-1 rounded-full text-sm flex items-center gap-2">
                        <span>{t.name}</span>
                        <button onClick={() => setEditingTopic({subjId: s.id, topic: t})} className="text-blue-600 hover:text-blue-800"><Edit size={14}/></button>
                        <button onClick={() => { if(confirm('Xóa chủ đề này?')) setSubjects(p => p.map(subj => subj.id === s.id ? {...subj, topics: subj.topics.filter(x => x.id !== t.id)} : subj)) }} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                      </div>
                    ))}
                    {s.topics.length === 0 && <span className="text-sm text-gray-400 italic">Chưa có chủ đề</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'classrooms' && (
        <ClassroomManage classrooms={classrooms} onChange={setClassrooms} />
      )}

      {tab === 'import' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <h2 className="font-bold text-xl mb-4 text-blue-600">Nhập từ Word (.docx)</h2>
            <p className="text-sm text-gray-500 mb-6 text-left bg-gray-50 p-3 rounded-lg">Định dạng mẫu:<br/>Câu 1: [Nội dung]<br/>A. [Lựa chọn]<br/>...<br/>Đáp án: A<br/>Độ khó: Dễ<br/>---</p>
            <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-200 w-full justify-center">
              <Upload size={20}/> Chọn file .docx
              <input type="file" accept=".docx" className="hidden" onChange={handleImportWord} />
            </label>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <h2 className="font-bold text-xl mb-4 text-green-600">Sao lưu & Phục hồi</h2>
            <p className="text-sm text-gray-500 mb-6">Tải xuống hoặc tải lên toàn bộ dữ liệu (Môn học, Chủ đề, Câu hỏi) dưới dạng file JSON.</p>
            <div className="space-y-3">
              <button onClick={exportJson} className="w-full flex items-center justify-center gap-2 bg-green-100 text-green-700 px-6 py-3 rounded-xl font-bold hover:bg-green-200">
                <Download size={20}/> Tải xuống JSON
              </button>
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200">
                <Upload size={20}/> Nhập file JSON
                <input type="file" accept=".json" className="hidden" onChange={importJson} />
              </label>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm text-center border-2 border-red-100">
            <h2 className="font-bold text-xl mb-4 text-red-600">Xóa dữ liệu</h2>
            <p className="text-sm text-gray-500 mb-6">Xóa toàn bộ câu hỏi, môn học và chủ đề hiện có. Hành động này không thể hoàn tác.</p>
            <button onClick={deleteAllData} className="w-full flex items-center justify-center gap-2 bg-red-100 text-red-700 px-6 py-3 rounded-xl font-bold hover:bg-red-200 mt-auto">
              <Trash2 size={20}/> Xóa tất cả
            </button>
          </div>
        </div>
      )}

      {/* AI Question Modal */}
      {showAiModal && !showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles size={20} className="text-purple-600" /> Tạo câu hỏi bằng AI</h2>
            <div className="space-y-4">
              <div>
                <label className="font-bold text-sm block mb-1">Chủ đề *</label>
                <input type="text" placeholder="VD: Phép cộng số có 3 chữ số" className="w-full p-3 border-2 rounded-xl" value={aiTopic} onChange={e => setAiTopic(e.target.value)} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-sm block mb-1">Số câu</label>
                  <select className="w-full p-2 border rounded-lg" value={aiCount} onChange={e => setAiCount(Number(e.target.value))}>
                    {[3,5,10,15,20].map(n => <option key={n} value={n}>{n} câu</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-sm block mb-1">Độ khó</label>
                  <select className="w-full p-2 border rounded-lg" value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)}>
                    <option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option><option value="super_hard">Siêu khó</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-sm block mb-1">Môn học</label>
                <select className="w-full p-2 border rounded-lg" value={aiSubjId} onChange={e => setAiSubjId(e.target.value)}>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={generateAiQuestions} disabled={aiLoading} className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {aiLoading ? <><Loader2 size={18} className="animate-spin" /> Đang tạo...</> : <><Sparkles size={18} /> Tạo câu hỏi</>}
                </button>
                <button onClick={() => setShowAiModal(false)} className="px-6 py-3 bg-gray-200 font-bold rounded-xl">Hủy</button>
              </div>
              <button onClick={() => setShowApiKeyModal(true)} className="w-full text-xs text-gray-400 hover:text-purple-600 flex items-center justify-center gap-1"><Key size={12} /> Đổi API Key</button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Key size={20} className="text-amber-600" /> Nhập API Key Gemini</h2>
            <p className="text-sm text-gray-500 mb-4">Truy cập <a href="https://aistudio.google.com/apikey" target="_blank" className="text-blue-600 underline">aistudio.google.com/apikey</a> để lấy API key miễn phí.</p>
            <input type="text" placeholder="Dán API key vào đây..." className="w-full p-3 border-2 rounded-xl font-mono text-sm mb-4" value={apiKey} onChange={e => setApiKey(e.target.value)} autoFocus />
            <div className="flex gap-3">
              <button onClick={() => { if (!apiKey.trim()) return alert('Vui lòng nhập API key!'); setShowApiKeyModal(false); setShowAiModal(true); }} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600">Lưu & Tiếp tục</button>
              <button onClick={() => { setShowApiKeyModal(false); setShowAiModal(false); }} className="px-6 py-3 bg-gray-200 font-bold rounded-xl">Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

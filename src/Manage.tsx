import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Question, Subject, Topic, Difficulty, GameSettings, CrosswordConfig, CrosswordEntry, DEFAULT_GAME_SETTINGS, DEFAULT_TEAM_CONFIGS } from './types';
import { saveData } from './store';
import { parseDocx } from './docxParser';
import { parsePdf } from './pdfParser';
import { MathContent } from './MathContent';
import ClassroomManage from './ClassroomManage';
import { GoogleGenAI } from '@google/genai';
import { Trash2, Edit, Plus, Upload, Download, Image as ImageIcon, ArrowLeft, Save, Search, ChevronLeft, ChevronRight, Sparkles, CheckSquare, Square, Loader2, Key, Play, School, Settings, Bot, FileSearch, Check, X, Users } from 'lucide-react';

export default function Manage({ data, onBack, onDataChange }: { data: AppData, onBack: () => void, onDataChange: (d: AppData) => void }) {
  const [tab, setTab] = useState<'questions'|'subjects'|'import'|'classrooms'|'settings'>('questions');
  const [gameSettings, setGameSettings] = useState<GameSettings>(data.gameSettings || { ...DEFAULT_GAME_SETTINGS });
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
  
  // AI File Analysis
  const [aiFileLoading, setAiFileLoading] = useState(false);
  const [aiFileParsedQuestions, setAiFileParsedQuestions] = useState<Array<{text: string; options: string[]; answer: number; difficulty: string; image: string | null}>>([]);
  const [showAiFilePreview, setShowAiFilePreview] = useState(false);
  const [aiFileRawText, setAiFileRawText] = useState('');

  // Subject/Topic Form
  const [editingSubj, setEditingSubj] = useState<Partial<Subject> | null>(null);
  const [editingTopic, setEditingTopic] = useState<{subjId: string, topic: Partial<Topic>} | null>(null);

  const handleSave = () => {
    const newData = { ...data, subjects, questions, classrooms, gameSettings, settings: { ...data.settings, geminiApiKey: apiKey } };
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

  // AI File Analysis - Phân tích file bằng AI
  const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

  const handleAiAnalyzeFile = async (fileType: 'docx' | 'pdf') => {
    if (!apiKey) { setShowApiKeyModal(true); return; }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fileType === 'docx' ? '.docx' : '.pdf';
    input.onchange = async (ev: any) => {
      const file = ev.target?.files?.[0];
      if (!file) return;
      
      setAiFileLoading(true);
      try {
        // Step 1: Parse file using existing parsers to extract raw text + images + math
        let rawText = '';
        let imageMap = new Map<string, string>();
        
        if (fileType === 'docx') {
          try {
            const buffer = await file.arrayBuffer();
            // Use parseDocx to extract structured text with math (LaTeX)
            const parsed = await parseDocx(file);
            // Build raw text for AI analysis
            rawText = parsed.map((q, i) => {
              let block = `Câu ${i+1}: ${q.text}\n`;
              q.options.forEach((opt, j) => {
                block += `${String.fromCharCode(65 + j)}. ${opt}\n`;
              });
              block += `Đáp án: ${String.fromCharCode(65 + q.answer)}\nĐộ khó: ${q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : q.difficulty === 'super_hard' ? 'Siêu khó' : 'Trung bình'}\n---`;
              return block;
            }).join('\n');
            
            // For better AI analysis, also get raw text from mammoth
            if (parsed.length > 0) {
              const mammoth = await import('mammoth');
              const result = await mammoth.default.extractRawText({ arrayBuffer: buffer });
              if (result.value.trim()) rawText = result.value;
            }
          } catch (err) {
            console.warn('[AI Analyze] DOCX parse failed, trying mammoth fallback');
            const mammoth = await import('mammoth');
            const buffer = await file.arrayBuffer();
            const result = await mammoth.default.extractRawText({ arrayBuffer: buffer });
            rawText = result.value;
          }
        } else {
          // PDF
          try {
            const parsed = await parsePdf(file);
            rawText = parsed.map((q, i) => {
              let block = `Câu ${i+1}: ${q.text}\n`;
              q.options.forEach((opt, j) => {
                block += `${String.fromCharCode(65 + j)}. ${opt}\n`;
              });
              block += `Đáp án: ${String.fromCharCode(65 + q.answer)}\nĐộ khó: ${q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : q.difficulty === 'super_hard' ? 'Siêu khó' : 'Trung bình'}\n---`;
              return block;
            }).join('\n');
          } catch {
            alert('Không thể đọc file PDF.');
            setAiFileLoading(false);
            return;
          }
        }
        
        if (!rawText.trim()) {
          alert('Không tìm thấy nội dung trong file.');
          setAiFileLoading(false);
          return;
        }

        setAiFileRawText(rawText);

        // Step 2: Send to Gemini AI for analysis with fallback
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Bạn là chuyên gia phân tích đề thi. Hãy phân tích nội dung văn bản dưới đây và trích xuất TẤT CẢ câu hỏi trắc nghiệm (4 đáp án A, B, C, D).

QUY TẮC QUAN TRỌNG:
- Giữ nguyên mọi công thức toán học ở dạng LaTeX inline \\(...\\)
- Nếu câu hỏi có hình ảnh, ghi [IMG] vào vị trí hình
- Xác định đáp án đúng (index 0-3 tương ứng A-D)
- Phân loại độ khó: easy | medium | hard | super_hard
- CHỈ trả về JSON array, KHÔNG thêm text nào khác

Format JSON:
[{
  "text": "Nội dung câu hỏi (giữ LaTeX nếu có)",
  "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
  "answer": 0,
  "difficulty": "medium"
}]

NỘI DUNG FILE:
${rawText.substring(0, 30000)}`;

        let lastError: any = null;
        let aiResult: any[] | null = null;

        for (const model of FALLBACK_MODELS) {
          try {
            console.log(`[AI Analyze] Trying model: ${model}`);
            const response = await ai.models.generateContent({
              model,
              contents: prompt
            });
            let responseText = response.text || '';
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            aiResult = JSON.parse(responseText);
            if (Array.isArray(aiResult) && aiResult.length > 0) {
              console.log(`[AI Analyze] Success with ${model}, found ${aiResult.length} questions`);
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`[AI Analyze] Model ${model} failed:`, err.message);
          }
        }

        if (!aiResult || aiResult.length === 0) {
          throw lastError || new Error('AI không tìm thấy câu hỏi nào trong file.');
        }

        const parsedQuestions = aiResult.map((q: any) => ({
          text: q.text || '',
          options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
          answer: typeof q.answer === 'number' ? q.answer : 0,
          difficulty: ['easy', 'medium', 'hard', 'super_hard'].includes(q.difficulty) ? q.difficulty : 'medium',
          image: null as string | null
        }));

        setAiFileParsedQuestions(parsedQuestions);
        setShowAiFilePreview(true);
      } catch (err: any) {
        console.error('[AI Analyze] Error:', err);
        if (err.message?.includes('API key') || err.status === 401) {
          alert('API key không hợp lệ. Vui lòng kiểm tra lại.');
          setShowApiKeyModal(true);
        } else {
          alert('Lỗi phân tích AI: ' + (err.message || 'Không xác định'));
        }
      } finally {
        setAiFileLoading(false);
      }
    };
    input.click();
  };

  const handleConfirmAiQuestions = () => {
    if (aiFileParsedQuestions.length === 0) return;
    const newQs: Question[] = aiFileParsedQuestions.map((p, i) => ({
      id: `q_ai_file_${Date.now()}_${i}`,
      subjectId: subjects[0]?.id || '',
      topicId: subjects[0]?.topics[0]?.id || '',
      text: p.text,
      options: p.options,
      answer: p.answer,
      difficulty: p.difficulty as Difficulty,
      image: p.image,
      createdAt: Date.now()
    }));
    setQuestions(prev => [...newQs, ...prev]);
    setShowAiFilePreview(false);
    setAiFileParsedQuestions([]);
    alert(`Đã thêm ${newQs.length} câu hỏi từ AI vào kho!`);
  };

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parsePdf(file);
      if (parsed.length === 0) return alert('Không tìm thấy câu hỏi nào hợp lệ trong file PDF.');
      if (confirm(`Tìm thấy ${parsed.length} câu hỏi từ PDF. Bạn có muốn thêm vào kho?`)) {
        const newQs = parsed.map((p, i) => ({
          id: `q_pdf_${Date.now()}_${i}`,
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

      {/* Banner nhắc API Key - theo LỆNH.md */}
      {!apiKey && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between mb-4 animate-pulse">
          <p className="text-red-600 font-bold text-sm flex items-center gap-2">
            <Key size={16} /> Hãy lấy API KEY để sử dụng tính năng AI
          </p>
          <button onClick={() => setShowApiKeyModal(true)} className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-600 flex items-center gap-1.5 transition-colors">
            <Key size={14} /> Nhập API Key
          </button>
        </div>
      )}

      <div className="flex gap-4 mb-6 flex-wrap">
        <button onClick={() => setTab('questions')} className={`px-4 py-2 rounded-xl font-bold ${tab==='questions'?'bg-blue-600 text-white':'bg-white'}`}>Câu hỏi ({questions.length})</button>
        <button onClick={() => setTab('subjects')} className={`px-4 py-2 rounded-xl font-bold ${tab==='subjects'?'bg-blue-600 text-white':'bg-white'}`}>Môn học & Chủ đề</button>
        <button onClick={() => setTab('import')} className={`px-4 py-2 rounded-xl font-bold ${tab==='import'?'bg-blue-600 text-white':'bg-white'}`}>Nhập / Xuất</button>
        <button onClick={() => setTab('classrooms')} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1 ${tab==='classrooms'?'bg-teal-600 text-white':'bg-white'}`}><School size={16} /> Lớp học</button>
        <button onClick={() => setTab('settings')} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1 ${tab==='settings'?'bg-purple-600 text-white':'bg-white'}`}><Settings size={16} /> Cài đặt Game</button>
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
                      <p className="font-bold line-clamp-1"><MathContent html={q.text} /></p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
            <h2 className="font-bold text-xl mb-4 text-blue-600">Nhập từ Word / PDF</h2>
            <p className="text-sm text-gray-500 mb-6 text-left bg-gray-50 p-3 rounded-lg">Định dạng mẫu:<br/>Câu 1: [Nội dung]<br/>A. [Lựa chọn]<br/>...<br/>Đáp án: A<br/>Độ khó: Dễ<br/>---</p>
            <div className="space-y-3">
              <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-200 w-full justify-center">
                <Upload size={20}/> Chọn file .docx
                <input type="file" accept=".docx" className="hidden" onChange={handleImportWord} />
              </label>
              <label className="cursor-pointer inline-flex items-center gap-2 bg-red-100 text-red-700 px-6 py-3 rounded-xl font-bold hover:bg-red-200 w-full justify-center">
                <Upload size={20}/> Chọn file .pdf
                <input type="file" accept=".pdf" className="hidden" onChange={handleImportPdf} />
              </label>
            </div>
          </div>

          {/* Cột riêng: Phân tích file bằng AI */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl shadow-sm text-center border-2 border-purple-200">
            <h2 className="font-bold text-xl mb-4 text-purple-700 flex items-center justify-center gap-2"><Bot size={22} /> Tải lên file (AI)</h2>
            <p className="text-sm text-gray-500 mb-6">Sử dụng AI để phân tích & tự động chọn câu hỏi từ file Word hoặc PDF.</p>
            <div className="space-y-3">
              <button 
                onClick={() => handleAiAnalyzeFile('docx')} 
                disabled={aiFileLoading}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 transition-all shadow-lg shadow-purple-200"
              >
                {aiFileLoading ? <><Loader2 size={18} className="animate-spin" /> Đang phân tích...</> : <><Bot size={18} /> Phân tích file .docx (AI)</>}
              </button>
              <button 
                onClick={() => handleAiAnalyzeFile('pdf')} 
                disabled={aiFileLoading}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-lg shadow-rose-200"
              >
                {aiFileLoading ? <><Loader2 size={18} className="animate-spin" /> Đang phân tích...</> : <><Bot size={18} /> Phân tích file .pdf (AI)</>}
              </button>
            </div>
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

      {tab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-purple-200">
            <h2 className="text-xl font-bold text-purple-800 flex items-center gap-2 mb-2"><Settings size={20} /> Cài đặt trò chơi</h2>
            <p className="text-sm text-purple-600">Thiết lập thời gian và tùy chọn cho từng trò chơi. Nhấn "Lưu thay đổi" để áp dụng.</p>
          </div>

          {/* Time Config for all 6 games */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              { key: 'millionaire' as const, name: '💰 Ai là triệu phú', desc: 'Thời gian cho mỗi câu hỏi', defaultTime: 30 },
              { key: 'flipCard' as const, name: '🃏 Lật thẻ bí ẩn', desc: '0 = không giới hạn', defaultTime: 0 },
              { key: 'obstacle' as const, name: '🏁 Đường đua vượt chướng ngại vật', desc: '0 = không giới hạn', defaultTime: 0 },
              { key: 'goldenBell' as const, name: '🔔 Rung chuông vàng', desc: '0 = không giới hạn', defaultTime: 0 },
              { key: 'crossword' as const, name: '🔤 Ô chữ bí mật', desc: 'Thời gian cho mỗi ô chữ', defaultTime: 15 },
              { key: 'flower' as const, name: '🌸 Hái hoa dân chủ', desc: '0 = không giới hạn', defaultTime: 0 },
            ]).map(game => (
              <div key={game.key} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-lg mb-1">{game.name}</h3>
                <p className="text-xs text-gray-400 mb-3">{game.desc}</p>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 whitespace-nowrap">⏱️ Thời gian:</label>
                  <input 
                    type="number" min={0} max={300}
                    className="w-20 p-2 border-2 rounded-lg text-center font-bold text-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                    value={gameSettings[game.key].timePerQuestion}
                    onChange={e => setGameSettings(prev => ({
                      ...prev,
                      [game.key]: { ...prev[game.key], timePerQuestion: parseInt(e.target.value) || 0 }
                    }))}
                  />
                  <span className="text-sm text-gray-500">giây</span>
                </div>
              </div>
            ))}
          </div>

          {/* Crossword Special Config */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-amber-200">
            <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2 mb-1">🔤 Cài đặt Ô chữ bí mật (nâng cao)</h2>
            <p className="text-sm text-amber-600 mb-4">Giáo viên có thể điền trước đáp án các hàng (tối đa 9 ký tự/hàng) và chữ bí mật (dãy dọc ô màu vàng)</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Entries */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-700">Đáp án các hàng</h3>
                  <button 
                    onClick={() => {
                      const entries = gameSettings.crossword.config?.entries || [];
                      if (entries.length >= 12) return alert('Tối đa 12 hàng!');
                      setGameSettings(prev => ({
                        ...prev,
                        crossword: {
                          ...prev.crossword,
                          config: {
                            entries: [...entries, { answer: '', hint: '' }],
                            secretWord: prev.crossword.config?.secretWord || '',
                            questionCount: prev.crossword.config?.questionCount || entries.length + 1
                          }
                        }
                      }));
                    }}
                    className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200 flex items-center gap-1"
                  >
                    <Plus size={14} /> Thêm hàng
                  </button>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {(gameSettings.crossword.config?.entries || []).map((entry, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-400 w-6 text-center">{idx + 1}</span>
                        <input 
                          type="text" maxLength={9}
                          placeholder="Đáp án (max 9 chữ)"
                          className="flex-1 p-2 border rounded-lg text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
                          value={entry.answer}
                          onChange={e => {
                            const val = e.target.value.toUpperCase().replace(/[^A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]/gi, '');
                            setGameSettings(prev => {
                              const entries = [...(prev.crossword.config?.entries || [])];
                              // Reset secretIndex if answer length changes
                              const newSecretIndex = (entries[idx].secretIndex ?? -1) >= val.slice(0, 9).length ? undefined : entries[idx].secretIndex;
                              entries[idx] = { ...entries[idx], answer: val.slice(0, 9), secretIndex: newSecretIndex };
                              return { ...prev, crossword: { ...prev.crossword, config: { ...prev.crossword.config!, entries, secretWord: prev.crossword.config?.secretWord || '', questionCount: prev.crossword.config?.questionCount || entries.length } } };
                            });
                          }}
                        />
                        <input 
                          type="text"
                          placeholder="Gợi ý"
                          className="w-32 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
                          value={entry.hint || ''}
                          onChange={e => {
                            setGameSettings(prev => {
                              const entries = [...(prev.crossword.config?.entries || [])];
                              entries[idx] = { ...entries[idx], hint: e.target.value };
                              return { ...prev, crossword: { ...prev.crossword, config: { ...prev.crossword.config!, entries, secretWord: prev.crossword.config?.secretWord || '', questionCount: prev.crossword.config?.questionCount || entries.length } } };
                            });
                          }}
                        />
                        <button 
                          onClick={() => {
                            setGameSettings(prev => {
                              const entries = [...(prev.crossword.config?.entries || [])];
                              entries.splice(idx, 1);
                              return { ...prev, crossword: { ...prev.crossword, config: { ...prev.crossword.config!, entries, secretWord: prev.crossword.config?.secretWord || '', questionCount: prev.crossword.config?.questionCount || entries.length } } };
                            });
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {/* Click to select secret letter */}
                      {entry.answer.length > 0 && (
                        <div className="flex items-center gap-1 ml-8">
                          <span className="text-xs text-gray-500 mr-1 whitespace-nowrap">Chọn chữ bí mật:</span>
                          {entry.answer.split('').map((char, ci) => (
                            <button 
                              key={ci}
                              onClick={() => {
                                setGameSettings(prev => {
                                  const entries = [...(prev.crossword.config?.entries || [])];
                                  entries[idx] = { ...entries[idx], secretIndex: ci };
                                  return { ...prev, crossword: { ...prev.crossword, config: { ...prev.crossword.config!, entries, secretWord: prev.crossword.config?.secretWord || '', questionCount: prev.crossword.config?.questionCount || entries.length } } };
                                });
                              }}
                              className={`w-7 h-7 flex items-center justify-center border-2 text-xs font-bold rounded transition-all
                                ${entry.secretIndex === ci 
                                  ? 'bg-yellow-400 border-yellow-600 text-yellow-900 scale-110 shadow-md ring-2 ring-yellow-300' 
                                  : 'bg-white border-gray-300 text-gray-600 hover:border-yellow-400 hover:bg-yellow-50'}`}
                            >
                              {char}
                            </button>
                          ))}
                          {entry.secretIndex != null && (
                            <span className="text-xs text-yellow-600 font-bold ml-1">✓ Ô {entry.secretIndex + 1}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {(gameSettings.crossword.config?.entries || []).length === 0 && (
                    <div className="text-center text-gray-400 py-8 text-sm">Chưa có hàng nào. Nhấn "Thêm hàng" để bắt đầu.<br/>Nếu để trống, game sẽ tự lấy đáp án từ câu hỏi.</div>
                  )}
                </div>
              </div>

              {/* Right: Secret Word + Preview */}
              <div className="space-y-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-2">🔑 Chữ bí mật (dãy dọc ô vàng) — Tiếng Việt có dấu</label>
                  <input 
                    type="text" maxLength={12}
                    placeholder="VD: TOÁN HỌC"
                    className="w-full p-3 border-2 border-amber-300 rounded-xl font-bold text-2xl tracking-[0.3em] text-center text-amber-700 bg-amber-50 focus:ring-2 focus:ring-amber-400 focus:border-amber-500"
                    value={gameSettings.crossword.config?.secretWord || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setGameSettings(prev => ({
                        ...prev,
                        crossword: {
                          ...prev.crossword,
                          config: {
                            entries: prev.crossword.config?.entries || [],
                            secretWord: val,
                            questionCount: prev.crossword.config?.questionCount || 0
                          }
                        }
                      }));
                    }}
                  />
                  <p className="text-xs text-amber-500 mt-1">Có thể gõ tiếng Việt có dấu. VD: "TOÁN HỌC", "THIÊN NHIÊN"</p>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-2">📝 Số câu hỏi</label>
                  <input 
                    type="number" min={1} max={20}
                    className="w-full p-3 border-2 rounded-xl text-lg font-bold focus:ring-2 focus:ring-amber-300"
                    value={gameSettings.crossword.config?.questionCount || 0}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      setGameSettings(prev => ({
                        ...prev,
                        crossword: {
                          ...prev.crossword,
                          config: {
                            entries: prev.crossword.config?.entries || [],
                            secretWord: prev.crossword.config?.secretWord || '',
                            questionCount: val
                          }
                        }
                      }));
                    }}
                  />
                </div>

                {/* Mini Preview */}
                {(gameSettings.crossword.config?.entries || []).length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-xl border">
                    <h4 className="font-bold text-sm text-gray-600 mb-3">Xem trước ô chữ:</h4>
                    <div className="space-y-1 font-mono text-xs">
                      {(gameSettings.crossword.config?.entries || []).map((entry, idx) => {
                        const sIdx = entry.secretIndex;
                        return (
                          <div key={idx} className="flex gap-0.5 justify-center">
                            {entry.answer.split('').map((char, ci) => (
                              <div key={ci} className={`w-6 h-6 flex items-center justify-center border text-xs font-bold rounded
                                ${ci === sIdx ? 'bg-yellow-400 border-yellow-600 text-yellow-900 shadow-sm' : 'bg-white border-gray-300 text-gray-700'}`}>
                                {char}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                    {gameSettings.crossword.config?.secretWord && (
                      <div className="mt-3 text-center">
                        <span className="text-xs text-gray-500">Chữ bí mật: </span>
                        <span className="text-lg font-black text-amber-700 tracking-wider">{gameSettings.crossword.config.secretWord}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cài đặt số đội chơi */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-blue-200">
            <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2 mb-1">
              <Users size={20} /> Cài đặt đội chơi
            </h2>
            <p className="text-sm text-blue-600 mb-4">Chọn số đội tham gia trò chơi (2-4 đội). Áp dụng cho tất cả các game.</p>
            <div className="flex gap-3">
              {[2, 3, 4].map(n => (
                <button key={n} onClick={() => setGameSettings(prev => ({...prev, teamCount: n}))}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg border-2 transition-all
                    ${(gameSettings.teamCount || 2) === n 
                      ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-md scale-105'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  {n} đội
                </button>
              ))}
            </div>
            {/* Preview đội chơi với màu sắc */}
            <div className="flex gap-2 mt-4">
              {DEFAULT_TEAM_CONFIGS.slice(0, gameSettings.teamCount || 2).map(team => (
                <div key={team.id} className="flex-1 p-3 rounded-xl text-center text-white font-bold text-sm shadow-md transition-all"
                  style={{ backgroundColor: team.color }}>
                  {team.name}
                </div>
              ))}
            </div>
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

      {/* AI File Preview Modal */}
      {showAiFilePreview && aiFileParsedQuestions.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Bot size={22} className="text-purple-600" /> Kết quả phân tích AI
              </h2>
              <button onClick={() => { setShowAiFilePreview(false); setAiFileParsedQuestions([]); }} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4 bg-purple-50 p-3 rounded-xl">
              AI đã tìm thấy <span className="font-bold text-purple-700">{aiFileParsedQuestions.length}</span> câu hỏi. Vui lòng xem lại trước khi thêm vào kho.
            </p>
            <div className="space-y-3 mb-6">
              {aiFileParsedQuestions.map((q, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-lg">Câu {i+1}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${q.difficulty === 'easy' ? 'bg-green-100 text-green-700' : q.difficulty === 'hard' ? 'bg-orange-100 text-orange-700' : q.difficulty === 'super_hard' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : q.difficulty === 'super_hard' ? 'Siêu khó' : 'TB'}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-800 mb-2"><MathContent html={q.text} /></p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options.map((opt, j) => (
                      <div key={j} className={`text-sm py-1.5 px-3 rounded-lg ${j === q.answer ? 'bg-green-100 text-green-800 font-bold border border-green-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
                        <span className="font-bold mr-1">{String.fromCharCode(65 + j)}.</span> <MathContent html={opt} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 sticky bottom-0 bg-white pt-3 border-t">
              <button onClick={handleConfirmAiQuestions} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-indigo-600 flex items-center justify-center gap-2 shadow-lg">
                <Check size={18} /> Thêm {aiFileParsedQuestions.length} câu vào kho
              </button>
              <button onClick={() => { setShowAiFilePreview(false); setAiFileParsedQuestions([]); }} className="px-6 py-3 bg-gray-200 font-bold rounded-xl">Hủy</button>
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

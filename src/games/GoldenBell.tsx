import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '../types';
import { Bell, Users, Eye, ArrowRight, Download, Maximize } from 'lucide-react';

export default function GoldenBell({ questions, onReplay }: { questions: Question[], onReplay?: () => void }) {
  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center">Không có câu hỏi nào để chơi.</div>;
  }

  const [current, setCurrent] = useState(0);
  const [students, setStudents] = useState(30);
  const [initialStudents, setInitialStudents] = useState(30);
  const [step, setStep] = useState<'hidden'|'question'|'options'|'answer'>('hidden');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameLog, setGameLog] = useState<{q: string, remaining: number}[]>([]);

  const q = questions[current];
  const totalQ = questions.length;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleNextStep = useCallback(() => {
    if (current >= totalQ) return;
    
    if (step === 'hidden') setStep('question');
    else if (step === 'question') setStep('options');
    else if (step === 'options') {
      setStep('answer');
      setGameLog(prev => [...prev, { q: q.text, remaining: students }]);
    }
    else if (step === 'answer') {
      if (current + 1 < totalQ) {
        setCurrent(p => p + 1);
        setStep('hidden');
      } else {
        setCurrent(p => p + 1); // trigger end state
      }
    }
  }, [step, current, totalQ, q, students]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleNextStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextStep]);

  const exportLog = () => {
    const logData = {
      date: new Date().toISOString(),
      initialStudents,
      finalStudents: students,
      questions: gameLog
    };
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rung-chuong-vang-log-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (current >= totalQ) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-yellow-50">
        <Bell size={100} className="text-yellow-500 mb-8 animate-bounce" />
        <h2 className="text-5xl font-bold text-yellow-600 mb-4">HOÀN THÀNH BÀI HỌC!</h2>
        <p className="text-3xl text-gray-700 mb-8">Còn lại {students} / {initialStudents} học sinh trên sàn thi đấu</p>
        <button onClick={exportLog} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-700 flex items-center gap-3 shadow-lg hover:scale-105 transition-all">
          <Download size={24} /> Xuất báo cáo (JSON)
        </button>
        {onReplay && (
          <button onClick={onReplay} className="mt-4 px-8 py-4 bg-yellow-500 text-white rounded-2xl font-bold text-xl hover:bg-yellow-600 flex items-center gap-3 shadow-lg hover:scale-105 transition-all">
            🔄 Chơi lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col items-center justify-center bg-yellow-50 relative">
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm flex items-center gap-4 border-2 border-yellow-200">
          <div className="text-yellow-600 font-bold text-lg">Tiến độ bài học:</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-gray-800">{current + 1}</span>
            <span className="text-gray-400 text-xl">/</span>
            <span className="text-xl font-bold text-gray-500">{totalQ}</span>
          </div>
          <div className="w-32 h-3 bg-gray-100 rounded-full ml-4 overflow-hidden">
            <div className="h-full bg-yellow-400 transition-all duration-500" style={{width: `${((current)/totalQ)*100}%`}}></div>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={toggleFullscreen} className="bg-white p-4 rounded-2xl shadow-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors">
            <Maximize size={24} />
          </button>
          <div className="bg-white p-3 rounded-2xl shadow-sm flex items-center gap-4 text-2xl font-bold text-yellow-600 border-2 border-yellow-200">
            <Users size={28} /> Còn lại: 
            <button onClick={()=>setStudents(p=>Math.max(0,p-1))} className="w-10 h-10 bg-yellow-50 text-yellow-700 rounded-full hover:bg-yellow-100 flex items-center justify-center">-</button>
            <span className="w-12 text-center text-3xl font-black text-gray-800">{students}</span>
            <button onClick={()=>{setStudents(p=>p+1); setInitialStudents(p=>Math.max(p, students+1));}} className="w-10 h-10 bg-yellow-50 text-yellow-700 rounded-full hover:bg-yellow-100 flex items-center justify-center">+</button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl p-12 text-center min-h-[450px] flex flex-col justify-center relative border-8 border-yellow-100 mt-16">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gradient-to-b from-yellow-300 to-yellow-500 text-white p-6 rounded-full shadow-xl border-8 border-white">
          <Bell size={56} className={step === 'answer' ? 'animate-[shake_0.5s_ease-in-out_infinite]' : ''} />
        </div>

        {step === 'hidden' ? (
          <div className="flex flex-col items-center">
            <h2 className="text-5xl font-black text-gray-300 tracking-widest uppercase mb-6">Sẵn sàng</h2>
            <p className="text-gray-400 text-xl">Nhấn Space hoặc Enter để bắt đầu</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {q.image && <img src={q.image} className="h-48 object-contain mx-auto mb-8 rounded-xl" />}
            <h2 className="text-4xl font-bold mb-12 leading-relaxed text-gray-800" dangerouslySetInnerHTML={{ __html: q?.text || '' }}></h2>
            
            {step !== 'question' && (
              <div className="grid grid-cols-2 gap-6">
                {q?.options.map((opt, i) => (
                  <div key={i} className={`p-6 rounded-2xl text-2xl font-bold transition-all duration-500 flex items-center gap-4 text-left
                    ${step === 'answer' && i === q.answer ? 'bg-green-500 text-white scale-105 shadow-xl border-4 border-green-400' : 
                      step === 'answer' ? 'bg-gray-100 text-gray-400 border-4 border-transparent opacity-50' : 
                      'bg-blue-50 text-blue-800 border-4 border-blue-100'}`}>
                    <span className={`w-12 h-12 flex items-center justify-center rounded-full text-xl font-black
                      ${step === 'answer' && i === q.answer ? 'bg-green-600 text-white' : 
                        step === 'answer' ? 'bg-gray-200 text-gray-500' : 
                        'bg-blue-200 text-blue-700'}`}>
                      {['A', 'B', 'C', 'D'][i]}
                    </span>
                    <span className="flex-1" dangerouslySetInnerHTML={{ __html: opt }}></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-12 flex gap-4">
        {step === 'hidden' && <button onClick={handleNextStep} className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-2xl hover:bg-blue-700 flex items-center gap-3 shadow-lg hover:scale-105 transition-all"><Eye size={28}/> Hiện câu hỏi</button>}
        {step === 'question' && <button onClick={handleNextStep} className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-2xl hover:bg-blue-700 flex items-center gap-3 shadow-lg hover:scale-105 transition-all"><Eye size={28}/> Hiện đáp án</button>}
        {step === 'options' && <button onClick={handleNextStep} className="px-10 py-5 bg-green-600 text-white rounded-2xl font-bold text-2xl hover:bg-green-700 flex items-center gap-3 shadow-lg hover:scale-105 transition-all"><Bell size={28}/> Lộ kết quả</button>}
        {step === 'answer' && <button onClick={handleNextStep} className="px-10 py-5 bg-gray-800 text-white rounded-2xl font-bold text-2xl hover:bg-gray-900 flex items-center gap-3 shadow-lg hover:scale-105 transition-all">Câu tiếp theo <ArrowRight size={28}/></button>}
      </div>
      
      <div className="absolute bottom-6 text-gray-400 font-medium">
        Mẹo: Sử dụng phím <kbd className="bg-gray-200 px-2 py-1 rounded text-gray-600">Space</kbd> hoặc <kbd className="bg-gray-200 px-2 py-1 rounded text-gray-600">Enter</kbd> để điều khiển
      </div>
    </div>
  );
}

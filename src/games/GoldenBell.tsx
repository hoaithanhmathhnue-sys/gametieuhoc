import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Question } from '../types';
import { Bell, Users, Eye, ArrowRight, Download, Maximize, Sparkles, ChevronRight } from 'lucide-react';
import { MathContent } from '../MathContent';

const ANSWER_COLORS = [
  { bg: 'bg-indigo-50', border: 'border-indigo-200', active: 'bg-indigo-100 border-indigo-400', badge: 'bg-gradient-to-br from-indigo-500 to-blue-600', text: 'text-indigo-800', correct: 'from-indigo-500 to-blue-600' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', active: 'bg-emerald-100 border-emerald-400', badge: 'bg-gradient-to-br from-emerald-500 to-green-600', text: 'text-emerald-800', correct: 'from-emerald-500 to-green-600' },
  { bg: 'bg-amber-50', border: 'border-amber-200', active: 'bg-amber-100 border-amber-400', badge: 'bg-gradient-to-br from-amber-500 to-orange-600', text: 'text-amber-800', correct: 'from-amber-500 to-orange-600' },
  { bg: 'bg-rose-50', border: 'border-rose-200', active: 'bg-rose-100 border-rose-400', badge: 'bg-gradient-to-br from-rose-500 to-red-600', text: 'text-rose-800', correct: 'from-rose-500 to-red-600' },
];

export default function GoldenBell({ questions, onReplay, onGameEnd }: { questions: Question[], onReplay?: () => void, onGameEnd?: (score: number, correct: number, total: number) => void }) {
  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center">Không có câu hỏi nào để chơi.</div>;
  }

  const [current, setCurrent] = useState(0);
  const [students, setStudents] = useState(30);
  const [initialStudents, setInitialStudents] = useState(30);
  const [step, setStep] = useState<'hidden'|'question'|'options'|'answer'>('hidden');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameLog, setGameLog] = useState<{q: string, remaining: number}[]>([]);
  const gameEndedRef = useRef(false);

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
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
        setCurrent(p => p + 1);
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
    if (onGameEnd && !gameEndedRef.current) {
      gameEndedRef.current = true;
      onGameEnd(students * 10, students, initialStudents);
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 30%, #d97706 60%, #b45309 100%)' }}>
        <Bell size={100} className="text-white mb-8 drop-shadow-2xl animate-bounce" />
        <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">🎉 HOÀN THÀNH BÀI HỌC!</h2>
        <p className="text-3xl text-white/90 mb-8">Còn lại <span className="font-black text-yellow-200">{students}</span> / {initialStudents} học sinh trên sàn thi đấu</p>
        <div className="flex gap-4">
          <button onClick={exportLog} className="px-8 py-4 bg-white/90 text-amber-800 rounded-2xl font-bold text-xl hover:bg-white flex items-center gap-3 shadow-lg hover:scale-105 transition-all backdrop-blur">
            <Download size={24} /> Xuất báo cáo
          </button>
          {onReplay && (
            <button onClick={onReplay} className="px-8 py-4 bg-amber-800 text-white rounded-2xl font-bold text-xl hover:bg-amber-900 flex items-center gap-3 shadow-lg hover:scale-105 transition-all">
              🔄 Chơi lại
            </button>
          )}
        </div>
      </div>
    );
  }

  const progress = ((current) / totalQ) * 100;

  return (
    <div className="p-4 md:p-8 h-full flex flex-col items-center relative overflow-hidden" 
      style={{ background: 'linear-gradient(160deg, #fef3c7 0%, #fde68a 25%, #fcd34d 50%, #fbbf24 75%, #fde68a 100%)' }}>
      
      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-300/20 to-yellow-400/20 rounded-full -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-amber-300/20 to-yellow-200/20 rounded-full translate-y-1/3 -translate-x-1/3" />

      {/* Top Bar */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-4 md:mb-6 relative z-10">
        {/* Progress */}
        <div className="bg-white/90 backdrop-blur px-4 md:px-6 py-2 md:py-3 rounded-2xl shadow-md flex items-center gap-3 md:gap-4 border border-amber-200">
          <div className="text-amber-700 font-bold text-sm md:text-base">Tiến độ:</div>
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-black text-gray-800">{current + 1}</span>
            <span className="text-gray-400">/</span>
            <span className="text-base md:text-lg font-bold text-gray-500">{totalQ}</span>
          </div>
          <div className="w-20 md:w-32 h-2.5 bg-amber-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 rounded-full" style={{width: `${progress}%`}} />
          </div>
        </div>

        <div className="flex gap-2 md:gap-4">
          <button onClick={toggleFullscreen} className="bg-white/90 backdrop-blur p-2.5 md:p-3 rounded-xl shadow-md border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors">
            <Maximize size={20} />
          </button>
          <div className="bg-white/90 backdrop-blur p-2 md:p-3 rounded-xl shadow-md flex items-center gap-2 md:gap-3 text-base md:text-xl font-bold text-amber-700 border border-amber-200">
            <Users size={20} />
            <span className="hidden md:inline">Còn lại:</span>
            <button onClick={()=>setStudents(p=>Math.max(0,p-1))} className="w-8 h-8 md:w-9 md:h-9 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center justify-center font-black transition-colors">-</button>
            <span className="w-8 md:w-10 text-center text-xl md:text-2xl font-black text-gray-800">{students}</span>
            <button onClick={()=>{setStudents(p=>p+1); setInitialStudents(p=>Math.max(p, students+1));}} className="w-8 h-8 md:w-9 md:h-9 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center justify-center font-black transition-colors">+</button>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-5xl flex-1 bg-white/95 backdrop-blur rounded-[2rem] shadow-2xl p-8 md:p-12 text-center flex flex-col justify-center relative border-2 border-amber-200/50 z-10">
        {/* Bell Icon */}
        <div className="absolute -top-12 md:-top-14 left-1/2 -translate-x-1/2">
          <div className="bg-gradient-to-b from-amber-400 via-yellow-500 to-orange-500 text-white p-4 md:p-5 rounded-full shadow-xl shadow-amber-500/40 border-4 border-white">
            <Bell size={40} className={step === 'answer' ? 'animate-[shake_0.5s_ease-in-out_infinite]' : ''} />
          </div>
        </div>

        {step === 'hidden' ? (
          <div className="flex flex-col items-center py-8">
            <Sparkles size={48} className="text-amber-300 mb-4 animate-pulse" />
            <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent tracking-widest uppercase mb-4">Sẵn sàng</h2>
            <p className="text-gray-400 text-lg md:text-xl">Nhấn <kbd className="bg-amber-100 px-3 py-1 rounded-lg text-amber-700 font-bold mx-1 border border-amber-200">Space</kbd> hoặc <kbd className="bg-amber-100 px-3 py-1 rounded-lg text-amber-700 font-bold mx-1 border border-amber-200">Enter</kbd> để bắt đầu</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500 mt-4">
            {q.image && <img src={q.image} className="h-36 md:h-48 object-contain mx-auto mb-6 md:mb-8 rounded-xl shadow-md" />}
            <MathContent html={q?.text || ''} tag="h2" className="text-2xl md:text-4xl font-bold mb-8 md:mb-12 leading-relaxed text-gray-800" />
            
            {step !== 'question' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {q?.options.map((opt, i) => {
                  const color = ANSWER_COLORS[i];
                  return (
                    <div key={i} className={`p-4 md:p-6 rounded-2xl text-lg md:text-2xl font-bold transition-all duration-500 flex items-center gap-3 md:gap-4 text-left border-2
                      ${step === 'answer' && i === q.answer 
                        ? `bg-gradient-to-r ${color.correct} text-white border-transparent scale-105 shadow-xl` 
                        : step === 'answer' 
                          ? 'bg-gray-50 text-gray-400 border-gray-100 opacity-50' 
                          : `${color.bg} ${color.text} ${color.border}`}`}>
                      <span className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full text-lg md:text-xl font-black shrink-0 shadow-md
                        ${step === 'answer' && i === q.answer ? 'bg-white/30 text-white' : 
                          step === 'answer' ? 'bg-gray-200 text-gray-500' : 
                          `${color.badge} text-white`}`}>
                        {['A', 'B', 'C', 'D'][i]}
                      </span>
                      <span className="flex-1"><MathContent html={opt} /></span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons - INSIDE main flow, not absolute bottom */}
      <div className="mt-4 md:mt-6 flex flex-col items-center gap-2 relative z-10">
        <div className="flex gap-3">
          {step === 'hidden' && (
            <button onClick={handleNextStep} className="px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold text-lg md:text-xl hover:from-indigo-600 hover:to-purple-700 flex items-center gap-3 shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all">
              <Eye size={24}/> Hiện câu hỏi
            </button>
          )}
          {step === 'question' && (
            <button onClick={handleNextStep} className="px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold text-lg md:text-xl hover:from-blue-600 hover:to-indigo-700 flex items-center gap-3 shadow-lg shadow-blue-500/30 hover:scale-105 transition-all">
              <Eye size={24}/> Hiện đáp án
            </button>
          )}
          {step === 'options' && (
            <button onClick={handleNextStep} className="px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-2xl font-bold text-lg md:text-xl hover:from-emerald-600 hover:to-green-700 flex items-center gap-3 shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all">
              <Bell size={24}/> Lộ kết quả
            </button>
          )}
          {step === 'answer' && (
            <button onClick={handleNextStep} className="px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-2xl font-bold text-lg md:text-xl hover:from-gray-800 hover:to-black flex items-center gap-3 shadow-lg shadow-gray-500/30 hover:scale-105 transition-all">
              Câu tiếp theo <ChevronRight size={24}/>
            </button>
          )}
        </div>
        <p className="text-amber-700/60 text-xs md:text-sm font-medium">
          Phím tắt: <kbd className="bg-white/60 px-1.5 py-0.5 rounded text-amber-800 text-xs">Space</kbd> · <kbd className="bg-white/60 px-1.5 py-0.5 rounded text-amber-800 text-xs">Enter</kbd>
        </p>
      </div>
    </div>
  );
}

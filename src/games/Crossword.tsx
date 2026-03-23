import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../types';
import { playDing, playBuzz, playBell, playTick } from '../utils/audio';
import { Bell, Lightbulb, Clock, Sparkles, Star } from 'lucide-react';

const ROW_COLORS = [
  { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', badge: 'bg-rose-500' },
  { bg: 'from-orange-500 to-amber-600', light: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', badge: 'bg-orange-500' },
  { bg: 'from-yellow-500 to-amber-500', light: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', badge: 'bg-yellow-500' },
  { bg: 'from-emerald-500 to-green-600', light: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', badge: 'bg-emerald-500' },
  { bg: 'from-teal-500 to-cyan-600', light: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-700', badge: 'bg-teal-500' },
  { bg: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', badge: 'bg-blue-500' },
  { bg: 'from-violet-500 to-purple-600', light: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', badge: 'bg-violet-500' },
  { bg: 'from-fuchsia-500 to-pink-600', light: 'bg-fuchsia-50', border: 'border-fuchsia-300', text: 'text-fuchsia-700', badge: 'bg-fuchsia-500' },
];

export default function Crossword({ questions, onReplay }: { questions: Question[], onReplay?: () => void }) {
  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center">Không có câu hỏi nào để chơi.</div>;
  }

  const [grid, setGrid] = useState(() => {
    const selectedQs = questions.slice(0, 8);
    let maxLen = 0;
    const words = selectedQs.map(q => {
      const word = q.options[q.answer].replace(/\s/g, '').toUpperCase();
      if (word.length > maxLen) maxLen = word.length;
      return {
        hint: q.text,
        word: word,
        solved: false,
        revealedChars: [] as number[]
      };
    });
    
    const alignedWords = words.map(w => {
      const midIdx = Math.floor(w.word.length / 2);
      const offset = maxLen - midIdx;
      return { ...w, offset, midIdx };
    });
    
    return alignedWords;
  });

  const [activeW, setActiveW] = useState<number | null>(null);
  const [score, setScore] = useState([0, 0]);
  const [turn, setTurn] = useState(0);
  
  const [buzzedTeam, setBuzzedTeam] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(p => p - 1);
        if (timeLeft <= 5) playTick();
      }, 1000);
    } else if (isTimerRunning && timeLeft === 0) {
      playBuzz();
      setIsTimerRunning(false);
      setBuzzedTeam(null);
      setTurn(p => (p + 1) % 2);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerRunning, timeLeft]);

  const handleBuzz = (teamIdx: number) => {
    if (activeW === null || buzzedTeam !== null) return;
    playBell();
    setBuzzedTeam(teamIdx);
    setTurn(teamIdx);
    setTimeLeft(15);
    setIsTimerRunning(true);
  };

  const handleSolve = (ans: string) => {
    if (activeW === null || buzzedTeam === null) return;
    setIsTimerRunning(false);
    
    const normalizedAns = ans.replace(/\s/g, '').toUpperCase();
    if (normalizedAns === grid[activeW].word) {
      playDing();
      const ng = [...grid]; 
      ng[activeW].solved = true; 
      setGrid(ng);
      const ns = [...score]; 
      ns[buzzedTeam] += 100; 
      setScore(ns);
      setActiveW(null);
    } else {
      playBuzz();
      const ns = [...score];
      ns[buzzedTeam] -= 20;
      setScore(ns);
    }
    setBuzzedTeam(null);
  };

  const useHint = () => {
    if (activeW === null || buzzedTeam === null) return;
    if (score[buzzedTeam] < 50) {
      alert("Không đủ điểm để dùng gợi ý (cần 50 điểm)!");
      return;
    }
    
    const wordObj = grid[activeW];
    const unrevealed = wordObj.word.split('').map((_, i) => i).filter(i => !wordObj.revealedChars.includes(i));
    
    if (unrevealed.length > 0) {
      const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      const ng = grid.map((w, i) => 
        i === activeW 
          ? { ...w, revealedChars: [...w.revealedChars, randomIdx] }
          : w
      );
      setGrid(ng);
      const ns = [...score];
      ns[buzzedTeam] -= 50;
      setScore(ns);
    }
  };

  // Render content with MathJax support
  const renderContent = (text: string) => {
    if (!text) return null;
    const hasLatex = text.includes('\\(') || text.includes('\\[') || text.includes('$');
    if (hasLatex) {
      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    }
    return <span>{text}</span>;
  };

  const isGameOver = grid.every(w => w.solved);
  const solvedCount = grid.filter(w => w.solved).length;

  if (isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>
        <div className="text-6xl mb-4" style={{ animation: 'wiggle 1s ease-in-out infinite' }}>🏆</div>
        <h2 className="text-4xl font-bold text-white mb-8 drop-shadow-lg">GIẢI MÃ THÀNH CÔNG!</h2>
        <div className="flex gap-12">
          <div className={`p-8 rounded-3xl backdrop-blur-md transition-all ${score[0] > score[1] ? 'bg-yellow-400/90 text-yellow-900 scale-110 shadow-2xl ring-4 ring-yellow-300' : 'bg-white/20 text-white'}`}>
            <h3 className="text-2xl font-bold mb-2">🏆 Đội 1</h3>
            <p className="text-5xl font-black">{score[0]}</p>
          </div>
          <div className={`p-8 rounded-3xl backdrop-blur-md transition-all ${score[1] > score[0] ? 'bg-yellow-400/90 text-yellow-900 scale-110 shadow-2xl ring-4 ring-yellow-300' : 'bg-white/20 text-white'}`}>
            <h3 className="text-2xl font-bold mb-2">🏆 Đội 2</h3>
            <p className="text-5xl font-black">{score[1]}</p>
          </div>
        </div>
        {onReplay && (
          <button onClick={onReplay} className="mt-8 px-8 py-3 bg-white text-purple-700 font-bold text-lg rounded-xl hover:bg-yellow-100 transition-colors shadow-lg">
            🔄 Chơi lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-full flex flex-col items-center" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 30%, #ddd6fe 60%, #ede9fe 100%)' }}>
      {/* Score Board & Buzzers */}
      <div className="flex justify-between w-full max-w-6xl mb-6">
        {/* Team 1 */}
        <div className={`p-4 md:p-6 rounded-3xl flex flex-col items-center transition-all duration-300 w-40 md:w-48 shadow-lg
          ${buzzedTeam === 0 ? 'text-white shadow-[0_0_40px_rgba(99,102,241,0.6)] scale-110 ring-4 ring-white/50' : 
            'bg-white/80 text-gray-600 backdrop-blur'}`}
          style={buzzedTeam === 0 ? { background: 'linear-gradient(135deg, #667EEA, #764BA2)' } : {}}>
          <span className="text-sm font-bold uppercase tracking-wider opacity-80">⚡ Đội 1</span>
          <span className="text-3xl md:text-4xl font-black mb-3">{score[0]}</span>
          <button 
            onClick={() => handleBuzz(0)}
            disabled={activeW === null || buzzedTeam !== null}
            className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg transition-all
              ${activeW !== null && buzzedTeam === null 
                ? 'bg-gradient-to-b from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 hover:scale-110 cursor-pointer active:scale-95 animate-pulse shadow-red-500/50' 
                : 'bg-gray-300 cursor-not-allowed opacity-50'}`}
          >
            <Bell size={28} className="text-white" />
          </button>
        </div>

        {/* Center Title */}
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-2xl md:text-4xl font-black tracking-tight uppercase bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            ✨ Ô Chữ Bí Mật ✨
          </h1>
          
          {/* Progress */}
          <div className="flex gap-1 mt-2">
            {grid.map((w, i) => (
              <div key={i} className={`w-4 h-4 rounded-full transition-all ${w.solved ? 'bg-gradient-to-r from-green-400 to-emerald-500 scale-110 shadow-sm' : 'bg-gray-300'}`}></div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">{solvedCount}/{grid.length} hàng đã giải</p>
          
          {buzzedTeam !== null && (
            <div className="flex flex-col items-center mt-3">
              <div className={`text-lg md:text-2xl font-bold px-6 py-2 rounded-full text-white shadow-lg ${buzzedTeam === 0 ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gradient-to-r from-pink-500 to-rose-600'}`}>
                Đội {buzzedTeam + 1} trả lời!
              </div>
              <div className={`flex items-center gap-2 text-3xl md:text-4xl font-black mt-2 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
                <Clock size={32} /> 00:{timeLeft.toString().padStart(2, '0')}
              </div>
            </div>
          )}
        </div>

        {/* Team 2 */}
        <div className={`p-4 md:p-6 rounded-3xl flex flex-col items-center transition-all duration-300 w-40 md:w-48 shadow-lg
          ${buzzedTeam === 1 ? 'text-white shadow-[0_0_40px_rgba(236,72,153,0.6)] scale-110 ring-4 ring-white/50' : 
            'bg-white/80 text-gray-600 backdrop-blur'}`}
          style={buzzedTeam === 1 ? { background: 'linear-gradient(135deg, #FC5C7D, #6A82FB)' } : {}}>
          <span className="text-sm font-bold uppercase tracking-wider opacity-80">⚡ Đội 2</span>
          <span className="text-3xl md:text-4xl font-black mb-3">{score[1]}</span>
          <button 
            onClick={() => handleBuzz(1)}
            disabled={activeW === null || buzzedTeam !== null}
            className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-lg transition-all
              ${activeW !== null && buzzedTeam === null 
                ? 'bg-gradient-to-b from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 hover:scale-110 cursor-pointer active:scale-95 animate-pulse shadow-blue-500/50' 
                : 'bg-gray-300 cursor-not-allowed opacity-50'}`}
          >
            <Bell size={28} className="text-white" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl flex-1">
        {/* Grid */}
        <div className="flex-1 bg-white/80 backdrop-blur p-4 md:p-8 rounded-3xl shadow-xl overflow-x-auto border border-white/50">
          <div className="flex flex-col gap-2 min-w-max">
            {grid.map((w, i) => {
              const color = ROW_COLORS[i % ROW_COLORS.length];
              return (
                <div key={i} className={`flex items-center relative transition-all ${activeW === i ? 'scale-[1.01]' : ''}`}>
                  <div className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-bold text-white ${color.badge} rounded-full mr-3 md:mr-4 shrink-0 shadow-md text-sm md:text-base`}>
                    {i+1}
                  </div>
                  
                  <div className="flex relative" style={{ marginLeft: `${w.offset * 2.5}rem` }}>
                    {w.word.split('').map((char, j) => {
                      const isMiddle = j === w.midIdx;
                      const isRevealed = w.solved || w.revealedChars.includes(j);
                      
                      return (
                        <div key={j} className={`w-10 h-10 md:w-12 md:h-12 border-2 flex items-center justify-center font-bold text-xl md:text-2xl rounded-lg transition-all duration-500 mx-[1px] md:mx-[2px]
                          ${isMiddle && !w.solved ? `border-yellow-400 bg-yellow-50 shadow-[inset_0_0_10px_rgba(250,204,21,0.3)] ring-2 ring-yellow-300` : !w.solved ? `${color.border} ${color.light}` : ''}
                          ${w.solved ? `bg-gradient-to-br ${color.bg} text-white border-transparent shadow-md` : ''}
                          ${activeW === i && !w.solved ? 'shadow-[0_0_12px_rgba(99,102,241,0.4)] scale-105' : ''}
                        `}>
                          <span className={`transition-all duration-300 ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                            {char}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Keyword column indicator */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <Star size={16} className="text-yellow-500" />
            <span className="text-gray-500 font-medium">Ô vàng = Từ khóa bí mật</span>
            <Star size={16} className="text-yellow-500" />
          </div>
        </div>

        {/* Hints Panel */}
        <div className="w-full lg:w-[380px] bg-white/80 backdrop-blur p-4 md:p-6 rounded-3xl shadow-xl h-fit flex flex-col border border-white/50">
          <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent uppercase tracking-wide border-b-2 border-indigo-100 pb-3 flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-500" /> Gợi ý hàng ngang
          </h3>
          
          <div className="space-y-2 md:space-y-3 mb-6 md:mb-8 max-h-[350px] overflow-y-auto pr-2">
            {grid.map((w, i) => {
              const color = ROW_COLORS[i % ROW_COLORS.length];
              return (
                <button 
                  key={i} 
                  onClick={() => {
                    if (!w.solved && buzzedTeam === null) {
                      setActiveW(i);
                    }
                  }} 
                  disabled={w.solved || buzzedTeam !== null}
                  className={`w-full text-left p-3 md:p-4 rounded-2xl text-sm md:text-base transition-all duration-300 border-2
                    ${w.solved ? 'bg-gray-50 text-gray-400 border-gray-100 opacity-60 line-through' : 
                      activeW === i ? `${color.light} ${color.text} font-bold ${color.border} shadow-md scale-[1.02]` : 
                      'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-sm'}`}
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full mr-2 md:mr-3 text-xs md:text-sm font-bold
                    ${w.solved ? 'bg-gray-200 text-gray-500' : activeW === i ? `${color.badge} text-white` : 'bg-indigo-100 text-indigo-600'}`}>
                    {i+1}
                  </span> 
                  {renderContent(w.hint)}
                </button>
              );
            })}
          </div>

          {activeW !== null && buzzedTeam !== null && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 md:p-6 rounded-2xl border-2 border-indigo-200 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <p className="font-bold text-indigo-800 text-base md:text-lg">Trả lời hàng {activeW + 1}:</p>
                <button 
                  onClick={useHint}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-700 hover:from-yellow-200 hover:to-amber-200 rounded-lg font-bold text-xs md:text-sm transition-colors border border-yellow-300 shadow-sm"
                  title="Mở 1 chữ cái (-50 điểm)"
                >
                  <Lightbulb size={16} /> Gợi ý (-50đ)
                </button>
              </div>
              
              <input 
                type="text" 
                className="w-full p-3 md:p-4 border-2 border-indigo-300 rounded-xl mb-3 uppercase font-black text-xl md:text-2xl tracking-widest text-center focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 shadow-sm transition-all bg-white" 
                onKeyDown={e => { if(e.key === 'Enter') handleSolve(e.currentTarget.value) }} 
                autoFocus 
                placeholder="NHẬP ĐÁP ÁN" 
              />
              <p className="text-xs md:text-sm text-indigo-500 text-center font-medium bg-white/50 py-2 rounded-lg">
                Nhấn <kbd className="bg-white px-2 py-1 rounded shadow-sm border border-indigo-100 font-mono">Enter</kbd> để gửi
              </p>
            </div>
          )}
          
          {activeW !== null && buzzedTeam === null && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-2xl border-2 border-yellow-200 text-center shadow-sm">
              <p className="text-yellow-800 font-bold flex items-center justify-center gap-2">
                <Bell size={18} className="animate-bounce" /> Nhấn chuông để giành quyền trả lời!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

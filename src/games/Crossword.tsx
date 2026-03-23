import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../types';
import { playDing, playBuzz, playBell, playTick } from '../utils/audio';
import { Bell, Lightbulb, Clock } from 'lucide-react';

export default function Crossword({ questions, onReplay }: { questions: Question[], onReplay?: () => void }) {
  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center">Không có câu hỏi nào để chơi.</div>;
  }

  // Generate grid
  const [grid, setGrid] = useState(() => {
    const selectedQs = questions.slice(0, 8);
    // Find max length to align
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
    
    // Calculate offset to center align based on the middle character of each word
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
  
  // Buzzer and Timer state
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
      // Time's up
      playBuzz();
      setIsTimerRunning(false);
      setBuzzedTeam(null);
      // Switch turn if no one answered
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
    setTurn(teamIdx); // The team that buzzed gets the turn
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
      // Wrong answer, other team can buzz now
      const ns = [...score];
      ns[buzzedTeam] -= 20; // Penalty for wrong answer
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

  const isGameOver = grid.every(w => w.solved);

  if (isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-indigo-50">
        <h1 className="text-6xl mb-4">🏆</h1>
        <h2 className="text-4xl font-bold text-indigo-600 mb-8">GIẢI MÃ THÀNH CÔNG!</h2>
        <div className="flex gap-12">
          <div className={`p-8 rounded-3xl ${score[0] > score[1] ? 'bg-blue-500 text-white scale-110 shadow-2xl' : 'bg-white text-gray-500'}`}>
            <h3 className="text-2xl font-bold mb-2">Đội 1</h3>
            <p className="text-5xl font-black">{score[0]}</p>
          </div>
          <div className={`p-8 rounded-3xl ${score[1] > score[0] ? 'bg-red-500 text-white scale-110 shadow-2xl' : 'bg-white text-gray-500'}`}>
            <h3 className="text-2xl font-bold mb-2">Đội 2</h3>
            <p className="text-5xl font-black">{score[1]}</p>
          </div>
        </div>
        {onReplay && (
          <button onClick={onReplay} className="mt-8 px-8 py-3 bg-indigo-600 text-white font-bold text-lg rounded-xl hover:bg-indigo-700 transition-colors">
            🔄 Chơi lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col items-center bg-indigo-50">
      {/* Score Board & Buzzers */}
      <div className="flex justify-between w-full max-w-6xl mb-8">
        <div className={`p-6 rounded-3xl flex flex-col items-center transition-all duration-300 w-48
          ${buzzedTeam === 0 ? 'bg-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.8)] scale-110 border-4 border-white' : 
            'bg-white text-gray-600 shadow-md border-4 border-transparent'}`}>
          <span className="text-lg font-bold uppercase tracking-wider opacity-80">Đội 1</span>
          <span className="text-4xl font-black mb-4">{score[0]}</span>
          <button 
            onClick={() => handleBuzz(0)}
            disabled={activeW === null || buzzedTeam !== null}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all
              ${activeW !== null && buzzedTeam === null ? 'bg-red-500 hover:bg-red-600 hover:scale-105 cursor-pointer active:scale-95' : 'bg-gray-300 cursor-not-allowed opacity-50'}`}
          >
            <Bell size={32} className="text-white" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center">
          <h1 className="text-4xl font-black text-indigo-600 tracking-tight uppercase mb-2">Ô chữ bí mật</h1>
          {buzzedTeam !== null && (
            <div className="flex flex-col items-center animate-in zoom-in">
              <div className={`text-2xl font-bold px-6 py-2 rounded-full mb-4 text-white ${buzzedTeam === 0 ? 'bg-blue-500' : 'bg-red-500'}`}>
                Đội {buzzedTeam + 1} trả lời!
              </div>
              <div className={`flex items-center gap-2 text-4xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>
                <Clock size={36} /> 00:{timeLeft.toString().padStart(2, '0')}
              </div>
            </div>
          )}
        </div>

        <div className={`p-6 rounded-3xl flex flex-col items-center transition-all duration-300 w-48
          ${buzzedTeam === 1 ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.8)] scale-110 border-4 border-white' : 
            'bg-white text-gray-600 shadow-md border-4 border-transparent'}`}>
          <span className="text-lg font-bold uppercase tracking-wider opacity-80">Đội 2</span>
          <span className="text-4xl font-black mb-4">{score[1]}</span>
          <button 
            onClick={() => handleBuzz(1)}
            disabled={activeW === null || buzzedTeam !== null}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all
              ${activeW !== null && buzzedTeam === null ? 'bg-blue-500 hover:bg-blue-600 hover:scale-105 cursor-pointer active:scale-95' : 'bg-gray-300 cursor-not-allowed opacity-50'}`}
          >
            <Bell size={32} className="text-white" />
          </button>
        </div>
      </div>

      <div className="flex gap-8 w-full max-w-6xl">
        {/* Grid */}
        <div className="flex-1 bg-white p-8 rounded-3xl shadow-xl overflow-x-auto">
          <div className="flex flex-col gap-2 min-w-max">
            {grid.map((w, i) => (
              <div key={i} className="flex items-center relative">
                <div className="w-10 h-10 flex items-center justify-center font-bold text-indigo-400 bg-indigo-50 rounded-full mr-4 shrink-0">{i+1}</div>
                
                <div className="flex relative" style={{ marginLeft: `${w.offset * 3}rem` }}>
                  {w.word.split('').map((char, j) => {
                    const isMiddle = j === w.midIdx;
                    const isRevealed = w.solved || w.revealedChars.includes(j);
                    
                    return (
                      <div key={j} className={`w-12 h-12 border-2 flex items-center justify-center font-bold text-2xl rounded-lg transition-all duration-500 mx-[2px]
                        ${isMiddle ? 'border-yellow-400 bg-yellow-50 shadow-[inset_0_0_10px_rgba(250,204,21,0.2)]' : 'border-gray-200'}
                        ${w.solved ? 'bg-indigo-500 text-white border-indigo-600 shadow-md' : 'bg-white'}
                        ${activeW === i && !w.solved ? 'border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : ''}
                      `}>
                        <span className={`transition-all duration-300 ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                          {char}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hints Panel */}
        <div className="w-[400px] bg-white p-6 rounded-3xl shadow-xl h-fit flex flex-col">
          <h3 className="text-2xl font-black mb-6 text-indigo-800 uppercase tracking-wide border-b-2 border-indigo-100 pb-4">Gợi ý hàng ngang</h3>
          
          <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {grid.map((w, i) => (
              <button 
                key={i} 
                onClick={() => {
                  if (!w.solved && buzzedTeam === null) {
                    setActiveW(i);
                  }
                }} 
                disabled={w.solved || buzzedTeam !== null}
                className={`w-full text-left p-4 rounded-2xl text-lg transition-all duration-300 border-2
                  ${w.solved ? 'bg-gray-50 text-gray-400 border-gray-100 opacity-60' : 
                    activeW === i ? 'bg-indigo-50 text-indigo-900 font-bold border-indigo-400 shadow-md scale-[1.02]' : 
                    'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'}`}
              >
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 text-sm font-bold
                  ${w.solved ? 'bg-gray-200 text-gray-500' : activeW === i ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                  {i+1}
                </span> 
                {w.hint}
              </button>
            ))}
          </div>

          {activeW !== null && buzzedTeam !== null && (
            <div className="animate-in slide-in-from-bottom-4 bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-200 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <p className="font-bold text-indigo-800 text-lg">Trả lời hàng {activeW + 1}:</p>
                <button 
                  onClick={useHint}
                  className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg font-bold text-sm transition-colors border border-yellow-300"
                  title="Mở 1 chữ cái (-50 điểm)"
                >
                  <Lightbulb size={16} /> Gợi ý (-50đ)
                </button>
              </div>
              
              <input 
                type="text" 
                className="w-full p-4 border-2 border-indigo-300 rounded-xl mb-3 uppercase font-black text-2xl tracking-widest text-center focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 shadow-sm transition-all" 
                onKeyDown={e => { if(e.key === 'Enter') handleSolve(e.currentTarget.value) }} 
                autoFocus 
                placeholder="NHẬP ĐÁP ÁN" 
              />
              <p className="text-sm text-indigo-500 text-center font-medium bg-white/50 py-2 rounded-lg">Nhấn <kbd className="bg-white px-2 py-1 rounded shadow-sm border border-indigo-100">Enter</kbd> để gửi</p>
            </div>
          )}
          
          {activeW !== null && buzzedTeam === null && (
            <div className="animate-in fade-in bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-200 text-center">
              <p className="text-yellow-800 font-bold">Các đội hãy nhấn chuông để giành quyền trả lời!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { Users, SkipForward, MessageCircle, BarChart3, X } from 'lucide-react';
import { playDing, playBuzz, playTick } from '../utils/audio';
import { MathContent } from '../MathContent';

export default function Millionaire({ questions, onReplay }: { questions: Question[], onReplay?: () => void }) {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [status, setStatus] = useState<'playing'|'correct'|'wrong'|'end'>('playing');
  const [usedLifelines, setUsedLifelines] = useState<string[]>([]);
  const [hiddenOpts, setHiddenOpts] = useState<number[]>([]);
  const [friendHint, setFriendHint] = useState<string | null>(null);
  const [audienceChart, setAudienceChart] = useState<number[] | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const q = questions[current];
  const levels = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000];

  useEffect(() => {
    const saved = localStorage.getItem('millionaire_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveHistory = (finalScore: number) => {
    const newHistory = [finalScore, ...history].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('millionaire_history', JSON.stringify(newHistory));
  };

  useEffect(() => {
    if (status !== 'playing') return;
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) {
          setTimeout(() => {
            setStatus('wrong');
            playBuzz();
            setHistory(prev => {
              const newHistory = [score, ...prev].slice(0, 5);
              localStorage.setItem('millionaire_history', JSON.stringify(newHistory));
              return newHistory;
            });
          }, 0);
          return 0;
        }
        if (p <= 10 && p > 1) playTick();
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [status, score]);

  const handleAnswer = (idx: number) => {
    if (status !== 'playing') return;
    if (idx === q.answer) {
      setStatus('correct');
      playDing();
      const newScore = levels[current] || 0;
      setScore(newScore);
      setTimeout(() => {
        if (current + 1 < questions.length && current + 1 < 12) {
          setCurrent(p => p + 1);
          setTimeLeft(30);
          setHiddenOpts([]);
          setFriendHint(null);
          setAudienceChart(null);
          setStatus('playing');
        } else {
          setStatus('end');
          saveHistory(newScore);
        }
      }, 2000);
    } else {
      setStatus('wrong');
      playBuzz();
      saveHistory(score);
    }
  };

  const useLifeline = (type: string) => {
    if (usedLifelines.includes(type)) return;
    setUsedLifelines(p => [...p, type]);
    
    if (type === '5050') {
      const wrong = [0,1,2,3].filter(i => i !== q.answer).sort(() => 0.5 - Math.random()).slice(0, 2);
      setHiddenOpts(wrong);
    } else if (type === 'friend') {
      const hints = [
        `Tớ khá chắc chắn đáp án là ${['A','B','C','D'][q.answer]}!`,
        `Theo tớ nhớ thì là ${['A','B','C','D'][q.answer]} đấy.`,
        `Có vẻ như ${['A','B','C','D'][q.answer]} là câu trả lời đúng.`
      ];
      setFriendHint(hints[Math.floor(Math.random() * hints.length)]);
    } else if (type === 'audience') {
      const chart = [0, 0, 0, 0];
      const correctPercent = Math.floor(Math.random() * 11) + 60;
      chart[q.answer] = correctPercent;
      let remaining = 100 - correctPercent;
      const wrongIndices = [0,1,2,3].filter(i => i !== q.answer);
      wrongIndices.forEach((idx, i) => {
        if (i === 2) chart[idx] = remaining;
        else {
          const p = Math.floor(Math.random() * (remaining + 1));
          chart[idx] = p;
          remaining -= p;
        }
      });
      setAudienceChart(chart);
    }
  };

  const timerColor = timeLeft > 10 ? 'text-green-400' : timeLeft > 5 ? 'text-yellow-400' : 'text-red-500 animate-pulse';



  if (status === 'end' || !q) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gradient-to-b from-blue-900 to-blue-950 text-white">
        <h1 className="text-6xl mb-4">🏆</h1>
        <h2 className="text-4xl font-bold text-yellow-400 mb-4">CHÚC MỪNG!</h2>
        <p className="text-2xl mb-8">Bạn đã giành được {score} điểm</p>
        
        <div className="bg-blue-800 p-6 rounded-2xl w-full max-w-md">
          <h3 className="text-xl font-bold mb-4 border-b border-blue-600 pb-2">Lịch sử 5 trận gần nhất</h3>
          {history.length > 0 ? (
            <ul className="space-y-2">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between items-center bg-blue-900 p-3 rounded-lg">
                  <span>Trận {i + 1}</span>
                  <span className="font-bold text-yellow-400">{h} điểm</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">Chưa có lịch sử</p>
          )}
        </div>
        {onReplay && (
          <button onClick={onReplay} className="mt-6 px-8 py-3 bg-yellow-400 text-blue-900 font-bold text-lg rounded-xl hover:bg-yellow-300 transition-colors">
            🔄 Chơi lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 md:p-8 bg-gradient-to-b from-blue-900 to-blue-950 text-white rounded-3xl m-4 shadow-2xl relative overflow-hidden">
      {/* Top Bar: Question number + Timer */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4">
        <div className="text-xl font-bold text-white/90 bg-white/10 px-4 py-2 rounded-full">
          Câu {current + 1} / 12
        </div>
        <div className={`text-4xl font-bold ${timerColor} bg-white/10 px-5 py-2 rounded-full`}>
          {timeLeft}s
        </div>
      </div>

      {/* Lifeline Buttons - Tách riêng, rõ ràng */}
      <div className="flex gap-3 mb-6">
        <button 
          onClick={() => useLifeline('5050')} 
          disabled={usedLifelines.includes('5050')} 
          className={`px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all border-2
            ${usedLifelines.includes('5050') 
              ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed line-through' 
              : 'bg-blue-600 border-blue-400 hover:bg-blue-500 hover:scale-105 shadow-lg shadow-blue-500/30'}`} 
          title="50:50"
        >
          <span className="text-lg">50:50</span>
        </button>
        <button 
          onClick={() => useLifeline('friend')} 
          disabled={usedLifelines.includes('friend')} 
          className={`px-4 py-2.5 rounded-full flex items-center gap-2 transition-all border-2 font-bold text-sm
            ${usedLifelines.includes('friend') 
              ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
              : 'bg-green-600 border-green-400 hover:bg-green-500 hover:scale-105 shadow-lg shadow-green-500/30'}`} 
          title="Hỏi bạn bên cạnh"
        >
          <MessageCircle size={20}/> Hỏi bạn
        </button>
        <button 
          onClick={() => useLifeline('audience')} 
          disabled={usedLifelines.includes('audience')} 
          className={`px-4 py-2.5 rounded-full flex items-center gap-2 transition-all border-2 font-bold text-sm
            ${usedLifelines.includes('audience') 
              ? 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed' 
              : 'bg-purple-600 border-purple-400 hover:bg-purple-500 hover:scale-105 shadow-lg shadow-purple-500/30'}`} 
          title="Hỏi ý kiến khán giả"
        >
          <BarChart3 size={20}/> Khán giả
        </button>
      </div>

      {/* Friend Hint Popup */}
      {friendHint && (
        <div className="mb-4 bg-white text-blue-900 p-4 rounded-2xl shadow-xl z-10 flex items-start gap-3 max-w-md animate-bounce-in">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-bold mb-1">Gợi ý từ người bạn:</p>
            <p>{friendHint}</p>
          </div>
          <button onClick={() => setFriendHint(null)} className="text-gray-400 hover:text-gray-600 ml-2"><X size={16}/></button>
        </div>
      )}

      {/* Audience Chart Popup */}
      {audienceChart && (
        <div className="mb-4 bg-white text-blue-900 p-6 rounded-2xl shadow-xl z-10 w-80 animate-bounce-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Ý kiến khán giả</h3>
            <button onClick={() => setAudienceChart(null)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
          </div>
          <div className="flex justify-around items-end h-32 gap-2">
            {audienceChart.map((pct, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <span className="text-xs font-bold mb-1">{pct}%</span>
                <div className="w-full bg-blue-500 rounded-t-md transition-all duration-1000" style={{ height: `${pct}%` }}></div>
                <span className="mt-2 font-bold">{['A','B','C','D'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Image */}
      {q.image && <img src={q.image} className="max-h-48 object-contain rounded-xl mx-auto my-4" alt="Hình minh họa" />}
      
      {/* Question Text */}
      <div className="w-full max-w-4xl bg-blue-800/80 border-2 border-blue-400 p-6 md:p-8 rounded-full text-center text-lg md:text-2xl font-bold mb-8 shadow-[0_0_15px_rgba(59,130,246,0.5)] backdrop-blur">
        <MathContent html={q.text} />
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-2 gap-4 md:gap-6 w-full max-w-4xl">
        {q.options.map((opt, i) => (
          <button 
            key={i} 
            onClick={() => handleAnswer(i)}
            disabled={hiddenOpts.includes(i) || status !== 'playing'}
            className={`p-4 md:p-6 rounded-full text-base md:text-xl font-bold border-2 transition-all text-left pl-6 md:pl-8
              ${hiddenOpts.includes(i) ? 'opacity-0 pointer-events-none' : ''}
              ${status === 'correct' && i === q.answer ? 'bg-green-500 border-green-400 animate-pulse scale-105' : 
                status === 'wrong' && i === q.answer ? 'bg-green-500 border-green-400' :
                status === 'wrong' ? 'bg-red-500/60 border-red-400/60' : 
                'bg-blue-800/70 border-blue-400/60 hover:bg-blue-700 hover:border-blue-300 hover:scale-[1.02]'}`}
          >
            <span className="text-yellow-400 mr-3 md:mr-4">{['A', 'B', 'C', 'D'][i]}:</span> <MathContent html={opt} />
          </button>
        ))}
      </div>
    </div>
  );
}

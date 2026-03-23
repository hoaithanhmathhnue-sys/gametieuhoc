import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { Users, SkipForward, MessageCircle, BarChart3, X } from 'lucide-react';
import { playDing, playBuzz, playTick } from '../utils/audio';

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
          // Timer hết — kết thúc trong callback để tránh race condition
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
      const correctPercent = Math.floor(Math.random() * 11) + 60; // 60-70%
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
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-b from-blue-900 to-blue-950 text-white rounded-3xl m-4 shadow-2xl relative overflow-hidden">
      <div className={`absolute top-8 right-8 text-4xl font-bold ${timerColor}`}>{timeLeft}s</div>
      <div className="absolute top-8 left-8 text-xl font-bold text-white">Câu {current + 1} / 12</div>
      
      <div className="absolute top-8 flex gap-4">
        <button onClick={() => useLifeline('5050')} disabled={usedLifelines.includes('5050')} className={`p-3 rounded-full font-bold ${usedLifelines.includes('5050')?'bg-gray-600':'bg-blue-600 hover:bg-blue-500'}`} title="50:50">50:50</button>
        <button onClick={() => useLifeline('friend')} disabled={usedLifelines.includes('friend')} className={`p-3 rounded-full ${usedLifelines.includes('friend')?'bg-gray-600':'bg-blue-600 hover:bg-blue-500'}`} title="Hỏi bạn bên cạnh"><MessageCircle size={24}/></button>
        <button onClick={() => useLifeline('audience')} disabled={usedLifelines.includes('audience')} className={`p-3 rounded-full ${usedLifelines.includes('audience')?'bg-gray-600':'bg-blue-600 hover:bg-blue-500'}`} title="Hỏi ý kiến khán giả"><BarChart3 size={24}/></button>
      </div>

      {friendHint && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-white text-blue-900 p-4 rounded-2xl shadow-xl z-10 flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="text-2xl">💡</span>
          <div>
            <p className="font-bold mb-1">Gợi ý từ người bạn:</p>
            <p>{friendHint}</p>
          </div>
          <button onClick={() => setFriendHint(null)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
        </div>
      )}

      {audienceChart && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-white text-blue-900 p-6 rounded-2xl shadow-xl z-10 animate-in fade-in slide-in-from-top-4 w-80">
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

      {q.image && <img src={q.image} className="h-48 object-contain mb-8 rounded-xl" />}
      
      <div className="w-full max-w-4xl bg-blue-800 border-2 border-blue-400 p-8 rounded-full text-center text-2xl font-bold mb-12 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
        {q.text}
      </div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-4xl">
        {q.options.map((opt, i) => (
          <button 
            key={i} 
            onClick={() => handleAnswer(i)}
            disabled={hiddenOpts.includes(i) || status !== 'playing'}
            className={`p-6 rounded-full text-xl font-bold border-2 transition-all text-left pl-8
              ${hiddenOpts.includes(i) ? 'opacity-0' : ''}
              ${status === 'correct' && i === q.answer ? 'bg-green-500 border-green-400 animate-pulse' : 
                status === 'wrong' && i === q.answer ? 'bg-green-500 border-green-400' :
                status === 'wrong' ? 'bg-red-500 border-red-400' : 
                'bg-blue-800 border-blue-400 hover:bg-blue-700'}`}
          >
            <span className="text-yellow-400 mr-4">{['A', 'B', 'C', 'D'][i]}:</span> {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

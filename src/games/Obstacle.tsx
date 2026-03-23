import React, { useState } from 'react';
import { Question } from '../types';
import { playDing, playBuzz } from '../utils/audio';
import { MathContent } from '../MathContent';
import { Trophy, Flag, Zap } from 'lucide-react';

const ANSWER_COLORS = [
  { bg: 'bg-indigo-50', border: 'border-indigo-200', hover: 'hover:bg-indigo-100 hover:border-indigo-400', badge: 'bg-gradient-to-br from-indigo-500 to-blue-600', text: 'text-indigo-800' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', hover: 'hover:bg-emerald-100 hover:border-emerald-400', badge: 'bg-gradient-to-br from-emerald-500 to-green-600', text: 'text-emerald-800' },
  { bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:bg-amber-100 hover:border-amber-400', badge: 'bg-gradient-to-br from-amber-500 to-orange-600', text: 'text-amber-800' },
  { bg: 'bg-rose-50', border: 'border-rose-200', hover: 'hover:bg-rose-100 hover:border-rose-400', badge: 'bg-gradient-to-br from-rose-500 to-red-600', text: 'text-rose-800' },
];

const TEAM_THEMES = [
  { gradient: 'from-indigo-500 via-purple-500 to-pink-500', light: 'from-indigo-100 to-purple-100', border: 'border-indigo-400', track: 'from-indigo-400 to-purple-500', glow: 'shadow-indigo-500/40' },
  { gradient: 'from-orange-500 via-rose-500 to-pink-500', light: 'from-orange-100 to-rose-100', border: 'border-orange-400', track: 'from-orange-400 to-rose-500', glow: 'shadow-orange-500/40' },
];

export default function Obstacle({ questions, onReplay }: { questions: Question[], onReplay?: () => void }) {
  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center">Không có câu hỏi nào để chơi.</div>;
  }

  const [teams, setTeams] = useState([
    { id: 1, pos: 0, icon: '🐱', isBouncing: false, isShaking: false },
    { id: 2, pos: 0, icon: '🐶', isBouncing: false, isShaking: false }
  ]);
  const [turn, setTurn] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [status, setStatus] = useState<'playing'|'answered'|'end'>('playing');
  const [selectedOpt, setSelectedOpt] = useState(-1);

  const q = questions[currentQ];
  const totalSteps = 20;
  const obstacles: Record<number, string> = { 4: '🌵', 8: '🗻', 12: '🌊', 16: '🔥' };

  const handleAnswer = (idx: number) => {
    if (status !== 'playing') return;
    setSelectedOpt(idx);
    setStatus('answered');
    
    if (idx === q.answer) {
      playDing();
      const newPos = teams[turn].pos + 1;
      setTeams(prev => {
        const n = [...prev];
        n[turn].isBouncing = true;
        n[turn].pos = newPos;
        if (obstacles[n[turn].pos]) n[turn].isShaking = true;
        return n;
      });

      setTimeout(() => {
        setTeams(prev => {
          const n = [...prev];
          n[turn].isBouncing = false;
          n[turn].isShaking = false;
          return n;
        });
        
        if (newPos >= totalSteps) {
          setStatus('end');
        } else {
          nextTurn();
        }
      }, 1000);
    } else {
      playBuzz();
      setTimeout(() => nextTurn(), 2000);
    }
  };

  const nextTurn = () => {
    setTurn(p => (p + 1) % teams.length);
    setCurrentQ(p => (p + 1) % questions.length);
    setStatus('playing');
    setSelectedOpt(-1);
  };

  if (status === 'end') {
    const theme = TEAM_THEMES[turn];
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>
        <div className="text-8xl mb-6 animate-bounce">{teams[turn].icon}</div>
        <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">🏆 ĐỘI {teams[turn].id} CHIẾN THẮNG!</h2>
        <p className="text-2xl text-white/80 mb-8">Đã vượt qua mọi chướng ngại vật!</p>
        <div className="flex gap-8 mb-8">
          {teams.map((t, i) => (
            <div key={i} className={`p-6 rounded-3xl backdrop-blur-md ${i === turn ? 'bg-yellow-400/90 text-yellow-900 scale-110 ring-4 ring-yellow-300 shadow-2xl' : 'bg-white/20 text-white'} transition-all`}>
              <div className="text-4xl mb-2">{t.icon}</div>
              <div className="text-lg font-bold">Đội {t.id}</div>
              <div className="text-3xl font-black">{Math.round((t.pos/totalSteps)*100)}%</div>
            </div>
          ))}
        </div>
        {onReplay && (
          <button onClick={onReplay} className="px-8 py-4 bg-white text-purple-700 font-bold text-xl rounded-2xl hover:bg-yellow-100 transition-all shadow-lg hover:scale-105">
            🔄 Chơi lại
          </button>
        )}
      </div>
    );
  }

  const theme = TEAM_THEMES[turn];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col lg:flex-row gap-4 md:gap-6" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 30%, #fce7f3 60%, #ffe4e6 100%)' }}>
      {/* Track Panel */}
      <div className="flex-1 bg-white/80 backdrop-blur rounded-3xl p-6 md:p-8 shadow-xl flex flex-col justify-center border border-white/50">
        <h2 className="text-2xl md:text-3xl font-black mb-8 md:mb-12 text-center uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          🏁 Đường Đua Vượt Chướng Ngại Vật
        </h2>
        
        <div className="space-y-12 md:space-y-16">
          {teams.map((t, tIdx) => {
            const tTheme = TEAM_THEMES[tIdx];
            return (
              <div key={t.id} className="relative">
                {/* Track Background */}
                <div className="flex h-14 md:h-16 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 overflow-hidden relative shadow-inner">
                  {Array.from({length: totalSteps}).map((_, i) => (
                    <div key={i} className="flex-1 border-r border-dashed border-gray-200/60 flex items-center justify-center relative">
                      {obstacles[(i + 1)] && (
                        <span className="text-xl md:text-2xl opacity-60 animate-pulse">{obstacles[(i + 1)]}</span>
                      )}
                    </div>
                  ))}
                  {/* Progress Fill */}
                  <div 
                    className={`absolute top-0 bottom-0 left-0 bg-gradient-to-r ${tTheme.track} transition-all duration-1000 ease-in-out rounded-l-xl opacity-30`} 
                    style={{width: `${(t.pos/totalSteps)*100}%`}}
                  />
                </div>
                
                {/* Character */}
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-in-out z-10
                    ${t.isBouncing ? 'animate-[bounceUp_0.5s_ease-in-out]' : ''}
                    ${t.isShaking ? 'animate-[shake_0.5s_ease-in-out_infinite]' : ''}
                  `} 
                  style={{left: `calc(${(t.pos/totalSteps)*100}% - 24px)`}}
                >
                  <div className={`p-2 bg-white rounded-full shadow-lg ${turn === tIdx ? `ring-4 ring-offset-2 ${tTheme.border} scale-110 ${tTheme.glow} shadow-xl` : 'border-2 border-gray-200'} transition-all`}>
                    <span className="text-3xl md:text-4xl">{t.icon}</span>
                  </div>
                </div>
                
                {/* Finish Line */}
                <div className="absolute -right-8 md:-right-12 top-1/2 -translate-y-1/2 text-2xl md:text-3xl">🏁</div>
                
                {/* Progress Label */}
                <div className={`mt-2 text-center text-sm font-bold bg-gradient-to-r ${tTheme.gradient} bg-clip-text text-transparent`}>
                  Đội {t.id}: {Math.round((t.pos/totalSteps)*100)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Question Panel */}
      <div className="w-full lg:w-[420px] bg-white/90 backdrop-blur rounded-3xl p-5 md:p-6 shadow-xl flex flex-col border-2" 
        style={{ borderImage: `linear-gradient(135deg, ${turn === 0 ? '#6366F1, #A855F7' : '#F97316, #FB7185'}) 1` }}>
        
        {/* Team Badge */}
        <div className="text-center mb-4 md:mb-6">
          <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${theme.gradient} text-white px-6 py-3 rounded-2xl font-bold text-lg md:text-xl shadow-lg ${theme.glow}`}>
            <span className="text-2xl md:text-3xl">{teams[turn].icon}</span>
            <Zap size={20} className="animate-pulse" />
            Lượt Đội {teams[turn].id}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          {q.image && <img src={q.image} className="h-32 md:h-40 object-contain mx-auto mb-4 md:mb-6 rounded-xl shadow-md" />}
          <MathContent html={q?.text || ''} tag="h3" className="text-xl md:text-2xl font-bold text-center mb-6 md:mb-8 text-gray-800 leading-relaxed" />
          
          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {q?.options.map((opt, i) => {
              const color = ANSWER_COLORS[i];
              return (
                <button 
                  key={i} 
                  onClick={() => handleAnswer(i)} 
                  disabled={status !== 'playing'}
                  className={`p-3 md:p-4 rounded-2xl text-base md:text-lg font-bold border-2 transition-all text-left flex items-center gap-3 md:gap-4
                    ${status === 'answered' && i === q.answer ? 'bg-green-500 text-white border-green-400 scale-105 shadow-xl shadow-green-500/30' :
                      status === 'answered' && i === selectedOpt ? 'bg-red-500 text-white border-red-400 scale-95 shadow-xl shadow-red-500/30' :
                      status === 'answered' ? 'bg-gray-50 border-gray-200 opacity-40' :
                      `${color.bg} ${color.border} ${color.hover} hover:scale-[1.03] hover:shadow-md`}`}
                >
                  <span className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full text-white font-black text-base md:text-lg shadow-md shrink-0
                    ${status === 'answered' && i === q.answer ? 'bg-green-600' :
                      status === 'answered' && i === selectedOpt ? 'bg-red-600' :
                      status === 'answered' ? 'bg-gray-300' :
                      color.badge}`}>
                    {['A', 'B', 'C', 'D'][i]}
                  </span>
                  <span className={`flex-1 ${status === 'answered' ? '' : color.text}`}>
                    <MathContent html={opt} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

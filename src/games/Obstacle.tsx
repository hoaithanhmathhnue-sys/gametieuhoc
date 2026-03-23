import React, { useState } from 'react';
import { Question } from '../types';
import { playDing, playBuzz } from '../utils/audio';

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
  const obstacles = { 5: '🌵', 10: '🗻', 15: '🌊' };

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
        
        // Check if hitting obstacle
        if (obstacles[n[turn].pos as keyof typeof obstacles]) {
           n[turn].isShaking = true;
        }

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
      setTimeout(() => {
        nextTurn();
      }, 2000);
    }
  };

  const nextTurn = () => {
    setTurn(p => (p + 1) % teams.length);
    setCurrentQ(p => (p + 1) % questions.length);
    setStatus('playing');
    setSelectedOpt(-1);
  };

  if (status === 'end') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-green-50">
        <h1 className="text-8xl mb-6">{teams[turn].icon}</h1>
        <h2 className="text-5xl font-bold text-green-600 mb-4">ĐỘI {teams[turn].id} CHIẾN THẮNG!</h2>
        <p className="text-2xl text-gray-600">Đã vượt qua mọi chướng ngại vật</p>
        {onReplay && (
          <button onClick={onReplay} className="mt-6 px-8 py-3 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 transition-colors">
            🔄 Chơi lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex gap-6 bg-blue-50">
      {/* Track Panel */}
      <div className="flex-1 bg-white rounded-3xl p-8 shadow-sm flex flex-col justify-center">
        <h2 className="text-3xl font-bold mb-12 text-center text-blue-600 uppercase tracking-wider">Đường đua vượt chướng ngại vật</h2>
        
        <div className="space-y-16">
          {teams.map((t, tIdx) => (
            <div key={t.id} className="relative">
              {/* Track Background */}
              <div className="flex h-16 bg-gray-100 rounded-2xl border-4 border-gray-200 overflow-hidden relative">
                {Array.from({length: totalSteps}).map((_, i) => (
                  <div key={i} className="flex-1 border-r-2 border-dashed border-gray-300 flex items-center justify-center relative">
                    {obstacles[(i + 1) as keyof typeof obstacles] && (
                      <span className="text-2xl opacity-50">{obstacles[(i + 1) as keyof typeof obstacles]}</span>
                    )}
                  </div>
                ))}
                {/* Progress Fill */}
                <div className="absolute top-0 bottom-0 left-0 bg-blue-200 transition-all duration-1000 ease-in-out" style={{width: `${(t.pos/totalSteps)*100}%`}}></div>
              </div>
              
              {/* Character */}
              <div 
                className={`absolute top-1/2 -translate-y-1/2 text-5xl transition-all duration-1000 ease-in-out z-10
                  ${t.isBouncing ? 'animate-[bounceUp_0.5s_ease-in-out]' : ''}
                  ${t.isShaking ? 'animate-[shake_0.5s_ease-in-out_infinite]' : ''}
                `} 
                style={{left: `calc(${(t.pos/totalSteps)*100}% - 24px)`}}
              >
                <div className={`p-2 bg-white rounded-full shadow-lg border-4 ${turn === tIdx ? 'border-blue-500 scale-110' : 'border-gray-200'}`}>
                  {t.icon}
                </div>
              </div>
              
              <div className="absolute -right-16 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-2xl">🏁</div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Panel */}
      <div className="w-[450px] bg-white rounded-3xl p-6 shadow-xl border-4 border-blue-100 flex flex-col">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 bg-blue-100 text-blue-800 px-6 py-3 rounded-2xl font-bold text-xl">
            <span className="text-3xl">{teams[turn].icon}</span>
            Lượt Đội {teams[turn].id}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          {q.image && <img src={q.image} className="h-40 object-contain mx-auto mb-6 rounded-xl" />}
          <h3 className="text-2xl font-bold text-center mb-8 text-gray-800">{q?.text}</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {q?.options.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => handleAnswer(i)} 
                disabled={status !== 'playing'}
                className={`p-4 rounded-2xl text-lg font-bold border-4 transition-all text-left flex items-center gap-4
                  ${status === 'answered' && i === q.answer ? 'bg-green-500 text-white border-green-600 scale-105' :
                    status === 'answered' && i === selectedOpt ? 'bg-red-500 text-white border-red-600 scale-95' :
                    status === 'answered' ? 'bg-gray-100 border-gray-200 opacity-50' :
                    'bg-white border-blue-100 hover:bg-blue-50 hover:border-blue-300 hover:scale-105'}`}
              >
                <span className={`w-10 h-10 flex items-center justify-center rounded-full text-white font-black
                  ${status === 'answered' && i === q.answer ? 'bg-green-600' :
                    status === 'answered' && i === selectedOpt ? 'bg-red-600' :
                    status === 'answered' ? 'bg-gray-300' :
                    'bg-blue-500'}`}>
                  {['A', 'B', 'C', 'D'][i]}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

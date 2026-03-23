import React, { useState } from 'react';
import { Question } from '../types';
import { playDing, playBuzz } from '../utils/audio';

export default function Flower({ questions, onReplay }: { questions: Question[], onReplay?: () => void }) {
  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center">Không có câu hỏi nào để chơi.</div>;
  }

  const [flowers, setFlowers] = useState(questions.slice(0, 12).map((q, i) => ({ id: i, q, pickedBy: null as number | null })));
  const [activeF, setActiveF] = useState<number | null>(null);
  const [score, setScore] = useState([0, 0, 0]);
  const [turn, setTurn] = useState(0);

  const colors = ['bg-pink-500', 'bg-blue-500', 'bg-orange-500'];
  const textColors = ['text-pink-600', 'text-blue-600', 'text-orange-600'];
  const borderColors = ['border-pink-500', 'border-blue-500', 'border-orange-500'];
  const hexColors = ['#ec4899', '#3b82f6', '#f97316']; // pink-500, blue-500, orange-500

  const handleAnswer = (idx: number) => {
    if (activeF === null) return;
    const q = flowers[activeF].q;
    if (idx === q.answer) {
      playDing();
      setFlowers(prev => {
        const nf = [...prev];
        nf[activeF].pickedBy = turn;
        return nf;
      });
      setScore(prev => {
        const ns = [...prev];
        ns[turn] += 10;
        return ns;
      });
    } else {
      playBuzz();
      setFlowers(prev => {
        const nf = [...prev];
        nf[activeF].pickedBy = -1;
        return nf;
      });
    }
    setTurn(p => (p + 1) % 3);
    setActiveF(null);
  };

  // Fixed positions for 12 flowers on the tree
  const positions = [
    { x: 30, y: 20 }, { x: 50, y: 15 }, { x: 70, y: 25 },
    { x: 20, y: 40 }, { x: 40, y: 35 }, { x: 60, y: 45 }, { x: 80, y: 40 },
    { x: 25, y: 60 }, { x: 45, y: 55 }, { x: 65, y: 65 }, { x: 85, y: 55 },
    { x: 50, y: 75 }
  ];

  const isGameOver = flowers.every(f => f.pickedBy !== null);

  if (isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-green-50">
        <h1 className="text-6xl mb-4">🌸</h1>
        <h2 className="text-4xl font-bold text-green-600 mb-8">HÁI HOA HOÀN TẤT!</h2>
        <div className="flex gap-8">
          {[0,1,2].map(i => (
            <div key={i} className={`p-8 rounded-3xl bg-white shadow-xl border-t-8 ${borderColors[i]}`}>
              <h3 className={`text-2xl font-bold mb-2 ${textColors[i]}`}>Đội {i+1}</h3>
              <p className="text-5xl font-black text-gray-800">{score[i]}</p>
            </div>
          ))}
        </div>
        {onReplay && (
          <button onClick={onReplay} className="mt-8 px-8 py-3 bg-green-600 text-white font-bold text-lg rounded-xl hover:bg-green-700 transition-colors">
            🔄 Chơi lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col items-center bg-gradient-to-b from-blue-50 to-green-50">
      <div className="flex gap-8 mb-8">
        {[0,1,2].map(i => (
          <div key={i} className={`px-8 py-4 rounded-2xl text-2xl font-bold transition-all duration-300 flex flex-col items-center
            ${turn===i ? `scale-110 shadow-xl text-white ${colors[i]}` : 'bg-white text-gray-500 shadow-sm border-2 border-gray-100'}`}>
            <span className="text-sm uppercase tracking-wider opacity-80">Đội {i+1}</span>
            <span>{score[i]}</span>
          </div>
        ))}
      </div>

      {activeF === null ? (
        <div className="relative w-full max-w-4xl aspect-[16/10] bg-white/50 rounded-[3rem] shadow-inner border-8 border-green-100 p-8 overflow-hidden backdrop-blur-sm">
          {/* SVG Tree Background */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax meet" viewBox="0 0 100 100">
            {/* Trunk */}
            <path d="M45,100 C45,80 40,60 50,40 C60,60 55,80 55,100 Z" fill="#8B4513" />
            {/* Branches */}
            <path d="M50,60 Q30,50 20,30" fill="none" stroke="#8B4513" strokeWidth="3" strokeLinecap="round" />
            <path d="M50,50 Q70,40 80,25" fill="none" stroke="#8B4513" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M48,70 Q25,65 15,50" fill="none" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
            <path d="M52,65 Q75,60 85,45" fill="none" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
            <path d="M50,40 Q40,20 50,10" fill="none" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
            
            {/* Leaves (Decorative) */}
            <circle cx="50" cy="20" r="25" fill="#22c55e" opacity="0.2" filter="blur(4px)" />
            <circle cx="30" cy="35" r="20" fill="#22c55e" opacity="0.2" filter="blur(4px)" />
            <circle cx="70" cy="35" r="20" fill="#22c55e" opacity="0.2" filter="blur(4px)" />
            <circle cx="20" cy="55" r="15" fill="#22c55e" opacity="0.2" filter="blur(4px)" />
            <circle cx="80" cy="55" r="15" fill="#22c55e" opacity="0.2" filter="blur(4px)" />

            {/* Flowers as SVG elements */}
            {flowers.map((f, i) => {
              const pos = positions[i] || { x: 50, y: 50 };
              const isCorrect = f.pickedBy !== null && f.pickedBy !== -1;
              const isWrong = f.pickedBy === -1;
              const isAvailable = f.pickedBy === null;
              
              // Flower path (5 petals)
              const flowerPath = "M0,-10 C5,-20 15,-10 10,0 C20,-5 20,10 10,10 C15,20 5,20 0,10 C-5,20 -15,20 -10,10 C-20,10 -20,-5 -10,0 C-15,-10 -5,-20 0,-10 Z";
              
              return (
                <g 
                  key={i} 
                  transform={`translate(${pos.x}, ${pos.y}) scale(0.6)`} 
                  onClick={() => isAvailable && setActiveF(i)}
                  className={`transition-all duration-500 origin-center ${isAvailable ? 'cursor-pointer hover:scale-[0.8] drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]' : isWrong ? 'scale-[0.4] opacity-50 cursor-not-allowed' : 'scale-[0.7] cursor-not-allowed'}`}
                  style={{ animation: isAvailable ? `bounceUp 3s ease-in-out infinite ${i * 0.2}s` : 'none' }}
                >
                  {/* Base flower fill */}
                  <path 
                    d={flowerPath} 
                    fill={isAvailable ? '#f472b6' : isWrong ? '#9ca3af' : hexColors[f.pickedBy]}
                    className="transition-colors duration-500"
                  />
                  
                  {/* Animated stroke for correct answer (blooming effect) */}
                  {isCorrect && (
                    <path 
                      d={flowerPath} 
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      pathLength="100"
                      strokeDasharray="100"
                      className="animate-[dash_1.5s_ease-out_forwards]"
                    />
                  )}
                  
                  {/* Center of flower */}
                  <circle cx="0" cy="0" r="4" fill="#fbbf24" />
                  
                  {/* Number */}
                  {isAvailable && (
                    <text x="0" y="2" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" pointerEvents="none">
                      {i + 1}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          
          {/* Add keyframes for the SVG dash animation */}
          <style>{`
            @keyframes dash {
              from { stroke-dashoffset: 100; }
              to { stroke-dashoffset: 0; }
            }
          `}</style>
        </div>
      ) : (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-4xl text-center animate-in zoom-in duration-300 border-4 border-pink-100">
          <div className="inline-block bg-pink-100 text-pink-800 px-6 py-2 rounded-full font-bold mb-8 text-lg">
            Hoa số {activeF + 1}
          </div>
          {flowers[activeF].q.image && <img src={flowers[activeF].q.image} className="h-48 object-contain mx-auto mb-8 rounded-xl" />}
          <h2 className="text-3xl font-bold mb-10 text-gray-800 leading-relaxed">{flowers[activeF].q.text}</h2>
          <div className="grid grid-cols-2 gap-6">
            {flowers[activeF].q.options.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => handleAnswer(i)} 
                className="p-6 bg-pink-50 hover:bg-pink-100 border-2 border-pink-200 rounded-2xl text-xl font-bold transition-all hover:scale-105 flex items-center gap-4 text-left text-pink-900 shadow-sm"
              >
                <span className="w-12 h-12 flex items-center justify-center bg-white text-pink-500 rounded-full font-black text-2xl shadow-sm">
                  {['A', 'B', 'C', 'D'][i]}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

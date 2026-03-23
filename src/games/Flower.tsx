import React, { useState, useMemo } from 'react';
import { Question } from '../types';
import { playDing, playBuzz } from '../utils/audio';
import { MathContent } from '../MathContent';

export default function Flower({ questions, onReplay }: { questions: Question[], onReplay?: () => void }) {
  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center">Không có câu hỏi nào để chơi.</div>;
  }

  const flowerCount = Math.min(questions.length, 12);
  const [flowers, setFlowers] = useState(questions.slice(0, flowerCount).map((q, i) => ({ id: i, q, pickedBy: null as number | null })));
  const [activeF, setActiveF] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState([0, 0, 0]);
  const [turn, setTurn] = useState(0);

  const colors = ['bg-pink-500', 'bg-blue-500', 'bg-orange-500'];
  const textColors = ['text-pink-600', 'text-blue-600', 'text-orange-600'];
  const borderColors = ['border-pink-500', 'border-blue-500', 'border-orange-500'];
  const teamEmojis = ['🌺', '🌻', '🌷'];

  // Stable random positions using useMemo
  const positions = useMemo(() => {
    const basePositions = [
      { x: 30, y: 18 }, { x: 50, y: 12 }, { x: 70, y: 20 },
      { x: 20, y: 38 }, { x: 42, y: 32 }, { x: 62, y: 42 }, { x: 82, y: 36 },
      { x: 25, y: 56 }, { x: 48, y: 52 }, { x: 68, y: 60 }, { x: 85, y: 52 },
      { x: 50, y: 72 }
    ];
    return basePositions.slice(0, flowerCount);
  }, [flowerCount]);

  const handleAnswer = (idx: number) => {
    if (activeF === null) return;
    const q = flowers[activeF].q;
    const isCorrect = idx === q.answer;

    if (isCorrect) {
      playDing();
      setShowResult('correct');
      setFlowers(prev => {
        const nf = [...prev];
        nf[activeF] = { ...nf[activeF], pickedBy: turn };
        return nf;
      });
      setScore(prev => {
        const ns = [...prev];
        ns[turn] += 10;
        return ns;
      });
    } else {
      playBuzz();
      setShowResult('wrong');
      setFlowers(prev => {
        const nf = [...prev];
        nf[activeF] = { ...nf[activeF], pickedBy: -1 };
        return nf;
      });
    }

    // Delay to show result before moving on
    setTimeout(() => {
      setShowResult(null);
      setTurn(p => (p + 1) % 3);
      setActiveF(null);
    }, 1200);
  };

  const isGameOver = flowers.every(f => f.pickedBy !== null);

  if (isGameOver) {
    const maxScore = Math.max(...score);
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 animated-bg min-h-screen">
        <div className="glass rounded-3xl p-12 max-w-2xl w-full" style={{ animation: 'pop-in 0.5s ease-out' }}>
          <h1 className="text-7xl mb-4" style={{ animation: 'wiggle 1s ease-in-out infinite' }}>🌸</h1>
          <h2 className="text-4xl font-black text-white mb-8 drop-shadow-lg">HÁI HOA HOÀN TẤT!</h2>
          <div className="flex gap-6 justify-center flex-wrap">
            {[0,1,2].map(i => (
              <div key={i} className={`p-6 rounded-3xl bg-white/90 shadow-xl border-t-4 ${borderColors[i]} transition-all duration-500 ${score[i] === maxScore ? 'scale-110 ring-4 ring-yellow-400' : ''}`}
                style={{ animation: `pop-in 0.4s ease-out ${i * 0.15}s both` }}>
                <div className="text-3xl mb-2">{teamEmojis[i]}</div>
                <h3 className={`text-xl font-bold mb-1 ${textColors[i]}`}>Đội {i+1}</h3>
                <p className="text-4xl font-black text-gray-800">{score[i]}</p>
                {score[i] === maxScore && <div className="text-yellow-500 text-lg mt-1">🏆 Nhất!</div>}
              </div>
            ))}
          </div>
          {onReplay && (
            <button onClick={onReplay} className="btn-shine mt-8 px-8 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold text-lg rounded-2xl hover:from-green-500 hover:to-emerald-600 transition-all shadow-lg hover:scale-105">
              🔄 Chơi lại
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col items-center bg-gradient-to-b from-sky-100 via-green-50 to-emerald-100 min-h-screen">
      {/* Team Scores */}
      <div className="flex gap-6 mb-6">
        {[0,1,2].map(i => (
          <div key={i} className={`px-6 py-3 rounded-2xl text-xl font-bold transition-all duration-500 flex flex-col items-center
            ${turn===i ? `scale-110 shadow-xl text-white ${colors[i]}` : 'glass text-gray-600'}`}
            style={turn === i ? { animation: 'pulse-glow 2s ease-in-out infinite' } : {}}>
            <span className="text-sm uppercase tracking-wider opacity-80">{teamEmojis[i]} Đội {i+1}</span>
            <span className="text-2xl font-black">{score[i]}</span>
          </div>
        ))}
      </div>

      {activeF === null ? (
        /* === FLOWER GARDEN === */
        <div className="relative w-full max-w-4xl aspect-[16/10] rounded-[3rem] shadow-2xl overflow-hidden border-4 border-white/50"
          style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #98FB98 60%, #228B22 100%)' }}>

          {/* Sun */}
          <div className="absolute top-4 right-8 w-16 h-16 rounded-full bg-yellow-300 shadow-[0_0_40px_rgba(250,204,21,0.6)]"
            style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}>
            <div className="absolute inset-2 rounded-full bg-yellow-200"></div>
          </div>

          {/* Clouds */}
          <div className="absolute top-6 left-[10%] text-white/60 text-4xl" style={{ animation: 'float 8s ease-in-out infinite' }}>☁️</div>
          <div className="absolute top-10 left-[60%] text-white/40 text-3xl" style={{ animation: 'float 10s ease-in-out infinite 2s' }}>☁️</div>

          {/* Ground / Grass bottom area */}
          <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-green-700 via-green-500 to-transparent rounded-b-[3rem]"></div>

          {/* SVG Flowers */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {flowers.map((f, i) => {
              const pos = positions[i] || { x: 50, y: 50 };
              const isPicked = f.pickedBy !== null;
              const isCorrect = f.pickedBy !== null && f.pickedBy >= 0;
              const isWrong = f.pickedBy === -1;
              const isAvailable = f.pickedBy === null;

              // Team color for picked flowers
              const teamHexColors = ['#ec4899', '#3b82f6', '#f97316'];
              const fillColor = isAvailable ? '#f472b6' : isWrong ? '#9ca3af' : teamHexColors[f.pickedBy!];

              return (
                <g
                  key={i}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => isAvailable && setActiveF(i)}
                  style={{ cursor: isAvailable ? 'pointer' : 'default' }}
                >
                  {/* Stem */}
                  {isAvailable && (
                    <line x1="0" y1="5" x2="0" y2="15" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
                  )}

                  {/* Leaf */}
                  {isAvailable && (
                    <ellipse cx="4" cy="10" rx="3" ry="1.5" fill="#4ade80" transform="rotate(-30, 4, 10)" />
                  )}

                  {/* Flower petals */}
                  <g className={isAvailable ? 'flower-svg-hover' : ''}>
                    {[0, 72, 144, 216, 288].map((angle, pi) => (
                      <ellipse
                        key={pi}
                        cx="0" cy="-6"
                        rx="4" ry="6"
                        fill={fillColor}
                        opacity={isPicked && !isCorrect ? 0.4 : 0.9}
                        transform={`rotate(${angle}, 0, 0)`}
                      />
                    ))}

                    {/* Center */}
                    <circle cx="0" cy="0" r="3.5" fill={isAvailable ? '#fbbf24' : isCorrect ? '#fbbf24' : '#d1d5db'} />

                    {/* Number label */}
                    {isAvailable && (
                      <text x="0" y="1.5" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold" pointerEvents="none">
                        {i + 1}
                      </text>
                    )}

                    {/* Checkmark for correct */}
                    {isCorrect && (
                      <text x="0" y="2" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold" pointerEvents="none">✓</text>
                    )}

                    {/* X for wrong */}
                    {isWrong && (
                      <text x="0" y="2" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold" pointerEvents="none">✗</text>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Butterflies */}
          <div className="absolute text-2xl" style={{ top: '15%', left: '15%', animation: 'float 5s ease-in-out infinite' }}>🦋</div>
          <div className="absolute text-xl" style={{ top: '30%', right: '12%', animation: 'float 7s ease-in-out infinite 1s' }}>🦋</div>
        </div>
      ) : (
        /* === QUESTION PANEL === */
        <div className="glass p-10 rounded-[2.5rem] shadow-2xl w-full max-w-4xl text-center border-4 border-pink-200/50 relative overflow-hidden"
          style={{ animation: 'pop-in 0.3s ease-out' }}>

          {/* Result Overlay */}
          {showResult && (
            <div className={`absolute inset-0 flex items-center justify-center z-20 rounded-[2.5rem] ${showResult === 'correct' ? 'bg-green-500/90' : 'bg-red-500/90'}`}
              style={{ animation: 'pop-in 0.3s ease-out' }}>
              <div className="text-center text-white">
                <div className="text-8xl mb-4">{showResult === 'correct' ? '🎉' : '😢'}</div>
                <div className="text-3xl font-black">{showResult === 'correct' ? 'ĐÚNG RỒI!' : 'SAI RỒI!'}</div>
              </div>
            </div>
          )}

          <div className="inline-block bg-gradient-to-r from-pink-400 to-rose-400 text-white px-6 py-2 rounded-full font-bold mb-6 text-lg shadow-md">
            🌸 Hoa số {activeF + 1} — Đội {turn + 1} trả lời
          </div>
          {flowers[activeF].q.image && <img src={flowers[activeF].q.image} className="h-48 object-contain mx-auto mb-6 rounded-xl shadow-md" />}
          <MathContent html={flowers[activeF].q.text || ''} tag="h2" className="text-2xl font-bold mb-8 text-gray-800 leading-relaxed" />
          <div className="grid grid-cols-2 gap-5">
            {flowers[activeF].q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => !showResult && handleAnswer(i)}
                disabled={!!showResult}
                className="p-5 bg-white/80 hover:bg-pink-50 border-2 border-pink-200 rounded-2xl text-lg font-bold transition-all hover:scale-[1.03] hover:shadow-lg flex items-center gap-3 text-left text-pink-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-full font-black text-lg shadow-sm shrink-0">
                  {['A', 'B', 'C', 'D'][i]}
                </span>
                <span className="flex-1"><MathContent html={opt} /></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo, useRef } from 'react';
import { Question } from '../types';
import { playFlip, playDing, playBuzz } from '../utils/audio';
import { MathContent } from '../MathContent';

// Rainbow gradient colors for cards
const CARD_COLORS = [
  'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)', // Red-Orange
  'linear-gradient(135deg, #4ECDC4 0%, #44B09E 100%)', // Teal
  'linear-gradient(135deg, #A770EF 0%, #CF8BF3 100%)', // Purple
  'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)', // Orange-Gold
  'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', // Indigo-Purple
  'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)', // Green
  'linear-gradient(135deg, #FC5C7D 0%, #6A82FB 100%)', // Pink-Blue
  'linear-gradient(135deg, #F857A6 0%, #FF5858 100%)', // Pink-Red
  'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)', // Cyan-Green
  'linear-gradient(135deg, #FFA62E 0%, #EA4D2C 100%)', // Orange-Red
  'linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)', // Violet
  'linear-gradient(135deg, #43CEA2 0%, #185A9D 100%)', // Teal-Blue
];

const CARD_EMOJIS = ['⭐', '🌟', '💎', '🔮', '🌈', '🎯', '🎪', '🦋', '🌸', '🍀', '🎭', '🎨'];

export default function FlipCard({ questions, onReplay, onGameEnd }: { questions: Question[], onReplay?: () => void, onGameEnd?: (score: number, correct: number, total: number) => void }) {
  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center">Không có câu hỏi nào để chơi.</div>;
  }

  const [cards, setCards] = useState(questions.map((q, i) => ({ id: i, q, flipped: false, solved: false })));
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [score, setScore] = useState([0, 0]);
  const [turn, setTurn] = useState(0);
  const [combo, setCombo] = useState([0, 0]);
  const [showComboBonus, setShowComboBonus] = useState<{team: number, show: boolean}>({team: 0, show: false});
  const gameEndedRef = useRef(false);

  const handleCardClick = (i: number) => {
    if (activeCard !== null || cards[i].solved || cards[i].flipped) return;
    playFlip();
    const newCards = [...cards];
    newCards[i].flipped = true;
    setCards(newCards);
    setTimeout(() => {
      setActiveCard(i);
    }, 600);
  };

  const handleAnswer = (idx: number) => {
    if (activeCard === null) return;
    const q = cards[activeCard].q;
    if (idx === q.answer) {
      playDing();
      const newCards = [...cards];
      newCards[activeCard].solved = true;
      setCards(newCards);
      
      setCombo(p => {
        const n = [...p];
        n[turn] += 1;
        
        let bonus = 0;
        if (n[turn] === 3) {
          bonus = 50;
          n[turn] = 0;
          setShowComboBonus({team: turn, show: true});
          setTimeout(() => setShowComboBonus({team: turn, show: false}), 2000);
        }
        
        setScore(sc => { const ns = [...sc]; ns[turn] += 100 + bonus; return ns; });
        return n;
      });
      
    } else {
      playBuzz();
      const newCards = [...cards];
      newCards[activeCard].flipped = false;
      setCards(newCards);
      setCombo(p => { const n = [...p]; n[turn] = 0; return n; });
      setTurn(p => (p + 1) % 2);
    }
    setActiveCard(null);
  };



  const isGameOver = cards.every(c => c.solved);

  if (isGameOver) {
    const maxScore = Math.max(score[0], score[1]);
    const totalCards = cards.length / 2;
    if (onGameEnd && !gameEndedRef.current) {
      gameEndedRef.current = true;
      onGameEnd(maxScore * 10, maxScore, totalCards);
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>
        <h1 className="text-6xl mb-4">🎉</h1>
        <h2 className="text-4xl font-bold text-white mb-8 drop-shadow-lg">TRÒ CHƠI KẾT THÚC!</h2>
        <div className="flex gap-12">
          <div className={`p-8 rounded-3xl backdrop-blur-md ${score[0] > score[1] ? 'bg-yellow-400/90 text-yellow-900 scale-110 shadow-2xl shadow-yellow-500/50 ring-4 ring-yellow-300' : 'bg-white/20 text-white'} transition-all`}>
            <h3 className="text-2xl font-bold mb-2">🏆 Đội 1</h3>
            <p className="text-5xl font-black">{score[0]}</p>
          </div>
          <div className={`p-8 rounded-3xl backdrop-blur-md ${score[1] > score[0] ? 'bg-yellow-400/90 text-yellow-900 scale-110 shadow-2xl shadow-yellow-500/50 ring-4 ring-yellow-300' : 'bg-white/20 text-white'} transition-all`}>
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
    <div className="p-6 md:p-8 h-full flex flex-col items-center" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* Score Board */}
      <div className="flex justify-between w-full max-w-5xl mb-6 relative">
        <div className={`p-5 rounded-3xl flex flex-col items-center transition-all duration-300 shadow-lg min-w-[120px]
          ${turn === 0 ? 'text-white scale-110 ring-4 ring-white/50' : 'bg-white/80 text-gray-500 backdrop-blur'}`}
          style={turn === 0 ? { background: 'linear-gradient(135deg, #667EEA, #764BA2)' } : {}}>
          <span className="text-sm font-bold uppercase tracking-wider opacity-80">⚡ Đội 1</span>
          <span className="text-4xl font-black">{score[0]}</span>
          <div className="flex gap-1 mt-2">
            {[0,1,2].map(i => (
              <div key={i} className={`w-6 h-2 rounded-full transition-all ${i < combo[0] ? 'bg-yellow-400 shadow-sm shadow-yellow-400/50' : 'bg-black/10'}`}></div>
            ))}
          </div>
          {showComboBonus.show && showComboBonus.team === 0 && (
            <div className="absolute -top-8 text-yellow-500 font-black text-2xl animate-bounce drop-shadow-lg">🔥 +50 COMBO!</div>
          )}
        </div>
        
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
            Lật Thẻ Bí Ẩn
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">🔥 Lật đúng 3 thẻ liên tiếp = +50 điểm</p>
        </div>

        <div className={`p-5 rounded-3xl flex flex-col items-center transition-all duration-300 shadow-lg min-w-[120px]
          ${turn === 1 ? 'text-white scale-110 ring-4 ring-white/50' : 'bg-white/80 text-gray-500 backdrop-blur'}`}
          style={turn === 1 ? { background: 'linear-gradient(135deg, #FC5C7D, #6A82FB)' } : {}}>
          <span className="text-sm font-bold uppercase tracking-wider opacity-80">⚡ Đội 2</span>
          <span className="text-4xl font-black">{score[1]}</span>
          <div className="flex gap-1 mt-2">
            {[0,1,2].map(i => (
              <div key={i} className={`w-6 h-2 rounded-full transition-all ${i < combo[1] ? 'bg-yellow-400 shadow-sm shadow-yellow-400/50' : 'bg-black/10'}`}></div>
            ))}
          </div>
          {showComboBonus.show && showComboBonus.team === 1 && (
            <div className="absolute -top-8 text-yellow-500 font-black text-2xl animate-bounce drop-shadow-lg">🔥 +50 COMBO!</div>
          )}
        </div>
      </div>

      {activeCard === null ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-5xl perspective-1000">
          {cards.map((c, i) => (
            <div 
              key={i} 
              onClick={() => handleCardClick(i)} 
              className={`relative aspect-[3/4] cursor-pointer transition-all duration-700 transform-style-3d 
                ${c.solved ? 'opacity-0 pointer-events-none scale-75' : 'hover:scale-105 hover:-translate-y-2'} 
                ${c.flipped ? 'rotate-y-180' : ''}`}
            >
              {/* Front of card - Colorful */}
              <div 
                className="absolute inset-0 rounded-2xl md:rounded-3xl shadow-xl backface-hidden flex flex-col items-center justify-center text-white border-4 border-white/30 overflow-hidden"
                style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}
              >
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 3px 3px, rgba(255,255,255,0.4) 1px, transparent 0)',
                  backgroundSize: '16px 16px'
                }}></div>
                {/* Shine effect */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-3xl"></div>
                
                <span className="text-3xl md:text-4xl mb-2 drop-shadow-lg relative z-10">{CARD_EMOJIS[i % CARD_EMOJIS.length]}</span>
                <span className="text-4xl md:text-5xl font-black drop-shadow-lg relative z-10">{i + 1}</span>
              </div>
              
              {/* Back of card */}
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl shadow-xl backface-hidden rotate-y-180 bg-white border-4 flex flex-col items-center justify-center"
                style={{ borderColor: CARD_COLORS[i % CARD_COLORS.length].includes('#FF6B6B') ? '#FF6B6B' : CARD_COLORS[i % CARD_COLORS.length].match(/#[A-Fa-f0-9]{6}/)?.[0] || '#8b5cf6' }}>
                <span className="text-5xl md:text-6xl">❓</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl w-full max-w-4xl text-center border-4"
          style={{ borderImage: 'linear-gradient(135deg, #667EEA, #764BA2, #f093fb) 1', borderImageSlice: 1, borderStyle: 'solid' }}>
          <div className="inline-block px-6 py-2 rounded-full font-bold mb-6 text-white shadow-md"
            style={{ background: CARD_COLORS[activeCard % CARD_COLORS.length] }}>
            ✨ Thẻ số {activeCard + 1}
          </div>
          {cards[activeCard].q.image && <img src={cards[activeCard].q.image} className="max-h-48 object-contain mx-auto mb-6 rounded-xl" alt="Hình minh họa" />}
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-gray-800 leading-relaxed"><MathContent html={cards[activeCard].q.text} /></h2>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {cards[activeCard].q.options.map((opt, i) => {
              const optColors = [
                'hover:bg-red-50 hover:border-red-400',
                'hover:bg-blue-50 hover:border-blue-400',
                'hover:bg-green-50 hover:border-green-400',
                'hover:bg-purple-50 hover:border-purple-400',
              ];
              const optBadgeColors = [
                'bg-red-100 text-red-600',
                'bg-blue-100 text-blue-600',
                'bg-green-100 text-green-600',
                'bg-purple-100 text-purple-600',
              ];
              return (
                <button 
                  key={i} 
                  onClick={() => handleAnswer(i)} 
                  className={`p-4 md:p-6 bg-gray-50 border-2 border-gray-200 ${optColors[i]} rounded-2xl text-lg md:text-xl font-bold transition-all hover:scale-105 flex items-center gap-3 md:gap-4 text-left`}
                >
                  <span className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center ${optBadgeColors[i]} rounded-full font-black text-xl md:text-2xl flex-shrink-0`}>
                    {['A', 'B', 'C', 'D'][i]}
                  </span>
                  <span className="flex-1 text-gray-700"><MathContent html={opt} /></span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

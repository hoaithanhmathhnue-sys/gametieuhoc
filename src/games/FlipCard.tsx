import React, { useState } from 'react';
import { Question } from '../types';
import { playFlip, playDing, playBuzz } from '../utils/audio';

export default function FlipCard({ questions, onReplay }: { questions: Question[], onReplay?: () => void }) {
  if (!questions || questions.length === 0) {
    return <div className="p-8 text-center">Không có câu hỏi nào để chơi.</div>;
  }

  const [cards, setCards] = useState(questions.slice(0, 12).map((q, i) => ({ id: i, q, flipped: false, solved: false })));
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [score, setScore] = useState([0, 0]);
  const [turn, setTurn] = useState(0);
  const [combo, setCombo] = useState([0, 0]);
  const [showComboBonus, setShowComboBonus] = useState<{team: number, show: boolean}>({team: 0, show: false});

  const handleCardClick = (i: number) => {
    if (activeCard !== null || cards[i].solved || cards[i].flipped) return;
    playFlip();
    const newCards = [...cards];
    newCards[i].flipped = true;
    setCards(newCards);
    setTimeout(() => {
      setActiveCard(i);
    }, 600); // Wait for flip animation
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
          n[turn] = 0; // Reset combo after bonus
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
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-purple-50">
        <h1 className="text-6xl mb-4">🎉</h1>
        <h2 className="text-4xl font-bold text-purple-600 mb-8">TRÒ CHƠI KẾT THÚC!</h2>
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
          <button onClick={onReplay} className="mt-8 px-8 py-3 bg-purple-600 text-white font-bold text-lg rounded-xl hover:bg-purple-700 transition-colors">
            🔄 Chơi lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col items-center bg-gray-50">
      <div className="flex justify-between w-full max-w-5xl mb-8 relative">
        <div className={`p-6 rounded-3xl flex flex-col items-center ${turn===0?'bg-blue-500 text-white shadow-xl scale-110':'bg-white text-gray-500'} transition-all duration-300`}>
          <span className="text-lg font-bold uppercase tracking-wider opacity-80">Đội 1</span>
          <span className="text-4xl font-black">{score[0]}</span>
          <div className="flex gap-1 mt-2 h-2">
            {[0,1,2].map(i => <div key={i} className={`w-6 h-2 rounded-full ${i < combo[0] ? 'bg-yellow-400' : 'bg-black/10'}`}></div>)}
          </div>
          {showComboBonus.show && showComboBonus.team === 0 && <div className="absolute -top-8 text-yellow-500 font-black text-2xl animate-bounce">+50 COMBO!</div>}
        </div>
        
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-4xl font-black text-purple-600 tracking-tight uppercase">Lật thẻ bí ẩn</h1>
          <p className="text-gray-500 font-medium mt-2">Lật đúng 3 thẻ liên tiếp để nhận +50 điểm</p>
        </div>

        <div className={`p-6 rounded-3xl flex flex-col items-center ${turn===1?'bg-red-500 text-white shadow-xl scale-110':'bg-white text-gray-500'} transition-all duration-300`}>
          <span className="text-lg font-bold uppercase tracking-wider opacity-80">Đội 2</span>
          <span className="text-4xl font-black">{score[1]}</span>
          <div className="flex gap-1 mt-2 h-2">
            {[0,1,2].map(i => <div key={i} className={`w-6 h-2 rounded-full ${i < combo[1] ? 'bg-yellow-400' : 'bg-black/10'}`}></div>)}
          </div>
          {showComboBonus.show && showComboBonus.team === 1 && <div className="absolute -top-8 text-yellow-500 font-black text-2xl animate-bounce">+50 COMBO!</div>}
        </div>
      </div>

      {activeCard === null ? (
        <div className="grid grid-cols-4 gap-6 w-full max-w-5xl perspective-1000">
          {cards.map((c, i) => (
            <div 
              key={i} 
              onClick={() => handleCardClick(i)} 
              className={`relative aspect-[3/4] cursor-pointer transition-all duration-700 transform-style-3d 
                ${c.solved ? 'opacity-0 pointer-events-none scale-90' : 'hover:scale-105'} 
                ${c.flipped ? 'rotate-y-180' : ''}`}
            >
              {/* Front of card (Pattern) */}
              <div className="absolute inset-0 rounded-3xl shadow-lg backface-hidden flex items-center justify-center text-white text-6xl font-black border-4 border-white/20"
                   style={{
                     background: 'linear-gradient(135deg, #8b5cf6 0%, #4f46e5 100%)',
                     backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)',
                     backgroundSize: '20px 20px'
                   }}>
                <span className="drop-shadow-md">{i + 1}</span>
              </div>
              
              {/* Back of card (Question mark) */}
              <div className="absolute inset-0 rounded-3xl shadow-xl backface-hidden rotate-y-180 bg-white border-4 border-purple-200 flex items-center justify-center text-purple-500 text-6xl font-black">
                ?
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-10 rounded-[2rem] shadow-2xl w-full max-w-4xl text-center animate-in zoom-in duration-300 border-4 border-purple-100">
          <div className="inline-block bg-purple-100 text-purple-800 px-6 py-2 rounded-full font-bold mb-8">
            Thẻ số {activeCard + 1}
          </div>
          {cards[activeCard].q.image && <img src={cards[activeCard].q.image} className="h-48 object-contain mx-auto mb-8 rounded-xl" />}
          <h2 className="text-3xl font-bold mb-10 text-gray-800 leading-relaxed">{cards[activeCard].q.text}</h2>
          <div className="grid grid-cols-2 gap-6">
            {cards[activeCard].q.options.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => handleAnswer(i)} 
                className="p-6 bg-gray-50 border-2 border-gray-200 hover:bg-purple-50 hover:border-purple-400 rounded-2xl text-xl font-bold transition-all hover:scale-105 flex items-center gap-4 text-left"
              >
                <span className="w-12 h-12 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full font-black text-2xl">
                  {['A', 'B', 'C', 'D'][i]}
                </span>
                <span className="flex-1 text-gray-700">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

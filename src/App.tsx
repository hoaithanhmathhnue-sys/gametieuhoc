import React, { useState, useEffect } from 'react';
import { AppData } from './types';
import { loadData } from './store';
import Manage from './Manage';
import GameSetup from './GameSetup';
import Millionaire from './games/Millionaire';
import Obstacle from './games/Obstacle';
import FlipCard from './games/FlipCard';
import GoldenBell from './games/GoldenBell';
import Flower from './games/Flower';
import Crossword from './games/Crossword';
import { Settings, Play, ArrowLeft } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [screen, setScreen] = useState<string>('home');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [gameQuestions, setGameQuestions] = useState<any[]>([]);

  useEffect(() => {
    setData(loadData());
  }, []);

  if (!data) return null;

  const games = [
    { id: 'millionaire', name: 'Ai là triệu phú', icon: '🏆', desc: 'Trả lời câu hỏi để giành chiến thắng', color: 'bg-blue-500' },
    { id: 'obstacle', name: 'Vượt chướng ngại vật', icon: '🏃', desc: 'Đua top về đích với 20 bước', color: 'bg-green-500' },
    { id: 'flipcard', name: 'Lật thẻ bí ẩn', icon: '🃏', desc: 'Lật thẻ và trả lời câu hỏi', color: 'bg-purple-500' },
    { id: 'goldenbell', name: 'Rung chuông vàng', icon: '🔔', desc: 'Loại trực tiếp, tìm người cuối cùng', color: 'bg-yellow-500' },
    { id: 'flower', name: 'Hái hoa dân chủ', icon: '🌸', desc: 'Chọn hoa và trả lời câu hỏi', color: 'bg-pink-500' },
    { id: 'crossword', name: 'Ô chữ thần kỳ', icon: '🔤', desc: 'Giải mã ô chữ bí ẩn', color: 'bg-indigo-500' },
  ];

  const handleStartGame = (gameId: string, questions: any[]) => {
    setGameQuestions(questions);
    setScreen(gameId);
    setSelectedGame(null);
  };

  return (
    <div className="min-h-screen bg-blue-50 font-sans text-gray-800">
      {screen === 'home' && !selectedGame && (
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex justify-between items-center mb-12 bg-white p-4 rounded-2xl shadow-sm">
            <h1 className="text-3xl font-bold text-blue-600 flex items-center gap-3">
              <span className="text-4xl">🎮</span> GÓC GAME LỚP HỌC
            </h1>
            <button onClick={() => setScreen('manage')} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-medium transition-colors">
              <Settings size={20} /> Quản lý câu hỏi
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map(g => (
              <div key={g.id} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 border border-gray-100">
                <div className={`w-16 h-16 ${g.color} rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-inner text-white`}>
                  {g.icon}
                </div>
                <h2 className="text-xl font-bold mb-2">{g.name}</h2>
                <p className="text-gray-500 mb-6 h-12">{g.desc}</p>
                <button onClick={() => setSelectedGame(g.id)} className="w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 flex justify-center items-center gap-2 transition-colors">
                  <Play size={18} /> Chơi ngay
                </button>
              </div>
            ))}
          </div>

          <footer className="mt-12 text-center py-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-blue-600">Phát triển bởi thầy: Trần Hoài Thanh</p>
            <p className="text-gray-500 mt-1">Tham gia khóa tạo app, viết SKKN, nhóm VIP KIM CƯƠNG liên hệ zalo: <a href="https://zalo.me/0348296773" target="_blank" rel="noopener noreferrer" className="text-blue-500 font-semibold hover:underline">0348296773</a></p>
          </footer>
        </div>
      )}

      {selectedGame && (
        <GameSetup 
          gameId={selectedGame} 
          gameName={games.find(g => g.id === selectedGame)?.name}
          data={data} 
          onBack={() => setSelectedGame(null)} 
          onStart={(qs) => handleStartGame(selectedGame, qs)} 
        />
      )}

      {screen === 'manage' && <Manage data={data} onBack={() => setScreen('home')} onDataChange={setData} />}
      
      {screen !== 'home' && screen !== 'manage' && (
        <div className="min-h-screen flex flex-col">
          <div className="p-4 absolute top-0 left-0 z-50">
            <button onClick={() => setScreen('home')} className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-white transition-colors">
              <ArrowLeft size={20} /> Quay lại
            </button>
          </div>
          <div className="flex-1 relative">
            {screen === 'millionaire' && <Millionaire questions={gameQuestions} onReplay={() => { setSelectedGame('millionaire'); setScreen('home'); }} />}
            {screen === 'obstacle' && <Obstacle questions={gameQuestions} onReplay={() => { setSelectedGame('obstacle'); setScreen('home'); }} />}
            {screen === 'flipcard' && <FlipCard questions={gameQuestions} onReplay={() => { setSelectedGame('flipcard'); setScreen('home'); }} />}
            {screen === 'goldenbell' && <GoldenBell questions={gameQuestions} onReplay={() => { setSelectedGame('goldenbell'); setScreen('home'); }} />}
            {screen === 'flower' && <Flower questions={gameQuestions} onReplay={() => { setSelectedGame('flower'); setScreen('home'); }} />}
            {screen === 'crossword' && <Crossword questions={gameQuestions} onReplay={() => { setSelectedGame('crossword'); setScreen('home'); }} />}
          </div>
        </div>
      )}
    </div>
  );
}

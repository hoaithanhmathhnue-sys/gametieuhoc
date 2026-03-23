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
import { Settings, Play, ArrowLeft, Trophy, Award, HelpCircle, Home, Star, Medal, BookOpen, Gamepad2, Sparkles, Crown, Users } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [screen, setScreen] = useState<string>('home');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [gameQuestions, setGameQuestions] = useState<any[]>([]);
  const [activeNav, setActiveNav] = useState('home');

  useEffect(() => {
    setData(loadData());
  }, []);

  if (!data) return null;

  const games = [
    { id: 'millionaire', name: 'Ai là triệu phú', icon: '🏆', desc: 'Vượt qua các câu hỏi hóc búa để chinh phục đỉnh cao trí tuệ và nhận phần thưởng lớn.', color: 'bg-amber-400', iconBg: 'bg-amber-100' },
    { id: 'obstacle', name: 'Vượt chướng ngại vật', icon: '🏃', desc: 'Nhanh mắt nhanh tay giải mã các từ khóa để về đích sớm nhất trong cuộc đua này.', color: 'bg-teal-500', iconBg: 'bg-teal-100' },
    { id: 'flipcard', name: 'Lật thẻ bí ẩn', icon: '🃏', desc: 'Thử thách trí nhớ siêu phàm bằng cách tìm ra các cặp thẻ bài giống nhau ẩn giấu.', color: 'bg-emerald-500', iconBg: 'bg-emerald-100' },
    { id: 'goldenbell', name: 'Rung chuông vàng', icon: '🔔', desc: 'Sàn đấu tri thức dành cho những bạn nhỏ tự tin nhất. Ai sẽ là người cuối cùng?', color: 'bg-rose-500', iconBg: 'bg-rose-100' },
    { id: 'flower', name: 'Hái hoa dân chủ', icon: '🌸', desc: 'Chọn cho mình một bông hoa may mắn và trả lời câu hỏi để nhận những món quà bất ngờ.', color: 'bg-pink-500', iconBg: 'bg-pink-100' },
    { id: 'crossword', name: 'Ô chữ thần kỳ', icon: '🔤', desc: 'Khám phá các hàng ngang bí mật để tìm ra từ khóa trung tâm của trò chơi.', color: 'bg-indigo-500', iconBg: 'bg-indigo-100' },
  ];

  const handleStartGame = (gameId: string, questions: any[]) => {
    setGameQuestions(questions);
    setScreen(gameId);
    setSelectedGame(null);
  };

  const navigateTo = (nav: string) => {
    setActiveNav(nav);
    setScreen(nav === 'home' ? 'home' : nav);
    setSelectedGame(null);
  };

  // ===== CHALLENGE PAGE =====
  const ChallengeScreen = () => (
    <div className="min-h-screen animated-bg">
      <div className="max-w-4xl mx-auto p-6 pt-28">
        <div className="glass rounded-3xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-4">🎯 Thử Thách Hàng Tuần</h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">Hoàn thành các thử thách để nhận huy hiệu và leo bảng xếp hạng!</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[
              { title: 'Chinh phục 5 game', desc: 'Chơi ít nhất 5 game trong tuần', icon: '🎮', progress: 60 },
              { title: 'Trả lời đúng 30 câu', desc: 'Tích lũy 30 câu trả lời đúng', icon: '✅', progress: 40 },
              { title: 'Điểm hoàn hảo', desc: 'Đạt điểm tối đa trong 1 game', icon: '💯', progress: 0 },
              { title: 'Nhà vô địch', desc: 'Đứng top 3 Bảng Vàng', icon: '👑', progress: 20 },
            ].map((challenge, i) => (
              <div key={i} className="bg-white/80 rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{challenge.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-800">{challenge.title}</h3>
                    <p className="text-sm text-gray-500">{challenge.desc}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-teal-400 to-teal-600 h-3 rounded-full transition-all duration-500" style={{ width: `${challenge.progress}%` }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">{challenge.progress}%</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-400 italic">✨ Tính năng đang được hoàn thiện, hãy quay lại nhé!</p>
        </div>
      </div>
    </div>
  );

  // ===== LEADERBOARD PAGE =====
  const LeaderboardScreen = () => {
    const mockPlayers = [
      { rank: 1, name: 'Minh Anh', score: 980, badge: '👑' },
      { rank: 2, name: 'Bảo Ngọc', score: 920, badge: '🥈' },
      { rank: 3, name: 'Đức Huy', score: 875, badge: '🥉' },
      { rank: 4, name: 'Thu Hà', score: 820, badge: '⭐' },
      { rank: 5, name: 'Quốc Anh', score: 790, badge: '⭐' },
      { rank: 6, name: 'Hồng Nhung', score: 750, badge: '⭐' },
      { rank: 7, name: 'Văn Đại', score: 710, badge: '⭐' },
      { rank: 8, name: 'Phương Linh', score: 680, badge: '⭐' },
    ];

    return (
      <div className="min-h-screen animated-bg">
        <div className="max-w-3xl mx-auto p-6 pt-28">
          <div className="glass rounded-3xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Crown size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-extrabold text-gray-800">🏅 Bảng Vàng Danh Dự</h2>
              <p className="text-gray-500 mt-2">Những ngôi sao sáng nhất lớp học!</p>
            </div>

            {/* Top 3 */}
            <div className="flex justify-center gap-4 mb-8">
              {mockPlayers.slice(0, 3).map((p, i) => (
                <div key={i} className={`text-center ${i === 0 ? 'order-2 -mt-4' : i === 1 ? 'order-1 mt-2' : 'order-3 mt-2'}`}>
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 w-20 h-20' : i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' : 'bg-gradient-to-br from-orange-400 to-orange-600'}`}>
                    {p.badge}
                  </div>
                  <p className="font-bold text-gray-800 mt-2 text-sm">{p.name}</p>
                  <p className="text-teal-600 font-extrabold">{p.score}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="space-y-2">
              {mockPlayers.slice(3).map((p) => (
                <div key={p.rank} className="flex items-center gap-4 bg-white/70 rounded-xl px-5 py-3 hover:bg-white/90 transition-colors">
                  <span className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700 text-sm">{p.rank}</span>
                  <span className="text-lg">{p.badge}</span>
                  <span className="flex-1 font-semibold text-gray-700">{p.name}</span>
                  <span className="font-extrabold text-teal-600">{p.score} điểm</span>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-400 italic mt-6">✨ Dữ liệu minh họa - tính năng đang phát triển!</p>
          </div>
        </div>
      </div>
    );
  };

  // ===== GUIDE PAGE =====
  const GuideScreen = () => (
    <div className="min-h-screen animated-bg">
      <div className="max-w-4xl mx-auto p-6 pt-28">
        <div className="glass rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-800">📖 Hướng Dẫn Sử Dụng</h2>
            <p className="text-gray-500 mt-2">Cùng tìm hiểu cách chơi và quản lý nhé!</p>
          </div>

          <div className="space-y-6">
            {[
              {
                title: '🎮 Cách chơi game',
                steps: [
                  'Nhấn vào thẻ game bạn muốn chơi ở Trang Chủ.',
                  'Chọn Môn học, Chủ đề, Độ khó và Số câu hỏi.',
                  'Nhấn "BẮT ĐẦU CHƠI" và thưởng thức!',
                ]
              },
              {
                title: '📝 Quản lý câu hỏi',
                steps: [
                  'Nhấn nút "Quản lý" ở header.',
                  'Tạo Môn học → Chủ đề → Nhập câu hỏi.',
                  'Có thể nhập từng câu hoặc upload file (.docx).',
                ]
              },
              {
                title: '🏆 Các game có sẵn',
                steps: [
                  'Ai là triệu phú – Trả lời câu hỏi trắc nghiệm.',
                  'Vượt chướng ngại vật – Đua tốc độ trả lời.',
                  'Lật thẻ bí ẩn – Thử thách trí nhớ.',
                  'Rung chuông vàng – Thi đấu loại trực tiếp.',
                  'Hái hoa dân chủ – Chọn hoa, trả lời câu hỏi.',
                  'Ô chữ thần kỳ – Giải mã ô chữ bí ẩn.',
                ]
              },
              {
                title: '💡 Mẹo hay',
                steps: [
                  'Upload file Word (.docx) để nhập nhanh câu hỏi.',
                  'Phân loại câu hỏi theo Chủ đề để dễ quản lý.',
                  'Thử nhiều game khác nhau để ôn bài hiệu quả!',
                ]
              }
            ].map((section, i) => (
              <div key={i} className="bg-white/80 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{section.title}</h3>
                <ol className="space-y-2">
                  {section.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-teal-100 flex-shrink-0 flex items-center justify-center text-xs font-bold text-teal-700">{j + 1}</span>
                      <span className="text-gray-600">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ===== HEADER COMPONENT =====
  const Header = () => (
    <header className="fixed top-0 w-full z-50 px-4 md:px-6 py-3 glass-header">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('home')}>
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white shadow-lg text-xl">
            🎮
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-teal-700 tracking-tight leading-tight">Học Mà Chơi</h1>
            <p className="text-[10px] md:text-xs text-gray-500 leading-tight">Phát triển bởi thầy Trần Hoài Thanh - Zalo: 0348296773</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {[
            { id: 'home', label: 'Trang Chủ', icon: <Home size={16} /> },
            { id: 'challenge', label: 'Thử Thách', icon: <Sparkles size={16} /> },
            { id: 'leaderboard', label: 'Bảng Vàng', icon: <Trophy size={16} /> },
            { id: 'guide', label: 'Hướng Dẫn', icon: <HelpCircle size={16} /> },
          ].map(nav => (
            <button
              key={nav.id}
              onClick={() => navigateTo(nav.id)}
              className={`nav-link flex items-center gap-1.5 font-bold text-sm pb-1 ${activeNav === nav.id ? 'active text-teal-700' : 'text-gray-500 hover:text-teal-600'}`}
            >
              {nav.icon}
              {nav.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('manage')}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 hover:scale-105 transition-transform text-sm font-bold text-gray-700 hover:text-teal-700"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Quản lý</span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden justify-center gap-1 mt-2 px-2">
        {[
          { id: 'home', label: 'Trang Chủ', icon: <Home size={14} /> },
          { id: 'challenge', label: 'Thử Thách', icon: <Sparkles size={14} /> },
          { id: 'leaderboard', label: 'Bảng Vàng', icon: <Trophy size={14} /> },
          { id: 'guide', label: 'Hướng Dẫn', icon: <HelpCircle size={14} /> },
        ].map(nav => (
          <button
            key={nav.id}
            onClick={() => navigateTo(nav.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeNav === nav.id ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            {nav.icon}
            {nav.label}
          </button>
        ))}
      </div>
    </header>
  );

  // ===== FOOTER COMPONENT =====
  const Footer = () => (
    <footer className="w-full py-8 mt-12 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t-4 border-teal-500">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <a href="https://giaovienai.vercel.app/" target="_blank" rel="noopener noreferrer" 
            className="group flex items-center gap-4 bg-white/10 hover:bg-teal-600/30 p-4 rounded-2xl transition-all hover:scale-[1.02] border border-white/10 hover:border-teal-400/50">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0">🤖</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">Tool AI dành cho giáo viên</p>
              <p className="text-teal-300 text-xs">Web tổng hợp công cụ AI</p>
            </div>
            <span className="px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-lg group-hover:bg-teal-400 transition-colors whitespace-nowrap">Truy cập →</span>
          </a>
          <a href="https://zalo.me/g/urhxrf976" target="_blank" rel="noopener noreferrer" 
            className="group flex items-center gap-4 bg-white/10 hover:bg-blue-600/30 p-4 rounded-2xl transition-all hover:scale-[1.02] border border-white/10 hover:border-blue-400/50">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0">👥</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">Cộng đồng GV ứng dụng AI</p>
              <p className="text-blue-300 text-xs">GROUP 3 - Zalo</p>
            </div>
            <span className="px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg group-hover:bg-blue-400 transition-colors whitespace-nowrap">Tham gia →</span>
          </a>
          <a href="https://forms.gle/oucuSuzbkad5sSTQ9" target="_blank" rel="noopener noreferrer" 
            className="group flex items-center gap-4 bg-white/10 hover:bg-amber-600/30 p-4 rounded-2xl transition-all hover:scale-[1.02] border border-white/10 hover:border-amber-400/50">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0">📚</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">Khóa học tạo App giáo dục</p>
              <p className="text-amber-300 text-xs">Đăng ký ngay hôm nay</p>
            </div>
            <span className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg group-hover:bg-amber-400 transition-colors whitespace-nowrap">Đăng ký →</span>
          </a>
        </div>
        <div className="text-center pt-4 border-t border-white/10">
          <p className="text-gray-400 text-xs">© 2024 Góc Game Lớp Học — Phát triển bởi thầy Trần Hoài Thanh</p>
        </div>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen font-sans text-gray-800 relative overflow-hidden">
      {/* Pages with header */}
      {(screen === 'home' || screen === 'challenge' || screen === 'leaderboard' || screen === 'guide') && !selectedGame && (
        <>
          <Header />

          {screen === 'home' && (
            <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 20%, #e8eaf6 40%, #f3e5f5 60%, #fff3e0 80%, #e0f7fa 100%)' }}>
              {/* Floating Particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="floating-particle"
                    style={{
                      left: `${Math.random() * 100}%`,
                      width: `${10 + Math.random() * 25}px`,
                      height: `${10 + Math.random() * 25}px`,
                      background: ['#80cbc4', '#7986cb', '#f48fb1', '#ffb74d', '#81d4fa', '#a5d6a7', '#ce93d8', '#fff176'][i % 8],
                      animationDuration: `${5 + Math.random() * 8}s`,
                      animationDelay: `${Math.random() * 4}s`,
                      borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '30% 70% 53% 47% / 26% 46% 54% 74%' : '20%',
                    }}
                  />
                ))}
                {/* Decorative shapes */}
                <div className="absolute top-32 left-10 w-40 h-40 bg-indigo-200/30 rounded-full blur-3xl" />
                <div className="absolute top-60 right-20 w-60 h-60 bg-pink-200/30 rounded-full blur-3xl" />
                <div className="absolute bottom-40 left-1/3 w-48 h-48 bg-amber-200/30 rounded-full blur-3xl" />
              </div>

              <div className="max-w-7xl mx-auto p-6 pt-32 md:pt-28 relative z-10">
                {/* Hero Section */}
                <section className="mb-14 text-center" style={{ animation: 'slide-up 0.6s ease-out' }}>
                  {/* Decorative icons */}
                  <div className="flex justify-center gap-3 mb-4">
                    {['📚', '🎯', '🧠', '⭐', '🏆', '🎨'].map((emoji, i) => (
                      <span key={i} className="text-2xl md:text-3xl animate-bounce" style={{ animationDelay: `${i * 0.15}s`, animationDuration: '2s' }}>{emoji}</span>
                    ))}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black mb-5 tracking-tight leading-none">
                    <span className="inline-block" style={{
                      background: 'linear-gradient(90deg, #00897b, #6366f1, #ec4899, #f59e0b, #8b5cf6, #10b981)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      HỌC VUI MỖI NGÀY
                    </span>
                  </h2>
                  <p className="text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
                    <span className="text-teal-600">Khám phá </span>
                    <span className="text-indigo-600">thế giới kiến thức </span>
                    <span className="text-pink-600">qua những trò chơi </span>
                    <span className="text-amber-600">vui nhộn </span>
                    <span className="text-purple-600">và đầy thử thách </span>
                    <span className="text-emerald-600">cùng bạn bè nhé! </span>
                    <span className="text-2xl">🌟</span>
                  </p>
                </section>

                {/* Games Grid (3D Bento Style) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {games.map((g, idx) => {
                    const cardGradients = [
                      'from-amber-50 to-orange-50 border-amber-200/60 hover:border-amber-400',
                      'from-teal-50 to-cyan-50 border-teal-200/60 hover:border-teal-400',
                      'from-emerald-50 to-green-50 border-emerald-200/60 hover:border-emerald-400',
                      'from-rose-50 to-pink-50 border-rose-200/60 hover:border-rose-400',
                      'from-pink-50 to-fuchsia-50 border-pink-200/60 hover:border-pink-400',
                      'from-indigo-50 to-violet-50 border-indigo-200/60 hover:border-indigo-400',
                    ];
                    const btnColors = [
                      'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600',
                      'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600',
                      'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600',
                      'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600',
                      'bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600',
                      'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600',
                    ];
                    const tagLabels = ['🔥 Hot', '⚡ Hấp dẫn', '🎯 Trí nhớ', '🔔 Kịch tính', '🌈 Vui nhộn', '🧩 Khám phá'];
                    return (
                      <div
                        key={g.id}
                        className={`group relative bg-gradient-to-br ${cardGradients[idx]} backdrop-blur-sm rounded-3xl p-7 shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:scale-[1.03] hover:-translate-y-2 transition-all duration-400 cursor-pointer flex flex-col items-start overflow-visible border-2`}
                        style={{ animation: `pop-in 0.5s ease-out ${idx * 0.1}s both` }}
                        onClick={() => setSelectedGame(g.id)}
                      >
                        {/* 3D Icon Badge */}
                        <div className={`absolute -top-6 right-6 w-16 h-16 ${g.iconBg} rounded-2xl flex items-center justify-center text-3xl shadow-[0_8px_25px_rgba(0,0,0,0.15)] border-2 border-white/80 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
                          style={{ boxShadow: '0 8px 25px rgba(0,0,0,0.15), inset 0 -3px 0 rgba(0,0,0,0.1)' }}>
                          {g.icon}
                        </div>

                        {/* Tag */}
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/80 text-gray-500 mb-2 shadow-sm">{tagLabels[idx]}</span>

                        {/* Title */}
                        <h3 className="text-xl font-extrabold mb-2 text-gray-800 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-teal-600 group-hover:to-indigo-600 transition-all">{g.name}</h3>
                        <p className="text-gray-500 mb-6 text-sm line-clamp-2 leading-relaxed">{g.desc}</p>

                        {/* Play Button */}
                        <button className={`${btnColors[idx]} mt-auto w-full py-3.5 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all`}
                          style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 -2px 0 rgba(0,0,0,0.15)' }}>
                          <Play size={18} />
                          Chơi ngay
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Footer />
            </div>
          )}

          {screen === 'challenge' && <><ChallengeScreen /><Footer /></>}
          {screen === 'leaderboard' && <><LeaderboardScreen /><Footer /></>}
          {screen === 'guide' && <><GuideScreen /><Footer /></>}
        </>
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

      {screen === 'manage' && <Manage data={data} onBack={() => { setScreen('home'); setActiveNav('home'); }} onDataChange={setData} />}

      {screen !== 'home' && screen !== 'manage' && screen !== 'challenge' && screen !== 'leaderboard' && screen !== 'guide' && (
        <div className="min-h-screen flex flex-col">
          <div className="p-4 absolute top-0 left-0 z-50">
            <button onClick={() => { setScreen('home'); setActiveNav('home'); }} className="flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-white transition-colors">
              <ArrowLeft size={20} /> Quay lại
            </button>
          </div>
          <div className="flex-1 relative">
            {screen === 'millionaire' && <Millionaire questions={gameQuestions} onReplay={() => { setSelectedGame('millionaire'); setScreen('home'); }} />}
            {screen === 'obstacle' && <Obstacle questions={gameQuestions} onReplay={() => { setSelectedGame('obstacle'); setScreen('home'); }} />}
            {screen === 'flipcard' && <FlipCard questions={gameQuestions} onReplay={() => { setSelectedGame('flipcard'); setScreen('home'); }} />}
            {screen === 'goldenbell' && <GoldenBell questions={gameQuestions} onReplay={() => { setSelectedGame('goldenbell'); setScreen('home'); }} />}
            {screen === 'flower' && <Flower questions={gameQuestions} onReplay={() => { setSelectedGame('flower'); setScreen('home'); }} />}
            {screen === 'crossword' && <Crossword questions={gameQuestions} crosswordConfig={data.gameSettings?.crossword?.config} onReplay={() => { setSelectedGame('crossword'); setScreen('home'); }} />}
          </div>
        </div>
      )}
    </div>
  );
}

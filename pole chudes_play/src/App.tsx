import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Sparkles, Code2, GraduationCap, Zap, AppWindow, RotateCcw, Trophy } from 'lucide-react';
import { CATEGORIES, PHRASES } from './constants';
import { Wheel } from './Wheel';
import LetterGlitch from './LetterGlitch';

type GameStage = 'START' | 'PLAYING' | 'RESULT' | 'FINAL';

interface SpinResult {
  category: string;
  phrase: string;
}

export default function App() {
  const [stage, setStage] = useState<GameStage>('START');
  const [results, setResults] = useState<SpinResult[]>([]);
  const [currentResult, setCurrentResult] = useState<SpinResult | null>(null);
  const [usedPhrases, setUsedPhrases] = useState<Record<string, Set<string>>>({});
  const [isSpinning, setIsSpinning] = useState(false);

  const MAX_SPINS = 4;

  const handleSpinEnd = useCallback((categoryId: string) => {
    const categoryPhrases = PHRASES[categoryId];
    const categoryUsed = usedPhrases[categoryId] || new Set();
    
    // Filter out used phrases
    const availablePhrases = categoryPhrases.filter(p => !categoryUsed.has(p));
    
    // Fallback if all phrases used (unlikely in 4 spins)
    const phrase = availablePhrases.length > 0 
      ? availablePhrases[Math.floor(Math.random() * availablePhrases.length)]
      : categoryPhrases[Math.floor(Math.random() * categoryPhrases.length)];

    const newResult = { category: categoryId, phrase };
    
    // Update used phrases
    setUsedPhrases(prev => ({
      ...prev,
      [categoryId]: new Set([...categoryUsed, phrase])
    }));

    setCurrentResult(newResult);
    setResults(prev => [...prev, newResult]);
    setStage('RESULT');

    // Trigger mini-confetti
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: [CATEGORIES.find(c => c.id === categoryId)?.color || '#ffffff']
    });
  }, [usedPhrases]);

  const nextAction = () => {
    if (results.length >= MAX_SPINS) {
      setStage('FINAL');
      // Final Fanfare
      const fanfare = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'); 
      fanfare.volume = 0.6;
      fanfare.play().catch(() => {});
      
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        scalar: 1.2
      });
    } else {
      setStage('PLAYING');
      setCurrentResult(null);
    }
  };

  const resetGame = () => {
    setStage('START');
    setResults([]);
    setCurrentResult(null);
    setUsedPhrases({});
  };

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'CODE': return <Code2 className="w-6 h-6" />;
      case 'WHO_AMI': return <Zap className="w-6 h-6" />;
      case 'STUDY': return <GraduationCap className="w-6 h-6" />;
      case 'FATE': return <Sparkles className="w-6 h-6" />;
      case 'SERVICE': return <AppWindow className="w-6 h-6" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d021b] text-white font-sans overflow-hidden selection:bg-purple-500/30 relative">
      {/* Background with people/AI vibe */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?auto=format&fit=crop&q=80&w=2048")',
          filter: 'brightness(0.2) saturate(1.5) contrast(1.1)',
        }}
      />

      {/* Magical Glows consistent with the image */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] left-[10%] w-[800px] h-[800px] bg-purple-900/40 blur-[180px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] right-[5%] w-[600px] h-[600px] bg-indigo-900/30 blur-[150px] rounded-full animate-pulse [animation-delay:3s]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-t from-purple-900/50 to-transparent" />
      </div>

      {/* Floating Sparkles */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:100px_100px] animate-[pulse_5s_infinite]" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <AnimatePresence mode="wait">
        {stage === 'START' && (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12"
          >
            <div className="relative space-y-4">
               <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-8xl md:text-[180px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-white to-purple-400 drop-shadow-[0_0_60px_rgba(168,85,247,0.6)]"
                >
                  AI
                </motion.div>
                <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter italic text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                  Поле чудес
                </h1>
            </div>

            <div className="max-w-xl p-8 rounded-2xl bg-gradient-to-b from-purple-900/60 to-black/80 border border-white/20 backdrop-blur-2xl shadow-[0_0_50px_rgba(147,51,234,0.3)]">
              <p className="text-white text-2xl md:text-3xl font-black mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] leading-tight">
                Твоя карьера вайбкодера зависит от одного поворота.
              </p>
              <button
                onClick={() => setStage('PLAYING')}
                className="px-14 py-6 bg-[#00ffa2] hover:bg-[#00ffd5] text-black font-black text-3xl uppercase rounded-2xl transition-all shadow-[0_0_40px_rgba(0,255,162,0.6)] hover:shadow-[0_0_80px_rgba(0,255,162,1)] transform hover:scale-110 active:scale-95"
              >
                Войти
              </button>
            </div>

            <p className="text-white font-bold text-sm tracking-[0.4em] uppercase mt-12 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
              Школа SSM Ксении Барановой • 2026
            </p>
          </motion.div>
        )}

        {stage === 'PLAYING' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 space-y-8"
          >
            {/* The "Book" Frame requested by user */}
            <div className="relative p-1 md:p-3 rounded-[40px] bg-gradient-to-br from-[#8F6B29] via-[#fcf6ba] to-[#aa771c] shadow-[0_0_100px_rgba(191,149,63,0.3)]">
              <div className="bg-[#120422] rounded-[32px] p-4 md:p-10 border-2 border-black/40 overflow-hidden relative">
                {/* Book Text Overlay Background */}
                <div className="absolute inset-0 opacity-5 flex flex-col items-center justify-between py-12 pointer-events-none select-none">
                  <span className="text-2xl font-serif">Школа SSM</span>
                  <span className="text-4xl font-serif text-center px-4">СЛОВАРЬ СЛЭНГА ВАЙБ КОДЕРА</span>
                  <span className="text-xl font-serif italic text-center">Первого потока курса "ВайбКОДИНГ-2026!"</span>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                   <div className="mb-6 text-center">
                    <h2 className="text-sm font-bold uppercase tracking-[0.5em] text-white/40 mb-2">
                      Попытка {results.length + 1} / {MAX_SPINS}
                    </h2>
                    <h3 className="text-xl font-serif italic text-[#fcf6ba] drop-shadow-[0_0_10px_rgba(252,246,186,0.3)]">
                      СЛОВАРЬ СЛЭНГА ВАЙБ КОДЕРА
                    </h3>
                  </div>

                  <Wheel 
                    onSpinEnd={handleSpinEnd} 
                    isSpinning={isSpinning}
                    setIsSpinning={setIsSpinning}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'RESULT' && currentResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-1 flex flex-col items-center justify-center p-6 text-center"
          >
            <div 
              className="relative p-12 rounded-[40px] border-4 space-y-8 max-w-xl w-full bg-[#11041c] shadow-2xl overflow-hidden"
              style={{ borderColor: CATEGORIES.find(c => c.id === currentResult.category)?.color }}
            >
              <div 
                className="absolute inset-0 opacity-20 blur-[100px] animate-pulse"
                style={{ backgroundColor: CATEGORIES.find(c => c.id === currentResult.category)?.color }}
              />
              
              <div 
                className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6 relative z-10 border-2"
                style={{ 
                  backgroundColor: `${CATEGORIES.find(c => c.id === currentResult.category)?.color}11`, 
                  color: CATEGORIES.find(c => c.id === currentResult.category)?.color,
                  borderColor: CATEGORIES.find(c => c.id === currentResult.category)?.color
                }}
              >
                {React.cloneElement(getCategoryIcon(currentResult.category) as React.ReactElement, { className: 'w-10 h-10' })}
              </div>
              
              <h3 className="text-2xl font-medium uppercase tracking-[0.3em] text-white/50 relative z-10">
                {CATEGORIES.find(c => c.id === currentResult.category)?.label}
              </h3>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-6xl font-black italic uppercase leading-tight text-white relative z-10 drop-shadow-lg"
              >
                {currentResult.phrase}
              </motion.h2>

              <div className="pt-10 relative z-10">
                <button
                  onClick={nextAction}
                  className="w-full py-6 bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#aa771c] text-black font-black text-2xl uppercase tracking-tighter hover:brightness-110 active:scale-95 transition-all rounded-3xl shadow-[0_0_50px_rgba(191,149,63,0.4)] hover:shadow-[0_0_70px_rgba(191,149,63,0.6)]"
                >
                  {results.length >= MAX_SPINS ? 'Узнать итог' : 'Продолжить'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'FINAL' && (
          <motion.div
            key="final"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 p-6 md:p-12 flex flex-col items-center justify-center space-y-12"
          >
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-yellow-500/20 text-[#fcf6ba] rounded-full mb-4 border-2 border-[#bf953f]/50 shadow-[0_0_60px_rgba(191,149,63,0.4)]">
                <Trophy className="w-12 h-12" />
              </div>
              <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#aa771c] drop-shadow-[0_0_30px_rgba(191,149,63,0.3)]">ИТОГИ ВАЙБКОДЕРА</h1>
              <p className="text-white text-2xl tracking-[0.2em] font-serif italic drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Пророчество Школы SSM</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full">
              {results.map((res, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15 }}
                  className="p-8 rounded-[32px] bg-black/40 border border-white/5 backdrop-blur-md flex items-center space-x-8 hover:bg-white/5 transition-all group"
                >
                   <div 
                    className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110"
                    style={{ 
                      backgroundColor: `${CATEGORIES.find(c => c.id === res.category)?.color}11`, 
                      color: CATEGORIES.find(c => c.id === res.category)?.color,
                      borderColor: `${CATEGORIES.find(c => c.id === res.category)?.color}33`
                    }}
                  >
                    {React.cloneElement(getCategoryIcon(res.category) as React.ReactElement, { className: 'w-8 h-8' })}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/50 mb-2">
                       {CATEGORIES.find(c => c.id === res.category)?.label}
                    </h4>
                    <p className="text-2xl md:text-3xl font-black italic text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] leading-tight">
                      {res.phrase}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="pt-12 flex flex-col items-center space-y-8">
              <p className="text-white text-lg max-w-lg text-center font-serif italic drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                Экзамен первого потока «ВайбКОДИНГ-2026» пройден. Судьба в твоих руках.
              </p>
              <button
                onClick={resetGame}
                className="group flex items-center space-x-6 px-10 py-5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 rounded-2xl text-white transition-all uppercase font-black tracking-[0.3em] text-sm shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-[0_0_50px_rgba(168,85,247,0.5)]"
              >
                <div className="p-2 bg-purple-500/20 rounded-full group-hover:rotate-180 transition-transform duration-700">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <span>Пройти инициацию заново</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signature Footer from Image */}
      <footer className="relative z-10 px-8 py-6 flex items-center justify-between text-[11px] text-white/30">
        <div className="font-serif italic text-2xl tracking-tighter opacity-60 text-white/70">
           Tanya Gaiduk
        </div>
        <div className="text-right space-y-1">
          <p>© 2026 Автор идеи ТАНЯ ГАЙДУК</p>
          <p>ученица 5 курса школы SSM Ксении Барановой</p>
        </div>
      </footer>

      {/* Retro overlays */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] z-[100] bg-[length:100%_2px]" />
      </div>
    </div>
  );
}

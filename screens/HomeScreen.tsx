
import React, { useState } from 'react';
import { Sun, Moon, Droplet, Zap, FastForward } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface HomeScreenProps {
  onStart: (isFastMode: boolean) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onStart }) => {
  const { theme, toggleTheme } = useTheme();
  const [isFastMode, setIsFastMode] = useState(false);

  return (
    <div className="flex flex-col h-full p-6 text-center justify-between animate-fade-in">
      <header className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <Droplet className="text-primary dark:text-primary-dark" size={28} />
            <h1 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Glic.A1</h1>
        </div>
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {theme === 'light' ? <Moon size={20} className="text-text-secondary-light dark:text-text-secondary-dark" /> : <Sun size={20} className="text-text-secondary-light dark:text-text-secondary-dark" />}
        </button>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center">
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-primary/20 dark:bg-primary-dark/20 rounded-full blur-2xl animate-pulse-slow"></div>
          <div className="relative bg-primary dark:bg-primary-dark text-white p-6 rounded-full shadow-lg">
            <Droplet size={64} />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-text-primary-light dark:text-text-primary-dark">Assistente de Insulinoterapia</h2>
        <p className="mt-4 max-w-sm text-text-secondary-light dark:text-text-secondary-dark">
          Assistente clínico para apoiar suas decisões de insulinoterapia para DM2, baseado nas diretrizes SBD 2024 e PCDT DM2 do SUS.
        </p>
      </main>

      <footer className="w-full">
         <div className="mb-6 bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FastForward size={20} className="text-primary dark:text-primary-dark" />
              <div className="text-left">
                <p className="font-semibold text-text-primary-light dark:text-text-primary-dark">Modo Rápido</p>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Respostas mais rápidas, ideal para corrida de leito.</p>
              </div>
            </div>
             <button
                type="button"
                role="switch"
                aria-checked={isFastMode}
                onClick={() => setIsFastMode(!isFastMode)}
                className={`${
                    isFastMode ? 'bg-primary dark:bg-primary-dark' : 'bg-gray-300 dark:bg-gray-600'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0`}
            >
                <span
                    className={`${
                        isFastMode ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
            </button>
          </div>
        </div>
        <button
          onClick={() => onStart(isFastMode)}
          className="w-full bg-primary dark:bg-primary-dark text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
        >
          <Zap size={20} />
          <span>Iniciar Cálculo</span>
        </button>
         <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-4">
            Desenvolvido por Ian Bastos.
        </p>
      </footer>
    </div>
  );
};

export default HomeScreen;

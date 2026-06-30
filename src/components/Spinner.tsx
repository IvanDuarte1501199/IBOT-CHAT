import React from 'react';

interface LoadingSpinnerProps {
    message: string;
    error?: string | null;
    onSwitchEngine: (engine: 'ollama' | 'simulation') => void;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, error, onSwitchEngine }) => {
    if (error) {
        return (
            <div className='flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto my-auto glass-panel border border-red-900/30 rounded-2xl shadow-2xl animate-fade-in'>
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-950/50 border border-red-500/30 text-red-400 mb-4 shadow-inner">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className='text-lg font-bold text-white mb-2'>WebGPU Load Error</h3>
                <p className='text-xs text-slate-400 mb-4 overflow-y-auto max-h-32 text-left p-3 bg-slate-950/60 rounded-lg border border-slate-900 leading-relaxed font-mono'>
                    {error}
                </p>
                
                <div className="text-xs text-slate-300 text-left space-y-2 mb-6 border-t border-slate-800 pt-4 w-full">
                    <p className="font-semibold text-slate-200">How to fix WebGPU:</p>
                    <ul className="list-disc list-inside space-y-1 text-slate-400">
                        <li>Ensure you have a WebGPU-enabled browser (Chrome 113+, Edge 113+, Opera, or Firefox Nightly).</li>
                        <li>In Chrome, try enabling the flag: <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300 font-mono">chrome://flags/#enable-unsafe-webgpu</code></li>
                        <li>Ensure your GPU drivers are updated.</li>
                    </ul>
                </div>

                <div className="w-full space-y-2">
                    <p className="text-xs text-slate-400 font-medium">Or switch to another local engine:</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => onSwitchEngine('simulation')}
                            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/25 text-white transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            Offline Simulator
                        </button>
                        <button 
                            onClick={() => onSwitchEngine('ollama')}
                            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            Local Ollama
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto my-auto glass-panel rounded-2xl shadow-xl space-y-4 animate-pulse-gaze'>
            <div className="relative flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                <div className="absolute w-8 h-8 rounded-full bg-indigo-650/20 blur-sm"></div>
            </div>
            <div>
                <p className='text-sm font-semibold text-slate-200'>Loading local AI engine...</p>
                <p className='text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed'>{message}</p>
            </div>
            <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-2 w-full">
                This might take a minute on first load.
            </div>
            <button 
                onClick={() => onSwitchEngine('simulation')}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
            >
                Skip to Offline Simulator
            </button>
        </div>
    );
};

export default LoadingSpinner;
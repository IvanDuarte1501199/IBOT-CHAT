import React from 'react';

interface LoadingSpinnerProps {
    message: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
    return (
        <div className='h-full justify-center self-center items-center text-center max-w-xl flex flex-col gap-1'>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className='text-blue-500'>Please wait while the engine is loading...</p>
            <small className='pb-2 text-sm text-gray-500'>{message}</small>
        </div>
    );
};

export default LoadingSpinner;
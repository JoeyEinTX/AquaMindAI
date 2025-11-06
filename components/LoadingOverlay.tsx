
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

const LoadingOverlay: React.FC = () => {
    const messages = [
        "Analyzing local weather patterns...",
        "Calculating soil moisture levels...",
        "Consulting with horticultural experts...",
        "Optimizing for water conservation...",
        "Crafting the perfect schedule...",
    ];
    const [message, setMessage] = React.useState(messages[0]);

    React.useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % messages.length;
            setMessage(messages[index]);
        }, 2500);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
            <div className="text-white text-center p-8">
                <SparklesIcon className="w-16 h-16 text-green-400 mx-auto animate-pulse mb-6"/>
                <h2 className="text-3xl font-bold mb-2">AquaMind AI is Thinking</h2>
                <p className="text-lg text-gray-300 transition-opacity duration-500 ease-in-out">{message}</p>
            </div>
        </div>
    );
};

export default LoadingOverlay;

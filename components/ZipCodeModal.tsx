
import React, { useState, useEffect } from 'react';
import { LocationPinIcon } from './icons/LocationPinIcon';

interface ZipCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (zipCode: string) => void;
    currentZipCode: string;
}

const ZipCodeModal: React.FC<ZipCodeModalProps> = ({ isOpen, onClose, onSubmit, currentZipCode }) => {
    const [zip, setZip] = useState(currentZipCode);

    useEffect(() => {
        if (isOpen) {
            setZip(currentZipCode);
        }
    }, [isOpen, currentZipCode]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (zip.trim().length === 5 && /^\d{5}$/.test(zip.trim())) {
            onSubmit(zip.trim());
        }
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-11/12 max-w-xs mx-auto border border-gray-700 transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center mb-4">
                    <LocationPinIcon className="w-6 h-6 mr-3 text-blue-400" />
                    <h2 className="text-2xl font-bold text-blue-400">Change Location</h2>
                </div>
                <p className="text-gray-400 mb-6 text-sm">
                    Enter a 5-digit US zip code to fetch new weather data.
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        placeholder="#####"
                        maxLength={5}
                        className="w-full text-center text-3xl font-mono tracking-widest bg-gray-700 border border-gray-600 text-white rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition mb-6"
                        autoFocus
                    />
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-600 text-white hover:bg-gray-500 font-bold py-2 px-4 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ZipCodeModal;

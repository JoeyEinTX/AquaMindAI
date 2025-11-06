
import React, { useState, useEffect } from 'react';
import { SprinklerZone, PlantType, SprinklerType, SunExposure, WaterRequirement } from '../types';
import { SettingsIcon } from './icons/SettingsIcon';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

// A reusable toggle switch component
const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
        >
            <span className={`${checked ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
        </button>
    );
};

// A reusable select dropdown component
const SelectInput: React.FC<{
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    children: React.ReactNode;
}> = ({ label, name, value, onChange, children }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
        >
            {children}
        </select>
    </div>
);


const ZoneForm: React.FC<{
    zone: Omit<SprinklerZone, 'id' | 'isWatering'> | SprinklerZone;
    onSave: (zone: Omit<SprinklerZone, 'id' | 'isWatering'> | SprinklerZone) => void;
    onCancel: () => void;
}> = ({ zone, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ ...zone, headDetails: zone.headDetails || {} });
    const isNew = !('id' in zone);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        const isNumericField = ['relay', 'flowRateGPH', 'arc90', 'arc180', 'arc270', 'arc360'].includes(name);
        const parsedValue = isNumericField && value !== '' ? parseInt(value, 10) : value;

        setFormData(prev => {
            let updated: any = { ...prev };
             if (name.startsWith('arc')) {
                updated = {
                    ...prev,
                    headDetails: {
                        ...prev.headDetails,
                        [name]: parsedValue || undefined // Store as number or undefined if empty
                    }
                };
            } else {
                updated = { ...prev, [name]: parsedValue };
            }

            // Smart defaults for water requirement when plant type changes
            if (name === 'plantType') {
                let newRequirement: WaterRequirement = 'Standard';
                if (value === 'Vegetables' || value === 'Foundation') newRequirement = 'High';
                if (value === 'Shrubs' || value === 'Trees') newRequirement = 'Low';
                updated.waterRequirement = newRequirement;
            }

            // If sprinkler type changes, clear the irrelevant hardware field
            if (name === 'sprinklerType') {
                if (value === 'Drip') {
                    delete updated.headDetails;
                } else {
                    delete updated.flowRateGPH;
                    if (!updated.headDetails) updated.headDetails = {};
                }
            }
            return updated;
        });
    };
    
    const handleToggle = (enabled: boolean) => {
        setFormData(prev => ({ ...prev, enabled }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() && formData.relay > 0) {
            onSave(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3 className="text-xl font-bold mb-6 text-white">{isNew ? 'Add New Zone' : 'Edit Zone'}</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Zone Name</label>
                        <input
                            type="text" id="name" name="name"
                            value={formData.name} onChange={handleChange} required
                            className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., Front Yard"
                        />
                    </div>
                     <div>
                        <label htmlFor="relay" className="block text-sm font-medium text-gray-300 mb-1">Relay Output</label>
                        <input
                            type="number" id="relay" name="relay"
                            value={formData.relay} onChange={handleChange} required min="1"
                            className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 1"
                        />
                    </div>
                </div>
                 <SelectInput label="Plant Type" name="plantType" value={formData.plantType} onChange={handleChange}>
                    <option value="Grass">Grass</option>
                    <option value="Flowers">Flowers</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Shrubs">Shrubs</option>
                    <option value="Trees">Trees</option>
                    <option value="Foundation">Foundation</option>
                </SelectInput>
                 <SelectInput label="Sprinkler Head Type" name="sprinklerType" value={formData.sprinklerType} onChange={handleChange}>
                    <option value="Spray">Spray</option>
                    <option value="Rotor">Rotor</option>
                    <option value="Drip">Drip</option>
                </SelectInput>

                {/* Conditional Hardware Inputs */}
                {formData.sprinklerType === 'Drip' ? (
                    <div>
                        <label htmlFor="flowRateGPH" className="block text-sm font-medium text-gray-300 mb-1">Total Flow Rate (GPH)</label>
                        <input
                            type="number" id="flowRateGPH" name="flowRateGPH"
                            value={formData.flowRateGPH || ''} onChange={handleChange} required min="1"
                            className="w-full bg-gray-700 border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">Gallons Per Hour for the entire drip line. Check manufacturer specs.</p>
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Number of Heads by Arc</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(['arc90', 'arc180', 'arc270', 'arc360'] as const).map(arc => (
                                <div key={arc}>
                                    <label htmlFor={arc} className="block text-xs text-gray-400 mb-1 text-center">{arc.replace('arc', '')}°</label>
                                    <input
                                        type="number" id={arc} name={arc}
                                        value={formData.headDetails?.[arc] || ''}
                                        onChange={handleChange} min="0"
                                        className="w-full text-center bg-gray-700 border-gray-600 text-white rounded-lg px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Enter count for each type of head (quarter, half, etc.).</p>
                    </div>
                )}

                 <SelectInput label="Sun Exposure" name="sunExposure" value={formData.sunExposure} onChange={handleChange}>
                    <option value="Full Sun">Full Sun</option>
                    <option value="Partial Shade">Partial Shade</option>
                    <option value="Full Shade">Full Shade</option>
                </SelectInput>
                 <SelectInput label="Water Requirement" name="waterRequirement" value={formData.waterRequirement} onChange={handleChange}>
                    <option value="Low">Low (Drought-Tolerant)</option>
                    <option value="Standard">Standard</option>
                    <option value="High">High (New Plants, Gardens)</option>
                </SelectInput>
                <div className="flex justify-between items-center pt-2">
                    <label className="text-sm font-medium text-gray-300">Enabled in Schedule</label>
                    <ToggleSwitch checked={formData.enabled} onChange={handleToggle} />
                </div>
            </div>
            <div className="flex justify-end space-x-3 mt-8">
                <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition">Save Zone</button>
            </div>
        </form>
    );
};

interface ManageZonesModalProps {
    isOpen: boolean;
    onClose: () => void;
    zones: SprinklerZone[];
    onAddZone: (zoneData: Omit<SprinklerZone, 'id' | 'isWatering'>) => void;
    onUpdateZone: (zone: SprinklerZone) => void;
    onDeleteZone: (zoneId: number) => void;
}

const ManageZonesModal: React.FC<ManageZonesModalProps> = ({ isOpen, onClose, zones, onAddZone, onUpdateZone, onDeleteZone }) => {
    const [editingZone, setEditingZone] = useState<SprinklerZone | 'new' | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setEditingZone(null);
        }
    }, [isOpen]);
    
    if (!isOpen) return null;

    const handleSave = (zone: Omit<SprinklerZone, 'id' | 'isWatering'> | SprinklerZone) => {
        if ('id' in zone) {
            onUpdateZone(zone as SprinklerZone);
        } else {
            onAddZone(zone as Omit<SprinklerZone, 'id' | 'isWatering'>);
        }
        setEditingZone(null);
    };

    const handleDelete = (zoneId: number, zoneName: string) => {
        if (window.confirm(`Are you sure you want to delete the "${zoneName}" zone? This action cannot be undone.`)) {
            onDeleteZone(zoneId);
        }
    };

    const newZoneTemplate = {
        name: '',
        enabled: true,
        relay: (zones.length > 0 ? Math.max(...zones.map(z => z.relay)) + 1 : 1),
        plantType: 'Grass' as PlantType,
        sprinklerType: 'Spray' as SprinklerType,
        sunExposure: 'Full Sun' as SunExposure,
        waterRequirement: 'Standard' as WaterRequirement,
        headDetails: { arc360: 10 },
    };

    const getZoneDescription = (zone: SprinklerZone) => {
        let hardwareInfo = '';
        if (zone.sprinklerType === 'Drip') {
            hardwareInfo = `${zone.flowRateGPH || '?'} GPH`;
        } else if (zone.headDetails) {
            const parts = [];
            if (zone.headDetails.arc360) parts.push(`${zone.headDetails.arc360}x360°`);
            if (zone.headDetails.arc270) parts.push(`${zone.headDetails.arc270}x270°`);
            if (zone.headDetails.arc180) parts.push(`${zone.headDetails.arc180}x180°`);
            if (zone.headDetails.arc90) parts.push(`${zone.headDetails.arc90}x90°`);
            hardwareInfo = parts.join(', ') || '? heads';
        } else {
            hardwareInfo = '? heads';
        }
        return `Relay ${zone.relay} | ${zone.plantType} | ${hardwareInfo} | ${zone.sunExposure}`;
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg mx-auto border border-gray-700 transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                {!editingZone ? (
                    <>
                        <div className="flex items-center mb-6">
                            <SettingsIcon className="w-6 h-6 mr-3 text-blue-400" />
                            <h2 className="text-2xl font-bold text-blue-400">Manage Zones</h2>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {zones.map(zone => (
                                <div key={zone.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">{zone.name} <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${zone.enabled ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}`}>{zone.enabled ? 'Enabled' : 'Disabled'}</span></p>
                                        <p className="text-sm text-gray-400">{getZoneDescription(zone)}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => setEditingZone(zone)} className="p-2 text-gray-300 hover:text-white hover:bg-gray-600 rounded-full transition"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(zone.id, zone.name)} className="p-2 text-gray-300 hover:text-red-400 hover:bg-gray-600 rounded-full transition"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                             {zones.length === 0 && <p className="text-center text-gray-400 py-8">No zones configured. Add one to get started.</p>}
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-700 flex justify-between items-center">
                            <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">Close</button>
                            <button onClick={() => setEditingZone('new')} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition flex items-center space-x-2">
                                <PlusIcon className="w-5 h-5"/>
                                <span>Add New Zone</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <ZoneForm 
                        zone={editingZone === 'new' ? newZoneTemplate : editingZone}
                        onSave={handleSave}
                        onCancel={() => setEditingZone(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default ManageZonesModal;

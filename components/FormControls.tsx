
import React from 'react';

interface FormSectionProps {
    title: string;
    children: React.ReactNode;
}
export const FormSection: React.FC<FormSectionProps> = ({ title, children }) => (
    <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-soft mb-6">
        <h2 className="text-lg font-semibold mb-4 text-text-primary-light dark:text-text-primary-dark border-b border-border-light dark:border-border-dark pb-2">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
        </div>
    </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    unit?: string;
}
export const Input: React.FC<InputProps> = ({ label, unit, onFocus, ...props }) => (
    <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">{label}</label>
        <div className="relative">
            <input
                {...props}
                value={props.type === 'number' && props.value === 0 ? '' : props.value}
                onFocus={(e) => {
                    if (props.type === 'number' && e.target.value === '0') {
                        e.target.select();
                    }
                    if (onFocus) {
                        onFocus(e);
                    }
                }}
                className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            />
            {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark">{unit}</span>}
        </div>
    </div>
);


interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    children: React.ReactNode;
}
export const Select: React.FC<SelectProps> = ({ label, children, ...props }) => (
    <div className="flex flex-col space-y-1">
        <label className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">{label}</label>
        <select
            {...props}
            className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition-colors appearance-none"
        >
            {children}
        </select>
    </div>
);

interface CheckboxGroupProps {
    label: string;
    options: string[];
    selectedOptions: string[];
    onChange: (selected: string[]) => void;
}
export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ label, options, selectedOptions, onChange }) => {
    const handleToggle = (option: string) => {
        const newSelection = selectedOptions.includes(option)
            ? selectedOptions.filter(item => item !== option)
            : [...selectedOptions, option];
        onChange(newSelection);
    };

    return (
        <div className="flex flex-col space-y-1 col-span-full">
            <label className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map(option => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => handleToggle(option)}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                            selectedOptions.includes(option)
                                ? 'bg-primary text-white dark:bg-primary-dark'
                                : 'bg-background-light dark:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
};

export const Toggle: React.FC<{label: string; checked: boolean; onChange: (checked: boolean) => void}> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between col-span-full">
        <span className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">{label}</span>
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`${
                checked ? 'bg-primary dark:bg-primary-dark' : 'bg-gray-300 dark:bg-gray-600'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
        >
            <span
                className={`${
                    checked ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
        </button>
    </div>
);

"use client";

import { useState } from "react";
import { ButtonBase } from "../base/button";
import { ModalBase } from "../base/modal";

export default function CalculatorUtility({ isOpen, onCancel }: { isOpen: boolean; onCancel: () => void }) {
    const [current, setCurrent] = useState("0");
    const [previous, setPrevious] = useState<string | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [history, setHistory] = useState("");
    const [memory, setMemory] = useState<number>(0);
    const [isNewNumber, setIsNewNumber] = useState(true);

    // Number Input
    const handleNumber = (num: string) => {
        if (isNewNumber) {
            setCurrent(num);
            setIsNewNumber(false);
        } else {
            setCurrent(current === "0" ? num : current + num);
        }
    };

    // Decimal Point
    const handleDecimal = () => {
        if (isNewNumber) {
            setCurrent("0.");
            setIsNewNumber(false);
            return;
        }
        if (!current.includes(".")) {
            setCurrent(current + ".");
        }
    };

    // Basic Operations (+, -, *, /)
    const handleOperator = (op: string) => {
        if (operator && !isNewNumber && previous) {
            calculate();
        }
        setPrevious(current);
        setOperator(op);
        setHistory(`${current} ${op}`);
        setIsNewNumber(true);
    };

    // Calculation (=)
    const calculate = () => {
        if (!previous || !operator) return;
        const prev = parseFloat(previous);
        const curr = parseFloat(current);
        let result = 0;

        switch (operator) {
            case "+": result = prev + curr; break;
            case "-": result = prev - curr; break;
            case "×": result = prev * curr; break;
            case "÷": result = prev / curr; break;
        }

        // Format result to avoid potential long decimals
        const resultString = String(parseFloat(result.toFixed(10)));
        setCurrent(resultString);
        setHistory("");
        setPrevious(null);
        setOperator(null);
        setIsNewNumber(true);
    };

    // Special Functions
    const handleSpecial = (type: "sqrt" | "sqr" | "inv" | "neg" | "pct") => {
        const val = parseFloat(current);
        let updated = val;
        let expression = "";

        switch (type) {
            case "sqrt":
                updated = Math.sqrt(val);
                expression = `√(${current})`;
                break;
            case "sqr":
                updated = val * val;
                expression = `sqr(${current})`;
                break;
            case "inv":
                updated = 1 / val;
                expression = `1/(${current})`;
                break;
            case "neg":
                updated = val * -1;
                break;
            case "pct":
                updated = val / 100;
                expression = `${current}%`;
                break;
        }

        setCurrent(String(updated));
        if (expression) setHistory(expression);
        setIsNewNumber(true);
    };

    // Clear Functions
    const handleClearEntry = () => setCurrent("0");
    const handleClear = () => {
        setCurrent("0");
        setPrevious(null);
        setOperator(null);
        setHistory("");
        setIsNewNumber(true);
    };
    const handleBackspace = () => {
        if (isNewNumber) return;
        if (current.length === 1) {
            setCurrent("0");
            setIsNewNumber(true);
        } else {
            setCurrent(current.slice(0, -1));
        }
    };

    // Memory Functions
    const memoryClear = () => setMemory(0);
    const memoryRecall = () => { setCurrent(String(memory)); setIsNewNumber(true); };
    const memoryAdd = () => { setMemory(prev => prev + parseFloat(current)); setIsNewNumber(true); };
    const memorySub = () => { setMemory(prev => prev - parseFloat(current)); setIsNewNumber(true); };
    const memoryStore = () => { setMemory(parseFloat(current)); setIsNewNumber(true); };

    // Button Styles
    const btnClass = "h-12 text-sm font-medium rounded hover:bg-slate-100 bg-white border border-slate-200 text-slate-700 transition-colors active:bg-slate-200";
    const btnNumberClass = "h-12 text-lg font-bold rounded hover:bg-slate-50 bg-white border border-slate-200 text-slate-900 transition-colors active:bg-slate-200";
    const btnEqualClass = "h-12 text-xl font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors active:bg-blue-800";
    const btnMemoryClass = "h-8 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-transparent uppercase active:text-blue-600";

    return (
        <ModalBase
            isOpen={isOpen}
            onCancel={onCancel}
            contentBtn={null}
            title={
                <div className="flex items-center gap-2">
                    <span className="font-bold text-sm uppercase">Máy tính nhanh</span>
                </div>
            }
            footer={null}
            className="w-[340px]!"
        >
            <div className="p-1 space-y-1">
                {/* Display */}
                <div className="text-right mb-4 px-2">
                    <div className="h-6 text-xs text-slate-500 font-medium tracking-wide">
                        {history}
                    </div>
                    <div className="text-4xl font-semibold text-slate-900 overflow-hidden text-ellipsis whitespace-nowrap">
                        {current}
                    </div>
                </div>

                {/* Memory Row */}
                <div className="flex justify-between mb-2 px-1">
                    <button onClick={memoryClear} className={btnMemoryClass} disabled={memory === 0}>MC</button>
                    <button onClick={memoryRecall} className={btnMemoryClass} disabled={memory === 0}>MR</button>
                    <button onClick={memoryAdd} className={btnMemoryClass}>M+</button>
                    <button onClick={memorySub} className={btnMemoryClass}>M-</button>
                    <button onClick={memoryStore} className={btnMemoryClass}>MS</button>
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-4 gap-1">
                    {/* Row 1 */}
                    <button onClick={() => handleSpecial("pct")} className={btnClass}>%</button>
                    <button onClick={handleClearEntry} className={btnClass}>CE</button>
                    <button onClick={handleClear} className={btnClass}>C</button>
                    <button onClick={handleBackspace} className={btnClass}>
                        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"></path>
                            <line x1="18" y1="9" x2="12" y2="15"></line>
                            <line x1="12" y1="9" x2="18" y2="15"></line>
                        </svg>
                    </button>

                    {/* Row 2 */}
                    <button onClick={() => handleSpecial("inv")} className={btnClass}>¹/x</button>
                    <button onClick={() => handleSpecial("sqr")} className={btnClass}>x²</button>
                    <button onClick={() => handleSpecial("sqrt")} className={btnClass}>²√x</button>
                    <button onClick={() => handleOperator("÷")} className={btnClass}>÷</button>

                    {/* Row 3 */}
                    <button onClick={() => handleNumber("7")} className={btnNumberClass}>7</button>
                    <button onClick={() => handleNumber("8")} className={btnNumberClass}>8</button>
                    <button onClick={() => handleNumber("9")} className={btnNumberClass}>9</button>
                    <button onClick={() => handleOperator("×")} className={btnClass}>×</button>

                    {/* Row 4 */}
                    <button onClick={() => handleNumber("4")} className={btnNumberClass}>4</button>
                    <button onClick={() => handleNumber("5")} className={btnNumberClass}>5</button>
                    <button onClick={() => handleNumber("6")} className={btnNumberClass}>6</button>
                    <button onClick={() => handleOperator("-")} className={btnClass}>-</button>

                    {/* Row 5 */}
                    <button onClick={() => handleNumber("1")} className={btnNumberClass}>1</button>
                    <button onClick={() => handleNumber("2")} className={btnNumberClass}>2</button>
                    <button onClick={() => handleNumber("3")} className={btnNumberClass}>3</button>
                    <button onClick={() => handleOperator("+")} className={btnClass}>+</button>

                    {/* Row 6 */}
                    <button onClick={() => handleSpecial("neg")} className={btnNumberClass}>+/-</button>
                    <button onClick={() => handleNumber("0")} className={btnNumberClass}>0</button>
                    <button onClick={handleDecimal} className={btnNumberClass}>.</button>
                    <button onClick={calculate} className={btnEqualClass}>=</button>
                </div>
            </div>
        </ModalBase>
    );
}

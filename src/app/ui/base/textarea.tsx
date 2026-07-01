// import React, { useRef } from "react";

// type InputProps = {
//   value?: string;
//   className?: string;
//   placeholder?: string;
//   rows?: number;
//   cols?: number;
//   onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
//   disabled?: boolean;
//   ref?: HTMLTextAreaElement | null;
// };

// export const InputAreaBase = ({
//   value = "",
//   className = "",
//   placeholder,
//   rows = 4,
//   cols = 50,
//   onChange,
//   disabled = false,
//   ref,
//   ...rest
// }: InputProps) => {
//   const textareaRef = useRef<HTMLTextAreaElement>(ref as HTMLTextAreaElement);

//   const handleInput = () => {
//     const el = textareaRef.current;
//     if (el) {
//       el.style.height = "auto"; // reset trước
//       el.style.height = `${el.scrollHeight}px`; // set theo nội dung
//     }
//   };

//   return (
//     <textarea
//       ref={textareaRef}
//       name="input-area"
//       placeholder={placeholder}
//       className={`py-2 w-full min-h-12 overflow-hidden ${className} ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
//       rows={rows}
//       cols={cols}
//       value={value}
//       onChange={onChange}
//       onInput={handleInput}
//       disabled={disabled}
//       {...rest}
//     />
//   );
// };

import React, { forwardRef, useEffect, useRef } from "react";

type InputProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'> & {

};

export const InputAreaBase = forwardRef<HTMLTextAreaElement, InputProps>(({
    value = "",
    className = "",
    placeholder,
    rows = 4,
    cols = 50,
    onChange,
    onKeyDown,
    disabled = false,
    ...rest
}, ref) => {

    // Logic Tự động điều chỉnh chiều cao (Scroll Height)
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    };

    // Nếu bạn muốn tự động điều chỉnh chiều cao khi component mount hoặc value thay đổi
    // Chúng ta cần đảm bảo ref là một đối tượng ref (RefObject) để truy cập.
    const internalRef = useRef<HTMLTextAreaElement>(null);

    // Gán ref ngoài vào ref nội bộ (nếu có)
    useEffect(() => {
        if (typeof ref === 'function') {
            ref(internalRef.current);
        } else if (ref) {
            ref.current = internalRef.current;
        }

        // Khởi tạo chiều cao sau khi mount
        if (internalRef.current) {
            handleInput({ currentTarget: internalRef.current } as unknown as React.FormEvent<HTMLTextAreaElement>);
        }
    }, [value, ref]);

    return (
        <textarea
            ref={ref}
            name="input-area"
            placeholder={placeholder}
            className={`py-2 w-full min-h-12 overflow-hidden ${className} ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
            rows={rows}
            cols={cols}
            value={value}
            onChange={onChange}
            onInput={handleInput}
            onKeyDown={onKeyDown}
            disabled={disabled}
            {...rest}
        />
    );
});

InputAreaBase.displayName = "InputAreaBase";

import { ButtonBase } from "../base/button";
import { InputBase } from "../base/input";

type SearchProps = {
  value: string | number | undefined;
  onChange: (value: string) => void;
  onEnter?: (value: string) => void;
  placeholder?: string;
};

export const SearchBase = ({
  value,
  onChange,
  onEnter,
  placeholder = "Nhập để tìm kiếm..."
}: SearchProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (onEnter) onEnter(value as string);
    }
  };

  const onClear = () => {
    onChange("");
    if (onEnter) onEnter("");
  };

  return (
    <div
      className="flex items-center gap-2 border border-gray-200 rounded-full px-3 py-[3px]
        w-[400px] max-2xl:w-[300px] max-lg:w-[250px] max-md:w-[250px]
        transition-all duration-300 ease-in-out bg-white z-10 shadow-xs 
        focus-within:border-blue-400"
    >
      <InputBase
        // type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full! border-none outline-none"
        onKeyDown={handleKeyDown}
      />
      {value && (
        <ButtonBase
          className="flex-none! p-1! rounded-full! hover:bg-gray-100! transition-colors! transform! duration-300! ease-in-out"
          onClick={() => {
            onClear();
          }}
          title="Xóa"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 text-blue-500 font-bold"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </ButtonBase>
      )}
    </div>
  );
};

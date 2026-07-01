import { ZodType } from "zod";

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Validate data theo schema Zod
 * @param schema Zod schema
 * @param data object cần validate
 * @returns object { isValid, errors, values }
 */
export function validateData<T>(
    schema: ZodType<T>, // dùng ZodType<T>
    data: unknown
): { isValid: boolean; errors: ValidationErrors<T>; values?: T } {
    const result = schema.safeParse(data);

    if (!result.success) {
        const errors: ValidationErrors<T> = {};
        result.error.issues.forEach((issue) => {
            const field = issue.path[0] as keyof T;
            errors[field] = issue.message;
            console.log('field', field)
        });
        return { isValid: false, errors };
    }

    return { isValid: true, errors: {}, values: result.data };
}

/**
 * Helper để lấy lỗi theo field
 */
export function getError<T>(
    errors: ValidationErrors<T>,
    field: keyof T
): string | undefined {
    return errors[field];
}

// validate mã số thuế
// export const validateTaxCode = (taxCode: string): boolean => {
//     if (!taxCode) return true;

//     // Regex check format: 10 digits or 10 digits - 3 digits
//     if (!/^\d{10}(-\d{3})?$/.test(taxCode)) return false;

//     // Checksum for first 10 digits
//     // N1...N9 * weights -> sum
//     // remainder = sum % 11
//     // check = 10 - remainder
//     const weights = [31, 29, 23, 19, 17, 13, 7, 5, 3];
//     let sum = 0;
//     const cleanCode = taxCode.replace(/-/g, ""); // keep digits

//     for (let i = 0; i < 9; i++) {
//         sum += parseInt(cleanCode[i]) * weights[i];
//     }
//     const remainder = sum % 11;
//     const checkDigit = 10 - remainder;

//     // If checkDigit is 10, it's invalid
//     if (checkDigit === 10) return false;

//     // Compare with 10th digit
//     if (checkDigit !== parseInt(cleanCode[9])) return false;

//     return true;
// }
/**
 * Validate mã số thuế Việt Nam
 * Hỗ trợ: 
 * - 10 số (Doanh nghiệp, tổ chức)
 * - 13 số (Chi nhánh, đơn vị trực thuộc - định dạng 10 số + "-" + 3 số hoặc 13 số liền)
 * - 12 số (Hộ kinh doanh sử dụng CCCD/Mã định danh)
 */
export const validateTaxCode = (taxCode: string): boolean => {
    if (!taxCode) return true;
    // Loại bỏ dấu gạch ngang nếu có để xử lý chuỗi số thuần túy
    const cleanCode = taxCode.replace(/-/g, "");
    // 1. Kiểm tra độ dài hợp lệ: phải là 10, 12 hoặc 13 ký tự số
    if (!/^\d{10}$|^\d{12}$|^\d{13}$/.test(cleanCode)) {
        return false;
    }
    // 2. Trường hợp 12 số: Mã định danh cá nhân cho hộ kinh doanh
    // Đối với 12 số, hiện tại chủ yếu kiểm tra định dạng số (đã check ở bước 1)
    if (cleanCode.length === 12) {
        return true;
    }
    // 3. Trường hợp 10 số hoặc 13 số: Kiểm tra thuật toán Checksum
    // N1...N9 * weights -> sum
    const weights = [31, 29, 23, 19, 17, 13, 7, 5, 3];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCode[i]) * weights[i];
    }
    const remainder = sum % 11;
    const checkDigit = 10 - remainder;
    // Nếu số kiểm tra (số thứ 10) không khớp với checksum
    // Lưu ý: checkDigit = 10 là trường hợp không hợp lệ theo quy định MST 10 số
    if (checkDigit === 10 || checkDigit !== parseInt(cleanCode[9])) {
        return false;
    }
    // Đối với mã 13 số, sau khi pass 10 số đầu thì các số sau thường là số thứ tự 001, 002...
    // Bước check 10 số đầu bên trên đã đủ điều kiện cần.
    return true;
}

// validate số điện thoại
export const validatePhone = (phone: string): boolean => {
    if (!phone) return true;
    // Simple Vietnamese phone regex: Starts with 0, 10 digits total
    // Prefixes: 03, 05, 07, 08, 09
    return /^(03|05|07|08|09)\d{8}$/.test(phone);
}

// validate email
export const validateEmail = (email: string): boolean => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

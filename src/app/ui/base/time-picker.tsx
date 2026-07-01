import React from 'react';
import type { TimePickerProps } from 'antd';
import { TimePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/vi'; // Import ngôn ngữ Tiếng Việt cho dayjs
import viVN from 'antd/locale/vi_VN'; // Import locale Tiếng Việt cho Ant Design

// Thiết lập dayjs sử dụng tiếng Việt và plugin format
dayjs.extend(customParseFormat);
dayjs.locale('vi');

const TimePickerBase: React.FC<TimePickerProps> = (props) => {
    const handleChange: TimePickerProps['onChange'] = (time, timeString) => {
        // Gọi callback onChange từ props nếu có
        if (props.onChange) {
            props.onChange(time, timeString);
        }
    };

    return (
        <ConfigProvider locale={viVN}>
            <TimePicker
                {...props}
                placeholder={props.placeholder || "Chọn thời gian"}
                onChange={handleChange}
                // defaultOpenValue giúp con trỏ nhảy về 00:00:00 khi bắt đầu chọn
                defaultOpenValue={dayjs('00:00:00', 'HH:mm:ss')}
                style={{ width: '100%', ...props.style }}
            />
        </ConfigProvider>
    );
};

export default TimePickerBase;

'use client';

import PublicLeavePage from '@/app/public-leave/page';
import { Button, message, Tooltip } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

export default function CreateLeavePage() {
  return (
    <div className="relative min-h-full bg-slate-50">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <Tooltip title="Copy link form xin nghỉ để gửi cho mọi người tự điền">
          <Button 
            type="primary" 
            icon={<CopyOutlined />} 
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/public-leave`);
              message.success('Đã copy link form xin nghỉ public!');
            }}
            size="large"
            className="shadow-xl bg-blue-600 hover:!bg-blue-700 font-medium"
          >
            Copy Link Public
          </Button>
        </Tooltip>
      </div>
      <PublicLeavePage />
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Row, Col, Button, Select, Input } from 'antd';
import { Sparkles, HelpCircle, FileText, Send } from 'lucide-react';
import { useTimekeepingStore } from '@/app/store/timekeeping/useTimekeepingStore';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const AI_SUGGESTIONS = [
  { color: 'blue', text: 'WiFi & GPS bán kính?', prompt: 'Cách chấm công tự động bằng Wifi và GPS bán kính 150m?' },
  { color: 'cyan', text: 'Chống đi hộ chấm hộ', prompt: 'Làm thế nào để tránh việc chấm công hộ ở cơ quan?' },
  { color: 'purple', text: 'Tính năng AI HR đột phá', prompt: 'Các tính năng AI HR nào có thể đề xuất thêm?' },
];

export default function AIAdvisorPage() {
  const { employees, logs, selectedAIEmployeeId, setSelectedAIEmployeeId } = useTimekeepingStore();

  const [aiReportText, setAiReportText] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI Hupuna. Tôi có thể phân tích chấm công nhân sự, gợi ý tối ưu và cùng bạn thảo luận phát triển dự án hupuna-timekeeping. Hãy hỏi tôi bất cứ điều gì!',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  const generateAIReport = async () => {
    setAiReportText('');
    setIsGeneratingReport(true);
    try {
      const res = await fetch('/api/ai/analyze-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedAIEmployeeId }),
      });
      const data = await res.json();
      setAiReportText(data.analysis || data.error || 'Có lỗi xảy ra khi gọi dịch vụ phân tích AI.');
      if (data.analysis) {
        // message.success not needed - UI reflects it
      }
    } catch {
      setAiReportText('Không thể liên kết máy chủ AI. Hãy đảm bảo khóa API đã được cấu hình.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');

    const newMsgs: ChatMessage[] = [
      ...chatMessages,
      {
        sender: 'user',
        text: userMsg,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setChatMessages(newMsgs);
    setIsAiTyping(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: data.text || 'Rất tiếc! Tôi nhận được phản hồi rỗng từ máy chủ.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Rất tiếc! Tôi không thể kết nối tới dịch vụ AI. Bạn vui lòng bổ sung API Key nhé.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="space-y-6">
      <Row gutter={[24, 24]}>
        {/* AI Analysis Generator */}
        <Col xs={24} lg={12}>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="font-bold text-xs uppercase text-slate-500 tracking-wider">Phân tích Chấm công Tự động AI HR</span>
            </div>
            <p className="text-xs text-slate-500 leading-normal mb-4">
              Tải dữ liệu phân tích xâu chuỗi thông tin đi muộn, đơn từ, và lý do giải trình sử dụng mô hình <b>Gemini Flash</b>.
            </p>

            <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl mb-4 flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Chọn nhân viên cụ thể</label>
                <Select
                  value={selectedAIEmployeeId}
                  onChange={(val) => setSelectedAIEmployeeId(val)}
                  style={{ width: '100%' }}
                  options={employees.map((e) => ({ value: e.id, label: `${e.name} (${e.role})` }))}
                />
              </div>
              <Button
                type="primary"
                icon={<Sparkles className="w-4 h-4" />}
                loading={isGeneratingReport}
                onClick={generateAIReport}
              >
                Chạy AI báo cáo
              </Button>
            </div>

            {/* Report Terminal Display */}
            <div className="bg-slate-50/80 text-slate-700 p-5 rounded-2xl border border-slate-200/60 font-sans text-xs min-h-[220px] max-h-[380px] overflow-y-auto shadow-inner relative">
              {isGeneratingReport ? (
                <div className="space-y-2 py-4 text-blue-600 font-mono">
                  <p className="animate-pulse flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    # Đang kết nối mô hình Gemini Flash...
                  </p>
                  <p># Thu thập dữ liệu bản ghi logs ({logs.length})...</p>
                  <p className="italic text-slate-400"># Phân tích tổng số phút vắng mặt...</p>
                </div>
              ) : aiReportText ? (
                <div>
                  <p className="text-blue-700 font-bold border-b border-slate-200 pb-2 mb-3 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                    BÁO CÁO PHÂN TÍCH NHÂN SỰ CHUYÊN SÂU
                  </p>
                  <div className="whitespace-pre-wrap leading-relaxed font-sans text-slate-600 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">{aiReportText}</div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 bg-linear-to-br from-white to-blue-50/10 rounded-xl border border-dashed border-slate-200/80">
                  <FileText className="w-9 h-9 mx-auto text-slate-300 mb-3" />
                  <p className="font-sans text-[11px] font-semibold text-slate-500 m-0">
                    Phân tích thông minh trí tuệ nhân tạo sẽ hiển thị tại đây.
                  </p>
                  <p className="font-sans text-[10px] text-slate-400 m-0 mt-1">
                    Hãy bấm nút <b>Chạy AI báo cáo</b> ở phía trên để bắt đầu.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Col>

        {/* AI Chat Assistant */}
        <Col xs={24} lg={12}>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs h-full flex flex-col justify-between">
            <div className="flex flex-col h-[460px] justify-between">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                  <span className="font-bold text-xs uppercase text-slate-500 tracking-wider">Trợ lý Sáng Tạo Phát Triển Hupuna</span>
                </div>
                <p className="text-[11px] text-slate-400 m-0">Trao đổi và cùng thảo luận sáng kiến nâng cấp mô hình chấm công.</p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-y-auto space-y-3.5 mb-3 max-h-[290px]">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-slate-400 font-mono mb-0.5">
                      {msg.sender === 'user' ? 'Bạn' : 'AI Assistant'} · {msg.timestamp}
                    </span>
                    <div
                      className={`p-3 rounded-lg text-xs leading-normal max-w-[85%] ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-none shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200/80 rounded-tl-none shadow-3xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400">AI đang tư duy...</span>
                    <div className="bg-white p-2.5 rounded-lg text-xs border border-slate-200 inline-flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestion Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 -mt-1 select-none">
                {AI_SUGGESTIONS.map((s) => (
                  <span
                    key={s.text}
                    onClick={() => setChatInput(s.prompt)}
                    className={`cursor-pointer bg-${s.color}-50 text-${s.color}-700 border border-${s.color}-200 hover:bg-${s.color}-100 transition-all shrink-0 font-semibold text-[10px] px-2.5 py-1 rounded-full`}
                  >
                    {s.text}
                  </span>
                ))}
              </div>

              {/* Input Bar */}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onPressEnter={handleSendMessage}
                  placeholder="Trao đổi thảo luận sáng kiến chấm công..."
                  className="text-xs"
                />
                <Button
                  type="primary"
                  disabled={!chatInput.trim() || isAiTyping}
                  onClick={handleSendMessage}
                  icon={<Send className="w-3.5 h-3.5" />}
                />
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}

'use client';

import React, { useEffect, useRef } from 'react';

interface CKEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  onReady?: (editor: any) => void;
}

// ── CKEditor Wrapper (Client-only, SSR-safe) ────────────────────────────────
// Component này được import bằng next/dynamic với ssr:false để tránh lỗi SSR
export default function CKEditorWrapper({
  value,
  onChange,
  placeholder = 'Nhập nội dung hợp đồng tại đây...',
  height = 600,
  onReady,
}: CKEditorWrapperProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ckEditorInstanceRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!editorRef.current) return;

    let destroyed = false;

    async function initEditor() {
      try {
        // Dynamic import để tránh SSR
        const {
          ClassicEditor,
          Essentials,
          Paragraph,
          Bold,
          Italic,
          Underline,
          Strikethrough,
          Font,
          FontColor,
          FontBackgroundColor,
          Heading,
          Alignment,
          List,
          Table,
          TableToolbar,
          TableProperties,
          TableCellProperties,
          HorizontalLine,
          Link,
          Indent,
          IndentBlock,
          BlockQuote,
          Undo,
          WordCount,
          SpecialCharacters,
          SpecialCharactersEssentials,
          RemoveFormat,
          FindAndReplace,
          PageBreak,
        } = await import('ckeditor5');

        if (destroyed || !editorRef.current) return;

        const editor = await ClassicEditor.create(editorRef.current, {
          licenseKey: 'GPL',
          plugins: [
            Essentials,
            Paragraph,
            Bold,
            Italic,
            Underline,
            Strikethrough,
            Font,
            FontColor,
            FontBackgroundColor,
            Heading,
            Alignment,
            List,
            Table,
            TableToolbar,
            TableProperties,
            TableCellProperties,
            HorizontalLine,
            Link,
            Indent,
            IndentBlock,
            BlockQuote,
            Undo,
            WordCount,
            SpecialCharacters,
            SpecialCharactersEssentials,
            RemoveFormat,
            FindAndReplace,
            PageBreak,
          ],
          toolbar: {
            items: [
              'undo', 'redo',
              '|',
              'heading',
              '|',
              'bold', 'italic', 'underline', 'strikethrough', 'removeFormat',
              '|',
              'fontSize', 'fontColor', 'fontBackgroundColor',
              '|',
              'alignment',
              '|',
              'bulletedList', 'numberedList',
              '|',
              'indent', 'outdent',
              '|',
              'link', 'blockQuote', 'horizontalLine', 'pageBreak',
              '|',
              'insertTable',
              '|',
              'specialCharacters', 'findAndReplace',
            ],
            shouldNotGroupWhenFull: false,
          },
          heading: {
            options: [
              { model: 'paragraph', title: 'Đoạn văn', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Tiêu đề 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Tiêu đề 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Tiêu đề 3', class: 'ck-heading_heading3' },
              { model: 'heading4', view: 'h4', title: 'Tiêu đề 4', class: 'ck-heading_heading4' },
            ],
          },
          fontSize: {
            options: [10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32, 36],
            supportAllValues: true,
          },
          table: {
            contentToolbar: [
              'tableColumn', 'tableRow', 'mergeTableCells',
              'tableProperties', 'tableCellProperties',
            ],
          },
          placeholder,
          initialData: value,
        });

        if (destroyed) {
          await editor.destroy();
          return;
        }

        ckEditorInstanceRef.current = editor;

        // Lắng nghe thay đổi nội dung
        editor.model.document.on('change:data', () => {
          onChangeRef.current(editor.getData());
        });

        if (onReadyRef.current) {
          onReadyRef.current(editor);
        }

      } catch (err) {
        console.error('CKEditor init error:', err);
      }
    }

    initEditor();

    return () => {
      destroyed = true;
      const inst = ckEditorInstanceRef.current;
      if (inst) {
        inst.destroy().catch(console.error);
        ckEditorInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync value từ ngoài vào editor khi cần (VD: khi mở sửa)
  useEffect(() => {
    const inst = ckEditorInstanceRef.current;
    if (inst && inst.getData() !== value) {
      inst.setData(value);
    }
  // chỉ chạy khi value thay đổi từ bên ngoài (prop), không phải từ editor
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{ minHeight: height }}
      className="ck-wrapper border border-slate-200 rounded-lg overflow-hidden shadow-sm"
    >
      <div ref={editorRef} />
    </div>
  );
}

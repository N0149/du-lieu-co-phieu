"use client";

import React, { useState } from "react";

interface DriveDocViewerProps {
  docId: string;
  title?: string;
}

export default function DriveDocViewer({ docId, title }: DriveDocViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Link preview chính thức của Google Docs
  const embedUrl = `https://docs.google.com/document/d/${docId}/preview`;

  return (
    <div className="w-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header điều hướng nhanh */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            {title || "Báo Cáo Nghiên Cứu Chi Tiết"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Hiển thị trực tiếp bản gốc từ Google Docs
          </p>
        </div>
        <a
          href={`https://docs.google.com/document/d/${docId}/edit`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition"
        >
          Mở trong Google Docs ↗
        </a>
      </div>

      {/* Khung iframe hiển thị nội dung full */}
      <div className="relative w-full h-[85vh] bg-slate-100">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 mt-3">Đang tải báo cáo...</p>
          </div>
        )}
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          title={title || "Google Doc Viewer"}
          allow="autoplay"
        />
      </div>
    </div>
  );
}
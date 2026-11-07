import React, { useState } from 'react';
import {
  X,
  Download,
  FileText,
  Code,
  Eye,
  Copy,
  Check,
  ExternalLink,
  FileCode,
  Image as ImageIcon,
  File,
} from 'lucide-react';
import { TopicItem } from '../types';

interface FileViewerModalProps {
  item: TopicItem | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ item, onClose }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.filename || `${item.title}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyText = () => {
    if (item.textContent) {
      navigator.clipboard.writeText(item.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isHtml = item.type === 'html' || (item.filename && item.filename.toLowerCase().endsWith('.html'));
  const isText = item.type === 'text' || (item.filename && item.filename.toLowerCase().match(/\.(txt|text|json|md|js|ts|py|css|csv)$/i));
  const isPdf = item.type === 'pdf';
  const isImage = item.type === 'image' || (item.filename && item.filename.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp|svg)$/i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md">
      <div className="relative flex flex-col h-[90vh] w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60">
              {isHtml ? (
                <FileCode className="h-4 w-4" />
              ) : isPdf ? (
                <FileText className="h-4 w-4 text-red-400" />
              ) : isImage ? (
                <ImageIcon className="h-4 w-4 text-emerald-400" />
              ) : (
                <File className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {item.title}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {item.filename || 'File'} {item.size ? `· ${item.size}` : ''}
              </p>
            </div>
          </div>

          {/* Center Tabs for HTML files */}
          {isHtml && item.textContent && (
            <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Rendered Preview</span>
              </button>
              <button
                onClick={() => setActiveTab('source')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'source'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                <span>Source Code</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {item.textContent && (
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                title="Copy text content to clipboard"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download File</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 w-full bg-slate-950 overflow-hidden relative">
          {/* 1. HTML File Preview / Source */}
          {isHtml ? (
            activeTab === 'preview' ? (
              <iframe
                srcDoc={item.textContent || undefined}
                src={!item.textContent ? item.url : undefined}
                sandbox="allow-scripts allow-same-origin allow-forms"
                title="HTML Preview"
                className="h-full w-full border-0 bg-white"
              />
            ) : (
              <div className="h-full w-full overflow-auto p-4 font-mono text-xs text-slate-200 bg-slate-950">
                <pre className="whitespace-pre-wrap">{item.textContent}</pre>
              </div>
            )
          ) : isPdf ? (
            /* 2. PDF Viewer Frame */
            <iframe
              src={item.url}
              title={item.title}
              className="h-full w-full border-0"
            />
          ) : isText && item.textContent ? (
            /* 3. Text File Reader */
            <div className="h-full w-full overflow-auto p-4 font-mono text-xs text-slate-200 bg-slate-950">
              <pre className="whitespace-pre-wrap">{item.textContent}</pre>
            </div>
          ) : isImage ? (
            /* 4. Full Image Viewer */
            <div className="h-full w-full flex items-center justify-center p-4 bg-slate-950">
              <img
                src={item.url}
                alt={item.title}
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
          ) : (
            /* 5. Generic File Download View */
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-indigo-400 shadow-xl">
                <File className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{item.title}</h4>
                <p className="mt-1 text-xs text-slate-400 font-mono">
                  {item.filename} {item.size ? `· ${item.size}` : ''}
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Save to Device</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Lock,
  Server,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { DrmConfig } from '../types';

interface DrmConfigModalProps {
  config: DrmConfig;
  onUpdateConfig: (newConfig: DrmConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const DrmConfigModal: React.FC<DrmConfigModalProps> = ({
  config,
  onUpdateConfig,
  isOpen,
  onClose,
}) => {
  const [localConfig, setLocalConfig] = useState<DrmConfig>(config);
  const [emeSupport, setEmeSupport] = useState<{
    clearkey: boolean | null;
    widevine: boolean | null;
  }>({ clearkey: null, widevine: null });

  // Test browser EME capability
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).requestMediaKeySystemAccess) {
      // Test ClearKey
      (navigator as any)
        .requestMediaKeySystemAccess('org.w3.clearkey', [
          {
            initDataTypes: ['cenc', 'keyids'],
            videoCapabilities: [{ contentType: 'video/mp4;codecs="avc1.42E01E"' }],
          },
        ])
        .then(() => setEmeSupport((prev) => ({ ...prev, clearkey: true })))
        .catch(() => setEmeSupport((prev) => ({ ...prev, clearkey: false })));

      // Test Widevine
      (navigator as any)
        .requestMediaKeySystemAccess('com.widevine.alpha', [
          {
            initDataTypes: ['cenc'],
            videoCapabilities: [{ contentType: 'video/mp4;codecs="avc1.42E01E"' }],
          },
        ])
        .then(() => setEmeSupport((prev) => ({ ...prev, widevine: true })))
        .catch(() => setEmeSupport((prev) => ({ ...prev, widevine: false })));
    }
  }, []);

  const handleSave = () => {
    onUpdateConfig(localConfig);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/80">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">DRM & Decryption Configuration</h3>
              <p className="text-xs text-slate-400">
                Encrypted Media Extensions (EME) & ClearKey / Widevine License Settings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Browser EME Hardware Support Banner */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2">
            <div className="text-xs font-semibold text-slate-300">
              Browser Content Decryption Modules (CDM)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400">W3C ClearKey</span>
                <span className="flex items-center gap-1 font-mono">
                  {emeSupport.clearkey ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Supported</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-slate-500">Unavailable</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800/80">
                <span className="text-slate-400">Google Widevine</span>
                <span className="flex items-center gap-1 font-mono">
                  {emeSupport.widevine ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Supported</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-amber-400">Platform Disabled</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Enable DRM Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-semibold text-white">Enable Custom DRM System</div>
              <div className="text-[11px] text-slate-400">
                Injects custom decryption keys or license server requests into media stream
              </div>
            </div>
            <input
              type="checkbox"
              checked={localConfig.enabled}
              onChange={(e) =>
                setLocalConfig((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {/* DRM Mode Selector */}
          {localConfig.enabled && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">DRM Scheme</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setLocalConfig((prev) => ({ ...prev, type: 'clearkey' }))
                    }
                    className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                      localConfig.type === 'clearkey'
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold">W3C ClearKey</div>
                    <div className="text-[10px] text-slate-400">Direct Hex Key Pair (CENC)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLocalConfig((prev) => ({ ...prev, type: 'widevine' }))
                    }
                    className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                      localConfig.type === 'widevine'
                        ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold">Google Widevine</div>
                    <div className="text-[10px] text-slate-400">License Server Handshake</div>
                  </button>
                </div>
              </div>

              {/* ClearKey Inputs */}
              {localConfig.type === 'clearkey' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Key ID (Hex or Base64)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0123456789abcdef0123456789abcdef"
                      value={localConfig.keyId || ''}
                      onChange={(e) =>
                        setLocalConfig((prev) => ({ ...prev, keyId: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Key Secret (Hex or Base64)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. fedcba9876543210fedcba9876543210"
                      value={localConfig.key || ''}
                      onChange={(e) =>
                        setLocalConfig((prev) => ({ ...prev, key: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Widevine Inputs */}
              {localConfig.type === 'widevine' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Server className="h-3.5 w-3.5 text-cyan-400" />
                      <span>License Server URL</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://license.example.com/widevine/getlicense"
                      value={localConfig.licenseServerUrl || ''}
                      onChange={(e) =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          licenseServerUrl: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Informational Guidance Notice */}
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-[11px] text-amber-300 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong>Note on Protected Media:</strong> Commercial DRM streams (e.g. Netflix, Prime Video)
              require hardware-bound L1 CDM and authenticated tokens. For personal or testing streams,
              ClearKey allows direct playback with your Key ID & Key.
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-colors"
          >
            Apply DRM Settings
          </button>
        </div>
      </div>
    </div>
  );
};

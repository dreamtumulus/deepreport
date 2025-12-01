import React, { useState, useEffect } from 'react';
import { X, Save, Key, Search, Cpu } from 'lucide-react';
import { AppConfig } from '../types';
import { DEFAULT_MODELS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            系统设置 (System Settings)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-5">
          {/* OpenRouter Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> OpenRouter API Key
            </label>
            <input
              type="password"
              value={localConfig.openRouterApiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, openRouterApiKey: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="sk-or-..."
            />
            <p className="text-xs text-gray-500 mt-1">用于驱动 LLM 生成报告内容。</p>
          </div>

          {/* Model Selection (Input + Datalist for Custom Support) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              模型 ID (Model ID)
            </label>
            <div className="relative">
              <input
                list="model-options"
                type="text"
                value={localConfig.model}
                onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white placeholder-gray-400"
                placeholder="输入或选择模型 (例如: google/gemini-2.0-flash-001)"
              />
              <datalist id="model-options">
                {DEFAULT_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </datalist>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              支持输入 OpenRouter 上的任意模型 ID，也可以从预设列表中选择。
            </p>
          </div>

          {/* Tavily Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Search className="w-4 h-4" /> Tavily Search API Key
            </label>
            <input
              type="password"
              value={localConfig.tavilyApiKey}
              onChange={(e) => setLocalConfig({ ...localConfig, tavilyApiKey: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="tvly-..."
            />
            <p className="text-xs text-gray-500 mt-1">用于实时联网搜索数据。</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all font-medium flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
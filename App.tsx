
import React, { useState, useRef, useEffect } from 'react';
import { Settings, Send, Sparkles, BookOpen, FileText, Download, PlayCircle, Menu, Plus, FileDown, Loader2 } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import StatusLog from './components/StatusLog';
import MarkdownRenderer from './components/MarkdownRenderer';
import { AppConfig, GenerationStep, ReportSection, ReportStatus, Reference, SearchResult } from './types';
import { searchTavily, generateText } from './services/api';
import { SYSTEM_PROMPTS, DEFAULT_MODELS } from './constants';

// Declare html2pdf for TypeScript
declare global {
  interface Window {
    html2pdf: () => any;
  }
}

const App: React.FC = () => {
  // --- State ---
  const [config, setConfig] = useState<AppConfig>({
    openRouterApiKey: localStorage.getItem('or_key') || '',
    tavilyApiKey: localStorage.getItem('tv_key') || '',
    model: DEFAULT_MODELS[0].id,
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<ReportStatus>(ReportStatus.IDLE);
  const [steps, setSteps] = useState<GenerationStep[]>([]);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [reportTitle, setReportTitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // --- Refs ---
  const processingRef = useRef(false);
  const referencesRef = useRef<Reference[]>([]);

  // --- Helpers ---
  const addStep = (message: string, type: GenerationStep['type']) => {
    setSteps(prev => [...prev, { message, type, timestamp: Date.now() }]);
  };

  const saveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('or_key', newConfig.openRouterApiKey);
    localStorage.setItem('tv_key', newConfig.tavilyApiKey);
  };

  // --- Core Logic: The Agent ---
  const startGeneration = async () => {
    if (!config.openRouterApiKey || !config.tavilyApiKey) {
      setIsSettingsOpen(true);
      return;
    }
    if (!subject.trim()) return;

    setStatus(ReportStatus.PLANNING);
    setSteps([]);
    setSections([]);
    setReferences([]);
    setReportTitle('');
    referencesRef.current = [];
    processingRef.current = true;

    try {
      // Step 1: Initial Research for Outline
      addStep(`正在分析主题: "${subject}"...`, 'search');
      const initialSearchQuery = `${subject} 舆情 事件背景 争议焦点 最新进展`;
      const initialSearchResults = await searchTavily(initialSearchQuery, config.tavilyApiKey);
      addStep(`已找到 ${initialSearchResults.length} 个核心来源，正在构建分析框架...`, 'success');

      // Step 2: Plan Outline
      addStep("正在规划专业报告章节架构...", 'info');
      const contextStr = initialSearchResults.map(r => `- ${r.title}: ${r.content}`).join('\n');
      
      const outlinePrompt = [
        { role: "system", content: SYSTEM_PROMPTS.OUTLINE_GENERATOR },
        { role: "user", content: `Subject: ${subject}\n\nInitial Search Context:\n${contextStr}` }
      ];

      // Request JSON
      let outlineJsonStr = await generateText(outlinePrompt, config, true);
      
      // Sanitization: Remove Markdown code blocks if present (common LLM issue)
      outlineJsonStr = outlineJsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

      let outline;
      try {
        outline = JSON.parse(outlineJsonStr);
      } catch (e) {
        console.error("JSON Parse Error:", e, outlineJsonStr);
        throw new Error("生成大纲格式解析失败，请重试。");
      }
      
      setReportTitle(outline.title || `${subject} 深度舆情研究报告`);
      const pendingSections: ReportSection[] = outline.chapters.map((title: string) => ({
        title,
        content: '',
        status: 'pending'
      }));
      setSections(pendingSections);
      
      setStatus(ReportStatus.GENERATING);
      addStep(`架构已确立: 包含 ${pendingSections.length} 个专业板块。开始深度调研...`, 'success');

      // Step 3: Iterate and Generate
      let updatedSections = [...pendingSections];
      
      for (let i = 0; i < updatedSections.length; i++) {
        const section = updatedSections[i];
        
        // Update UI to show researching
        updatedSections[i] = { ...section, status: 'researching' };
        setSections([...updatedSections]);
        addStep(`[${i + 1}/${updatedSections.length}] 正在调研: ${section.title}`, 'search');

        // Research specific chapter
        const chapterQuery = `${subject} ${section.title} 详细数据 观点 深度分析`;
        const chapterSearchResults = await searchTavily(chapterQuery, config.tavilyApiKey);
        
        // Store references
        chapterSearchResults.forEach(res => {
            if (!referencesRef.current.find(r => r.url === res.url)) {
                referencesRef.current.push({
                    id: referencesRef.current.length + 1,
                    title: res.title,
                    url: res.url
                });
            }
        });
        setReferences([...referencesRef.current]);

        // Writing
        updatedSections[i] = { ...section, status: 'writing' };
        setSections([...updatedSections]);
        addStep(`正在撰写: ${section.title}...`, 'writing');

        const chapterContext = chapterSearchResults.map(r => `来源 (${r.title}): ${r.content}`).join('\n\n');
        
        const writePrompt = [
          { role: "system", content: SYSTEM_PROMPTS.SECTION_WRITER.replace('{chapterTitle}', section.title).replace('{subject}', subject).replace('{searchContext}', chapterContext) },
          { role: "user", content: `撰写章节 "${section.title}"。` }
        ];

        const content = await generateText(writePrompt, config, false);
        
        updatedSections[i] = { ...section, content: content, status: 'completed' };
        setSections([...updatedSections]);
        
        // Small delay to be polite to APIs
        await new Promise(r => setTimeout(r, 800));
      }

      setStatus(ReportStatus.COMPLETED);
      addStep("全部分析完成。报告已生成。", 'success');

    } catch (error: any) {
      console.error(error);
      addStep(`错误: ${error.message}`, 'error');
      setStatus(ReportStatus.FAILED);
    } finally {
      processingRef.current = false;
    }
  };

  // --- Export Handlers ---
  const getFullMarkdown = () => {
    let md = `# ${reportTitle}\n\n`;
    md += `> 由 OmniReport 研究报告分析系统生成于 ${new Date().toLocaleDateString()}\n\n`;
    
    sections.forEach(s => {
      md += `## ${s.title}\n\n${s.content}\n\n`;
    });

    md += `\n---\n\n## 参考资料索引 (References)\n\n`;
    references.forEach(r => {
      md += `[${r.id}] [${r.title}](${r.url})\n`;
    });
    return md;
  };

  const handleExportMarkdown = () => {
    if (sections.length === 0) return;
    const md = getFullMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/\s+/g, '_')}_report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportWord = () => {
    if (!reportContainerRef.current) return;
    
    // Simple HTML to Word hack
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>" + reportTitle + "</title></head><body>";
    const footer = "</body></html>";
    
    const sourceHTML = header + reportContainerRef.current.innerHTML + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], {
        type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportPDF = () => {
    if (!reportContainerRef.current || !window.html2pdf) {
      alert("PDF生成组件未加载，请刷新重试。");
      return;
    }
    const element = reportContainerRef.current;
    const opt = {
      margin:       [10, 10, 10, 10], // top, left, bottom, right
      filename:     `${reportTitle.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    window.html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f4f9] text-gray-800 font-sans overflow-hidden">
      
      {/* Sidebar - Gemini Style */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-[#f0f4f9] flex-shrink-0 transition-all duration-300 ease-in-out border-r border-gray-200 flex flex-col overflow-hidden`}>
        <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700 font-semibold select-none">
              <Menu className="w-5 h-5 cursor-pointer" onClick={() => setSidebarOpen(false)} />
              <span className="tracking-tight">OmniReport</span>
            </div>
            <button onClick={() => { setSubject(''); setStatus(ReportStatus.IDLE); setSections([]); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors" title="新建报告">
              <Plus className="w-5 h-5 text-gray-500" />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
           <div className="text-xs font-medium text-gray-500 px-3 mb-2">最近报告</div>
           {reportTitle && (
             <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all truncate flex items-center gap-2">
               <FileText className="w-4 h-4 text-blue-500" />
               {reportTitle}
             </button>
           )}
           {status === ReportStatus.IDLE && (
             <div className="text-xs text-gray-400 px-3 italic">暂无记录</div>
           )}
        </div>
        <div className="p-4 border-t border-gray-200">
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-gray-200"
           >
             <Settings className="w-4 h-4" />
             <span>API 设置</span>
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {!sidebarOpen && (
          <div className="absolute top-4 left-4 z-10">
            <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white shadow-md rounded-full hover:bg-gray-50">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-12 py-8 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8 pb-32">
            
            {/* Welcome / Idle State */}
            {status === ReportStatus.IDLE && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-700">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight">
                  研究报告分析系统
                </h1>
                <p className="text-lg text-gray-500 max-w-xl">
                  基于实时联网搜索最新数据，撰写专业报告。
                </p>
              </div>
            )}

            {/* Active State */}
            {status !== ReportStatus.IDLE && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-4 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">{reportTitle || "正在生成专业报告..."}</h1>
                        <p className="text-sm text-gray-500 mt-1">分析对象: {subject}</p>
                    </div>
                    {status === ReportStatus.COMPLETED && (
                        <div className="flex gap-2">
                           <button onClick={handleExportMarkdown} className="flex items-center gap-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
                              <Download className="w-4 h-4" /> MD
                           </button>
                           <button onClick={handleExportWord} className="flex items-center gap-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
                              <FileText className="w-4 h-4" /> Word
                           </button>
                           <button onClick={handleExportPDF} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-sm text-sm">
                              <FileDown className="w-4 h-4" /> PDF
                           </button>
                        </div>
                    )}
                </div>

                {/* Progress / Logs */}
                <StatusLog steps={steps} />

                {/* Report Content Container (for PDF/Export) */}
                <div ref={reportContainerRef} className="bg-white rounded-none md:rounded-2xl p-0 md:p-12 shadow-none md:shadow-lg min-h-[500px]">
                  {/* Title in Report for export */}
                  <div className="mb-10 text-center border-b pb-8">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">{reportTitle}</h1>
                      <div className="text-gray-500">生成时间: {new Date().toLocaleDateString()}</div>
                      <div className="text-gray-500 mt-2">OmniReport 研究报告分析系统</div>
                  </div>

                  <div className="space-y-12">
                    {sections.map((section, idx) => (
                      <div key={idx} className={`transition-all duration-500 ${section.status === 'pending' ? 'opacity-40' : 'opacity-100'}`}>
                        <div className="flex items-center justify-between mb-6 border-l-4 border-blue-500 pl-4">
                          <h2 className="text-2xl font-bold text-gray-800">
                              {section.title}
                          </h2>
                          {section.status === 'writing' && <span className="text-xs font-medium text-purple-600 animate-pulse uppercase tracking-wider">撰写中...</span>}
                          {section.status === 'researching' && <span className="text-xs font-medium text-blue-600 animate-pulse uppercase tracking-wider">调研中...</span>}
                        </div>
                        
                        {section.content ? (
                          <MarkdownRenderer content={section.content} />
                        ) : (
                          <div className="h-24 flex items-center justify-center text-gray-300 italic text-sm border-2 border-dashed border-gray-100 rounded-lg">
                            等待生成内容...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* References */}
                  {references.length > 0 && (
                      <div className="mt-16 pt-8 border-t border-gray-200 break-before-page">
                          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
                              <BookOpen className="w-6 h-6 text-gray-500" />
                              资料来源索引 (References)
                          </h2>
                          <ul className="space-y-2">
                              {references.map((ref) => (
                                  <li key={ref.id} className="text-sm text-gray-600 flex gap-3">
                                      <span className="text-gray-400 font-mono select-none">[{ref.id}]</span>
                                      <a href={ref.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline break-all">
                                          {ref.title}
                                      </a>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gradient-to-t from-[#f0f4f9] via-[#f0f4f9] to-transparent">
          <div className="max-w-4xl mx-auto">
            <div className={`relative bg-white rounded-3xl shadow-lg border border-gray-200 transition-all focus-within:shadow-xl focus-within:border-blue-300 ${status !== ReportStatus.IDLE && status !== ReportStatus.COMPLETED && status !== ReportStatus.FAILED ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startGeneration()}
                placeholder="输入舆情主题 (例如: '特斯拉财报舆情分析')"
                className="w-full pl-6 pr-14 py-4 rounded-3xl outline-none bg-transparent text-gray-800 placeholder-gray-400"
                disabled={status !== ReportStatus.IDLE && status !== ReportStatus.COMPLETED && status !== ReportStatus.FAILED}
              />
              <button 
                onClick={startGeneration}
                disabled={!subject.trim() || (status !== ReportStatus.IDLE && status !== ReportStatus.COMPLETED && status !== ReportStatus.FAILED)}
                className="absolute right-2 top-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-transform hover:scale-105 disabled:bg-gray-300 disabled:scale-100"
              >
                {status === ReportStatus.PLANNING || status === ReportStatus.GENERATING ? (
                   <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                   <Send className="w-5 h-5 ml-0.5" />
                )}
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">
                Gemini 风格代理 • 需 OpenRouter & Tavily Key • 自动生成深度分析报告
            </p>
          </div>
        </div>

      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={saveConfig}
      />
    </div>
  );
};

export default App;

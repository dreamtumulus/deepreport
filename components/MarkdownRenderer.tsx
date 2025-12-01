import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ChartRenderer, { ChartData } from './ChartRenderer';

declare global {
  interface Window {
    marked: {
      parse: (text: string) => string;
      setOptions: (options: any) => void;
      Renderer: new () => any;
    };
  }
}

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.marked) return;

    // Custom renderer for code blocks to catch "json chart"
    const renderer = new window.marked.Renderer();
    const originalCode = renderer.code;

    renderer.code = (code: string, language: string) => {
      if (language === 'json chart' || language === 'chart') {
        try {
          // Verify JSON validity (parsing check)
          JSON.parse(code);
          // Return a placeholder div with the data in a dataset attribute
          // We encode the JSON to be safe in an attribute
          const encodedData = encodeURIComponent(code);
          return `<div class="chart-placeholder-root" data-chart="${encodedData}"></div>`;
        } catch (e) {
          return `<pre><code class="language-json">Error parsing chart data: ${e}</code></pre>`;
        }
      }
      // Fallback to default
      // Note: Since we are replacing the method, we can't easily call 'super' or original without binding.
      // But marked default renderer logic for code is simple:
      return `<pre><code class="language-${language}">${code}</code></pre>`;
    };

    window.marked.setOptions({ renderer });
    const html = window.marked.parse(content);
    
    if (containerRef.current) {
      containerRef.current.innerHTML = html;

      // Hydrate charts
      const placeholders = containerRef.current.querySelectorAll('.chart-placeholder-root');
      placeholders.forEach((el) => {
        const jsonStr = decodeURIComponent(el.getAttribute('data-chart') || '');
        if (jsonStr) {
          try {
            const chartData: ChartData = JSON.parse(jsonStr);
            const root = createRoot(el);
            root.render(<ChartRenderer config={chartData} />);
          } catch (e) {
            console.error("Failed to hydrate chart", e);
          }
        }
      });
    }

    // Cleanup not strictly necessary for innerHTML replacement but good practice if we were removing components individually
    return () => {
        // We can't easily unmount roots created inside the loop without tracking them.
        // Given the simplistic nature of this renderer (full re-render on content change),
        // the old DOM is blown away, which garbage collects the roots mostly. 
        // For a prod app, we might want to track roots.
    };

  }, [content]);

  return (
    <div 
      ref={containerRef}
      className="markdown-body text-gray-800 leading-relaxed"
    />
  );
};

export default MarkdownRenderer;
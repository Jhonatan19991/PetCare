import React from 'react';

interface MarkdownMessageProps {
  message: string;
  role: 'user' | 'assistant';
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ message, role }) => {
  // Función para convertir markdown básico a HTML
  const renderMarkdown = (text: string) => {
    let html = text
      // Convertir **texto** a <strong>texto</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convertir *texto* a <em>texto</em> (pero no si está dentro de **)
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Convertir `texto` a <code>texto</code>
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Convertir ## Título a <h2>Título</h2>
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      // Convertir # Título a <h1>Título</h1>
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Convertir - item a <li>item</li>
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      // Convertir * item a <li>item</li> (solo al inicio de línea)
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      // Convertir @usuario a <span class="mention">@usuario</span>
      .replace(/@(\w+)/g, '<span class="mention">@$1</span>');

    // Envolver las listas consecutivas en <ul>
    html = html.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/gs, (match) => {
      return '<ul>' + match + '</ul>';
    });

    // Convertir saltos de línea a <br> (pero no dentro de elementos HTML)
    html = html.replace(/\n(?![^<]*>)/g, '<br>');

    return html;
  };

  const htmlContent = renderMarkdown(message);

  return (
    <div 
      className={`max-w-[80%] p-3 rounded-lg ${
        role === 'user' 
          ? 'bg-primary text-primary-foreground ml-auto' 
          : 'bg-background border shadow-soft mr-auto'
      }`}
    >
      <div 
        className="text-sm prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        style={{
          lineHeight: '1.5',
          wordWrap: 'break-word'
        }}
      />
    </div>
  );
};

export default MarkdownMessage;

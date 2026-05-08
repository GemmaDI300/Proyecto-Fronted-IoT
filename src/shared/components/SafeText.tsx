import { useMemo } from 'react';
import { sanitizeHtml, truncateText } from '../utils/sanitization';

/**
 * Componente para renderizar texto de forma segura
 * Escapa automáticamente HTML peligroso y trunca textos largos
 * 
 * Uso: <SafeText>{backendData.name}</SafeText>
 */
interface SafeTextProps {
    children: string | null | undefined;
    maxLength?: number;
    /** Si true, permite renderizar el HTML escapado como HTML (peligroso, usar solo si confías en el origen) */
    allowHtml?: boolean;
}

export default function SafeText({ 
    children, 
    maxLength = 1000,
    allowHtml = false 
}: SafeTextProps) {
    const safeText = useMemo(() => {
        if (!children) return '';
        
        // Trunca texto largo (previene DoS visual)
        let text = truncateText(children, maxLength);
        
        // Sanitiza HTML si NO se permite HTML
        if (!allowHtml) {
            text = sanitizeHtml(text);
        }
        
        return text;
    }, [children, maxLength, allowHtml]);
    
    if (allowHtml) {
        // ⚠️ PELIGROSO: Solo usar si el texto viene de fuente confiable
        return <span dangerouslySetInnerHTML={{ __html: safeText }} />;
    }
    
    // ✅ SEGURO: React escapa automáticamente
    return <>{safeText}</>;
}

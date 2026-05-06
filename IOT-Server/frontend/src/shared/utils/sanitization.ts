/**
 * Utilidades de sanitización para prevenir XSS y otras inyecciones
 * 
 * Este módulo provee funciones para sanitizar entradas y salidas en el frontend,
 * implementando una estrategia de defensa en profundidad contra:
 * - XSS (Cross-Site Scripting)
 * - Inyección de URLs maliciosas
 * - Inyección de atributos HTML peligrosos
 * - Inyección de SQL (prevención básica frontend)
 */

/**
 * Escapa caracteres HTML especiales para prevenir XSS
 * Transforma: < > & " ' / a entidades HTML seguras
 * 
 * Uso: Sanitizar texto antes de insertar en HTML o enviar al backend
 * 
 * @param input - Texto a sanitizar
 * @returns Texto con caracteres HTML escapados
 * 
 * @example
 * sanitizeHtml("<script>alert('XSS')</script>")
 * // Retorna: "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;"
 */
export const sanitizeHtml = (input: string): string => {
    if (!input) return input;
    
    const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    const reg = /[&<>"'/]/gi;
    return input.replace(reg, (match) => map[match]);
};

/**
 * Remueve completamente tags HTML de un string
 * Más agresivo que sanitizeHtml: elimina tags en lugar de escaparlos
 * 
 * Uso: Campos donde NO se permite ningún HTML (nombres, emails, etc)
 * 
 * @param input - Texto a limpiar
 * @returns Texto sin tags HTML
 * 
 * @example
 * stripHtmlTags("Hola <b>mundo</b>") // Retorna: "Hola mundo"
 * stripHtmlTags("<script>alert('XSS')</script>") // Retorna: "alert('XSS')"
 */
export const stripHtmlTags = (input: string): string => {
    if (!input) return input;
    
    // Remueve tags HTML completos
    let cleaned = input.replace(/<[^>]*>/g, '');
    
    // Remueve entidades HTML codificadas que podrían ser peligrosas
    cleaned = cleaned.replace(/&lt;/gi, '');
    cleaned = cleaned.replace(/&gt;/gi, '');
    cleaned = cleaned.replace(/&quot;/gi, '');
    cleaned = cleaned.replace(/&#x27;/gi, '');
    cleaned = cleaned.replace(/&#x2F;/gi, '');
    
    return cleaned.trim();
};

/**
 * Valida y sanitiza URLs para prevenir javascript:, data:, file: schemes
 * Solo permite http:, https:, mailto: y URLs relativas
 * 
 * Uso: Validar URLs antes de usarlas en href, src, etc.
 * 
 * @param url - URL a validar
 * @returns URL sanitizada o null si es peligrosa
 * 
 * @example
 * sanitizeUrl("javascript:alert('XSS')") // Retorna: null
 * sanitizeUrl("http://google.com") // Retorna: "http://google.com"
 * sanitizeUrl("data:text/html,<script>alert('XSS')</script>") // Retorna: null
 */
export const sanitizeUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    const trimmedUrl = url.trim().toLowerCase();
    
    // Lista negra de protocolos peligrosos
    const dangerousProtocols = [
        'javascript:',
        'data:',
        'file:',
        'vbscript:',
        'about:',
    ];
    
    // Verifica si la URL usa un protocolo peligroso
    for (const protocol of dangerousProtocols) {
        if (trimmedUrl.startsWith(protocol)) {
            console.warn(`[Sanitization] Blocked dangerous URL: ${url}`);
            return null;
        }
    }
    
    // Solo permite protocolos seguros o URLs relativas
    const safeProtocolRegex = /^(https?:\/\/|mailto:|\/|\.\/|\.\.\/|#)/i;
    
    if (!safeProtocolRegex.test(trimmedUrl)) {
        console.warn(`[Sanitization] Blocked URL with unknown protocol: ${url}`);
        return null;
    }
    
    return url.trim(); // Retorna URL original (sin lowercase)
};

/**
 * Sanitiza objetos completos recursivamente
 * Aplica sanitizeHtml a todos los valores string del objeto
 * 
 * Uso: Sanitizar payloads antes de enviar al backend
 * 
 * @param obj - Objeto a sanitizar
 * @param exceptions - Array de keys que NO deben sanitizarse (ej: "password")
 * @returns Objeto con strings sanitizados
 * 
 * @example
 * sanitizeObject({ name: "<script>", age: 25 }, [])
 * // Retorna: { name: "&lt;script&gt;", age: 25 }
 */
export const sanitizeObject = <T extends Record<string, unknown>>(
    obj: T,
    exceptions: string[] = ['password', 'token', 'hash']
): T => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = { ...obj };
    
    for (const key in sanitized) {
        const value = sanitized[key];
        
        // Skip excepciones (contraseñas, tokens)
        if (exceptions.includes(key)) {
            continue;
        }
        
        // Sanitiza strings
        if (typeof value === 'string') {
            sanitized[key] = sanitizeHtml(value) as T[Extract<keyof T, string>];
        }
        
        // Recursión para objetos anidados
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value as Record<string, unknown>, exceptions) as T[Extract<keyof T, string>];
        }
        
        // Recursión para arrays
        else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'string' 
                    ? sanitizeHtml(item)
                    : typeof item === 'object' && item !== null
                    ? sanitizeObject(item as Record<string, unknown>, exceptions)
                    : item
            ) as T[Extract<keyof T, string>];
        }
    }
    
    return sanitized;
};

/**
 * Valida que un string no contenga patrones de SQL injection
 * Esta es una validación básica; la protección real debe estar en el backend
 * 
 * Uso: Validación adicional en campos de búsqueda, filtros, etc.
 * 
 * @param input - String a validar
 * @returns true si es seguro, false si contiene patrones sospechosos
 * 
 * @example
 * isSafeSqlInput("John Doe") // true
 * isSafeSqlInput("1' OR '1'='1") // false
 */
export const isSafeSqlInput = (input: string): boolean => {
    if (!input) return true;
    
    // Patrones comunes de SQL injection
    const sqlInjectionPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
        /(--|\*\/|\/\*)/g, // SQL comments
        /('|")\s*(OR|AND)\s*('|")?(\d+)?\s*=\s*('|")?(\d+)?/gi, // ' OR '1'='1
        /(\bUNION\b.*\bSELECT\b)/gi,
        /(\bEXEC\b|\bEXECUTE\b)/gi,
        /(;.*DROP)/gi,
    ];
    
    for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(input)) {
            console.warn(`[Sanitization] Blocked potential SQL injection: ${input}`);
            return false;
        }
    }
    
    return true;
};

/**
 * Sanitiza nombres de archivos para prevenir path traversal
 * Remueve ../, ..\, caracteres especiales peligrosos
 * 
 * Uso: Validar nombres de archivos subidos o referenciados
 * 
 * @param filename - Nombre de archivo a sanitizar
 * @returns Nombre de archivo seguro
 * 
 * @example
 * sanitizeFilename("../../etc/passwd") // Retorna: "etcpasswd"
 * sanitizeFilename("file<script>.txt") // Retorna: "filescript.txt"
 */
export const sanitizeFilename = (filename: string): string => {
    if (!filename) return '';
    
    // Remueve path traversal
    let safe = filename.replace(/\.\.\//g, '');
    safe = safe.replace(/\.\.\\/g, '');
    
    // Remueve caracteres peligrosos
    safe = safe.replace(/[<>:"|?*]/g, '');
    
    // Remueve espacios al inicio/fin
    safe = safe.trim();
    
    // Limita longitud
    if (safe.length > 255) {
        safe = safe.substring(0, 255);
    }
    
    return safe;
};

/**
 * Valida que un email sea seguro (sin HTML, sin espacios, formato válido)
 * 
 * @param email - Email a validar
 * @returns true si es seguro
 */
export const isSafeEmail = (email: string): boolean => {
    if (!email) return false;
    
    // Verifica que no tenga HTML
    if (/<[^>]*>/g.test(email)) {
        console.warn(`[Sanitization] Email contains HTML tags: ${email}`);
        return false;
    }
    
    // Verifica formato básico
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return false;
    }
    
    return true;
};

/**
 * Sanitiza datos que vienen del backend antes de renderizar
 * Similar a sanitizeObject pero menos agresivo (no escapa todo)
 * 
 * Uso: Limpiar datos del API response antes de mostrar
 * 
 * @param data - Datos del backend
 * @returns Datos sanitizados
 */
export const sanitizeBackendResponse = <T extends Record<string, unknown>>(data: T): T => {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    
    for (const key in sanitized) {
        const value = sanitized[key];
        
        // Para strings, solo remueve scripts evidentes pero mantiene formato
        if (typeof value === 'string') {
            // Remueve <script> tags explícitos
            let cleaned = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            
            // Remueve event handlers inline (onclick, onerror, etc)
            cleaned = cleaned.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
            
            sanitized[key] = cleaned as T[Extract<keyof T, string>];
        }
        
        // Recursión para objetos anidados
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeBackendResponse(value as Record<string, unknown>) as T[Extract<keyof T, string>];
        }
        
        // Recursión para arrays
        else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'object' && item !== null
                    ? sanitizeBackendResponse(item as Record<string, unknown>)
                    : item
            ) as T[Extract<keyof T, string>];
        }
    }
    
    return sanitized;
};

/**
 * Trunca texto largo y añade "..." para prevenir overflow y ataques de DoS
 * 
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima (default 1000)
 * @returns Texto truncado
 */
export const truncateText = (text: string, maxLength: number = 1000): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
};

/**
 * Sanitiza parámetros de query string en URLs
 * 
 * @param params - Objeto con parámetros
 * @returns Query string sanitizado
 */
export const sanitizeQueryParams = (params: Record<string, string | number | boolean>): string => {
    const sanitizedParams = new URLSearchParams();
    
    for (const [key, value] of Object.entries(params)) {
        // Sanitiza key y value
        const safeKey = encodeURIComponent(stripHtmlTags(String(key)));
        const safeValue = encodeURIComponent(stripHtmlTags(String(value)));
        
        sanitizedParams.append(safeKey, safeValue);
    }
    
    return sanitizedParams.toString();
};

/**
 * Valida que un ID numérico sea válido (previene inyección en rutas)
 * 
 * @param id - ID a validar
 * @returns true si es un ID válido
 */
export const isValidId = (id: string | number): boolean => {
    const idStr = String(id);
    
    // Solo permite números o UUIDs
    const isNumber = /^\d+$/.test(idStr);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr);
    
    return isNumber || isUuid;
};

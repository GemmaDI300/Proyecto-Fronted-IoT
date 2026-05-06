import * as Yup from "yup";
import { sanitizeHtml, isSafeEmail, isSafeSqlInput } from "../../utils/sanitization";

// Re-exportar funciones de sanitización para compatibilidad
export { sanitizeHtml, isSafeEmail, isSafeSqlInput };

// Validación de complejidad de contraseña según OWASP
export const validatePasswordStrength = (password: string): boolean => {
    // Requiere al menos:
    // - 8 caracteres
    // - 1 mayúscula
    // - 1 minúscula
    // - 1 número
    // - 1 carácter especial
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasMinLength = password.length >= 8;
    
    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && hasMinLength;
};

// Validación de CURP con formato completo y dígito verificador
export const validateCURP = (curp: string): boolean => {
    // Formato: AAPP######HMCRRR##
    // 4 letras + 6 números (fecha) + H/M + 2 letras (estado) + 3 consonantes + 2 dígitos verificadores
    const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/;
    return curpRegex.test(curp);
};

// Validación de RFC con homoclave
export const validateRFC = (rfc: string): boolean => {
    // Persona física: 13 caracteres (4 letras + 6 números + 3 homoclave)
    // Persona moral: 12 caracteres (3 letras + 6 números + 3 homoclave)
    const rfcFisica = /^[A-Z]{4}[0-9]{6}[A-Z0-9]{3}$/;
    const rfcMoral = /^[A-Z]{3}[0-9]{6}[A-Z0-9]{3}$/;
    return rfcFisica.test(rfc) || rfcMoral.test(rfc);
};

export const generatePersonalDataSchema = (isRequired = false) => {
    return Yup.object().shape({
        first_name: Yup.string()
            .min(2, "El nombre debe tener al menos 2 caracteres")
            .max(60, "El nombre no puede tener más de 60 caracteres")
            .matches(/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras")
            .test('no-html', 'El nombre contiene caracteres no permitidos', (value) => {
                if (!value) return true;
                return !/[<>"'&]/.test(value);
            })
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        last_name: Yup.string()
            .min(2, "Mínimo 2 caracteres")
            .max(60, "Máximo 60 caracteres")
            .matches(/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras")
            .test('no-html', 'El apellido contiene caracteres no permitidos', (value) => {
                if (!value) return true;
                return !/[<>"'&]/.test(value);
            })
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        second_last_name: Yup.string()
            .min(2, "Mínimo 2 caracteres")
            .max(60, "Máximo 60 caracteres")
            .matches(/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras")
            .test('no-html', 'El apellido contiene caracteres no permitidos', (value) => {
                if (!value) return true;
                return !/[<>"'&]/.test(value);
            })
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        phone: Yup.string()
            .matches(/^\+?[0-9]{10,15}$/, "Teléfono inválido")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        address: Yup.string()
            .min(5, "Mínimo 5 caracteres")
            .max(150, "Máximo 150 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        city: Yup.string()
            .min(2, "Mínimo 2 caracteres")
            .max(80, "Máximo 80 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        state: Yup.string()
            .min(2, "Mínimo 2 caracteres")
            .max(80, "Máximo 80 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        postal_code: Yup.string()
            .matches(/^[0-9]{5}$/, "Código postal de 5 dígitos")
            .test('valid-range', 'Código postal debe estar entre 01000 y 99999', (value) => {
                if (!value) return true; // Si no es requerido y está vacío, pasa
                const num = parseInt(value, 10);
                return num >= 1000 && num <= 99999;
            })
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        birth_date: Yup.string()
            .test('not-future', 'La fecha de nacimiento no puede ser futura', (value) => {
                if (!value) return true;
                const birthDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Resetear hora para comparar solo fechas
                return birthDate <= today;
            })
            .test('min-age', 'Debe ser mayor de edad (18 años)', (value) => {
                if (!value) return true;
                const birthDate = new Date(value);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                const dayDiff = today.getDate() - birthDate.getDate();
                
                // Calcular edad exacta
                if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                    return age - 1 >= 18;
                }
                return age >= 18;
            })
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        email: Yup.string()
            .email("Email inválido")
            .min(6, "Mínimo 6 caracteres")
            .max(254, "Máximo 254 caracteres")
            .test('no-html', 'El email contiene caracteres no permitidos', (value) => {
                if (!value) return true;
                return !/[<>"'&]/.test(value);
            })
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        password: Yup.string()
            .min(8, "Mínimo 8 caracteres")
            .max(128, "Máximo 128 caracteres")
            .test('strong-password', 
                'La contraseña debe contener mayúscula, minúscula, número y carácter especial (!@#$%^&*)', 
                (value) => {
                    if (!value) return true;
                    return validatePasswordStrength(value);
                }
            )
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        curp: Yup.string()
            .length(18, "CURP debe tener exactamente 18 caracteres")
            .test('valid-curp', 
                'CURP inválido. Formato: 4 letras + 6 números (YYMMDD) + H/M + 2 letras (estado) + 3 consonantes + 2 dígitos', 
                (value) => {
                    if (!value) return true;
                    return validateCURP(value.toUpperCase());
                }
            )
            .uppercase()
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        rfc: Yup.string()
            .test('valid-rfc-length', 'RFC debe tener 12 o 13 caracteres', (value) => {
                if (!value) return true;
                return value.length === 12 || value.length === 13;
            })
            .test('valid-rfc', 
                'RFC inválido. Formato: 3-4 letras + 6 números (YYMMDD) + 3 caracteres homoclave', 
                (value) => {
                    if (!value) return true;
                    return validateRFC(value.toUpperCase());
                }
            )
            .uppercase()
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        ...(isRequired ? {} : { is_active: Yup.boolean().optional() }),
    });
};

export const generateDeviceSchema = (isRequired = false) => {
    return Yup.object().shape({
        name: Yup.string()
            .min(1, "Mínimo 1 carácter")
            .max(100, "Máximo 100 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        brand: Yup.string()
            .max(100, "Máximo 100 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        model: Yup.string()
            .max(100, "Máximo 100 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        serial_number: Yup.string()
            .max(100, "Máximo 100 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        ip: Yup.string()
            .matches(
                /^(\d{1,3}\.){3}\d{1,3}$/,
                "Formato IP inválido (ej: 192.168.1.1)"
            )
            .test('valid-ip', 'Dirección IP inválida (cada octeto debe estar entre 0-255)', (value) => {
                if (!value) return true;
                const octets = value.split('.');
                return octets.every(octet => {
                    const num = parseInt(octet, 10);
                    return num >= 0 && num <= 255;
                });
            })
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        mac: Yup.string()
            .matches(
                /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
                "Formato MAC inválido (ej: AA:BB:CC:DD:EE:FF)"
            )
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        ...(isRequired ? {} : { is_active: Yup.boolean().optional() }),
    });
};

export const generateServiceSchema = (isRequired = false) => {
    return Yup.object().shape({
        name: Yup.string()
            .min(1, "Mínimo 1 carácter")
            .max(100, "Máximo 100 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        description: Yup.string().max(500, "Máximo 500 caracteres").optional(),
        administrator_id: Yup.string()
            .uuid("ID de administrador inválido")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        ...(isRequired ? {} : { is_active: Yup.boolean().optional() }),
    });
};

export const generateApplicationSchema = (isRequired = false) => {
    return Yup.object().shape({
        name: Yup.string()
            .min(1, "Mínimo 1 carácter")
            .max(100, "Máximo 100 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        version: Yup.string().max(50, "Máximo 50 caracteres").optional(),
        url: Yup.string().max(300, "Máximo 300 caracteres").optional(),
        port: Yup.string()
            .matches(/^[0-9]*$/, "Solo números")
            .optional(),
        description: Yup.string().max(500, "Máximo 500 caracteres").optional(),
        administrator_id: Yup.string()
            .uuid("ID de administrador inválido")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
    });
};

export const generateServiceTicketSchema = (isRequired = false) => {
    return Yup.object().shape({
        title: Yup.string()
            .min(1, "Mínimo 1 carácter")
            .max(200, "Máximo 200 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        description: Yup.string().max(1000, "Máximo 1000 caracteres").optional(),
        user_role_id: Yup.string()
            .uuid("ID de rol de usuario inválido")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        status_id: Yup.string().when([], {
            is: () => isRequired,
            then: (s) => s.required("Campo obligatorio"),
        }),
        service_id: Yup.string()
            .uuid("ID de servicio inválido")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        priority: Yup.string()
            .oneOf(["low", "medium", "high", "critical"], "Prioridad inválida")
            .optional(),
    });
};

export const generateEcosystemTicketSchema = (isRequired = false) => {
    return Yup.object().shape({
        title: Yup.string()
            .min(1, "Mínimo 1 carácter")
            .max(200, "Máximo 200 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        description: Yup.string().max(1000, "Máximo 1000 caracteres").optional(),
        manager_service_id: Yup.string()
            .uuid("ID de manager-servicio inválido")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        status_id: Yup.string().when([], {
            is: () => isRequired,
            then: (s) => s.required("Campo obligatorio"),
        }),
        priority: Yup.string()
            .oneOf(["low", "medium", "high", "critical"], "Prioridad inválida")
            .optional(),
    });
};

export const generateRoleSchema = (isRequired = false) => {
    return Yup.object().shape({
        // El backend exige solo letras (sin dígitos, espacios ni símbolos)
        name: Yup.string()
            .min(1, "Mínimo 1 carácter")
            .max(255, "Máximo 255 caracteres")
            .matches(/^[A-Za-záéíóúÁÉÍÓÚñÑüÜ]+$/, "El nombre solo puede contener letras (sin espacios ni símbolos)")
            .test('no-html', 'El nombre contiene caracteres no permitidos', (value) => {
                if (!value) return true;
                return !/[<>"'&]/.test(value);
            })
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        description: Yup.string()
            .max(500, "Máximo 500 caracteres")
            .test('no-html', 'La descripción contiene caracteres no permitidos', (value) => {
                if (!value) return true;
                return !/[<>"'&]/.test(value);
            })
            .optional(),
        service_id: Yup.string()
            .uuid("ID de servicio inválido")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        ...(isRequired ? {} : { is_active: Yup.boolean().optional() }),
    });
};
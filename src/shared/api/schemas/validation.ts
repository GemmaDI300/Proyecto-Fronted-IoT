import * as Yup from "yup";

export const generatePersonalDataSchema = (isRequired = false) => {
    return Yup.object().shape({
        first_name: Yup.string()
            .min(2, "El nombre debe tener al menos 2 caracteres")
            .max(60, "El nombre no puede tener más de 60 caracteres")
            .matches(/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        last_name: Yup.string()
            .min(2, "Mínimo 2 caracteres")
            .max(60, "Máximo 60 caracteres")
            .matches(/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        second_last_name: Yup.string()
            .min(2, "Mínimo 2 caracteres")
            .max(60, "Máximo 60 caracteres")
            .matches(/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/, "Solo letras")
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
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        birth_date: Yup.string()
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        email: Yup.string()
            .email("Email inválido")
            .min(6, "Mínimo 6 caracteres")
            .max(254, "Máximo 254 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        password_hash: Yup.string()
            .min(8, "Mínimo 8 caracteres")
            .max(128, "Máximo 128 caracteres")
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        curp: Yup.string()
            .matches(/^[A-Za-z0-9]{18}$/, "CURP inválido (18 caracteres alfanuméricos)")
            .uppercase()
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
        rfc: Yup.string()
            .matches(/^[A-Za-z0-9]{12,13}$/, "RFC inválido (12-13 caracteres)")
            .uppercase()
            .when([], {
                is: () => isRequired,
                then: (s) => s.required("Campo obligatorio"),
            }),
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
    });
};

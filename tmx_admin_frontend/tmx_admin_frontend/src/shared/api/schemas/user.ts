import * as Yup from "yup";

// Definimos el tipo para el esquema de validación de los datos del formulario
export const generateValidationSchema = (isRequired: boolean = false) => {
    return Yup.object().shape({
        Name: Yup.string()
            .min(2, "El nombre debe tener al menos 2 caracteres")
            .max(20, "El nombre no puede tener más de 20 caracteres")
            .matches(
                /^[A-Za-z\s]+$/,
                "El nombre no puede contener numeros o caracteres especiales"
            )
            .when([], {
                is: () => isRequired,
                then: (schema) => schema.required("El campo Name es obligatorio"),
            }),

        LastName: Yup.string()
            .min(2, "El apellido debe tener al menos 2 caracteres")
            .max(50, "El apellido no puede tener más de 50 caracteres")
            .matches(
                /^[A-Za-z\s]+$/,
                "El apellido no puede contener numeros o caracteres especiales"
            )
            .when([], {
                is: () => isRequired,
                then: (schema) => schema.required("El campo LastName es obligatorio"),
            }),

        UserName: Yup.string()
            .min(4, "El nombre de usuario debe tener al menos 4 caracteres")
            .max(20, "El nombre de usuario no puede tener más de 20 caracteres")
            .when([], {
                is: () => isRequired,
                then: (schema) => schema.required("El campo UserName es obligatorio"),
            }),

        Password: Yup.string()
            .min(8, "La contraseña debe tener al menos 8 caracteres")
            .when([], {
                is: () => isRequired,
                then: (schema) => schema.required("El campo Password es obligatorio"),
            }),

        Email: Yup.string()
            .email("El campo Email es inválido")
            .when([], {
                is: () => isRequired,
                then: (schema) => schema.required("El campo Email es obligatorio"),
            }),

        Tel: Yup.string()
            .matches(/^[0-9]+$/, "El teléfono solo debe contener números")
            .min(10, "El teléfono debe tener al menos 10dígitos")
            .max(15, "El teléfono no puede tener más de 15 dígitos")
            .when([], {
                is: () => isRequired,
                then: (schema) => schema.required("El campo Tel es obligatorio"),
            }),
    });
};

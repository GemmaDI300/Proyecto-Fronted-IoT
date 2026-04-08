type WithOptionalId<T> = T & { id?: string };

// Definimos los tipos específicos para los props del componente
type GenericDataProps = Record<string, any>;

// Combinamos los tipos con `WithOptionalId` para agregar el campo `id` opcional
export type GenericDataWithId = WithOptionalId<GenericDataProps>;

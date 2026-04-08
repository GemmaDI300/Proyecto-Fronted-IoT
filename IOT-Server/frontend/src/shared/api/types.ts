// Respuesta del login
export interface TokenResponse {
    access_token: string;
    token_type: string;
    account_type: "administrator" | "manager" | "user";
    is_master: boolean;
}

// Credenciales de sesión almacenadas en el frontend
export interface SessionCredentials {
    token: string;
    accountId: string;
    accountType: "administrator" | "manager" | "user";
    isMaster: boolean;
}

// --- Personal Data ---
export interface PersonalDataCreate {
    first_name: string;
    last_name: string;
    second_last_name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    birth_date: string;
    email: string;
    password_hash: string;
    curp: string;
    rfc: string;
}

export interface PersonalDataUpdate {
    first_name?: string;
    last_name?: string;
    second_last_name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    birth_date?: string;
    email?: string;
    password_hash?: string;
    curp?: string;
    rfc?: string;
    is_active?: boolean;
}

export interface PersonalDataResponse {
    [key: string]: unknown;
    id: string;
    first_name: string;
    last_name: string;
    second_last_name: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// --- Device ---
export interface DeviceCreate {
    name: string;
    brand: string;
    model: string;
    serial_number: string;
    ip: string;
    mac: string;
}

export interface DeviceUpdate {
    name?: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    ip?: string;
    mac?: string;
    is_active?: boolean;
}

export interface DeviceResponse {
    [key: string]: unknown;
    id: string;
    name: string;
    brand: string;
    model: string;
    serial_number: string;
    ip: string;
    mac: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Respuesta paginada del backend
export interface PageResponse<T> {
    total: number;
    offset: number;
    limit: number;
    data: T[];
}

// Tipo genérico con id opcional — compatible con index signature de DataGrid
export type GenericDataWithId = { id?: string; [key: string]: unknown };

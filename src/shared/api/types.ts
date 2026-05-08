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
    password: string;
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
    password?: string;
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

// --- Service ---
export interface ServiceCreate {
    name: string;
    description?: string;
    administrator_id: string;
}

export interface ServiceUpdate {
    name?: string;
    description?: string;
    is_active?: boolean;
}

export interface ServiceResponse {
    [key: string]: unknown;
    id: string;
    name: string;
    description: string | null;
    administrator_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// --- Application ---
export interface ApplicationCreate {
    name: string;
    version?: string;
    url?: string;
    port?: number;
    description?: string;
    administrator_id: string;
}

export interface ApplicationUpdate {
    name?: string;
    version?: string;
    url?: string;
    port?: number;
    description?: string;
    is_active?: boolean;
}

export interface ApplicationResponse {
    [key: string]: unknown;
    id: string;
    name: string;
    version: string | null;
    url: string | null;
    port: number | null;
    description: string | null;
    administrator_id: string;
    api_key: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// --- Role ---
export interface RoleCreate {
    name: string;
    description?: string;
    service_id: string;
    is_active?: boolean;
}

export interface RoleUpdate {
    name?: string;
    description?: string;
    is_active?: boolean;
}

export interface RoleResponse {
    [key: string]: unknown;
    id: string;
    name: string;
    description: string | null;
    service_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// --- Tickets ---
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface ServiceTicketCreate {
    title: string;
    description?: string;
    user_role_id: string;
    status_id: number;
    service_id: string;
    priority?: TicketPriority;
}

export interface ServiceTicketUpdate {
    title?: string;
    description?: string;
    status_id?: number;
    priority?: TicketPriority;
}

export interface ServiceTicketResponse {
    [key: string]: unknown;
    id: string;
    title: string;
    description: string | null;
    user_role_id: string;
    status_id: number;
    service_id: string;
    priority: TicketPriority;
    created_at: string;
    updated_at: string;
}

export interface EcosystemTicketCreate {
    title: string;
    description?: string;
    manager_service_id: string;
    status_id: number;
    priority?: TicketPriority;
}

export interface EcosystemTicketUpdate {
    title?: string;
    description?: string;
    status_id?: number;
    priority?: TicketPriority;
}

export interface EcosystemTicketResponse {
    [key: string]: unknown;
    id: string;
    title: string;
    description: string | null;
    manager_service_id: string;
    status_id: number;
    priority: TicketPriority;
    created_at: string;
    updated_at: string;
}

// --- Vinculaciones (link join-table responses) ---
export interface ManagerServiceResponse {
    id: string;
    manager_id: string;
    service_id: string;
    created_at: string;
    updated_at: string;
}

export interface DeviceServiceResponse {
    id: string;
    device_id: string;
    service_id: string;
    created_at: string;
    updated_at: string;
}

export interface UserRoleResponse {
    id: string;
    user_id: string;
    role_id: string;
    created_at: string;
    updated_at: string;
}

// Tipo genérico con id opcional — compatible con index signature de DataGrid
export type GenericDataWithId = { id?: string; [key: string]: unknown };

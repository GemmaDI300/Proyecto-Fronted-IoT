//Requisitos que debe tener Payload
export interface Payload {
    pl: string;
}

export interface CreateUser {
    id?: string;
    UserName: string;
    Password: string;
    Name: string;
    LastName: string;
    Email: string;
    Tel: string;
}
export interface VincularDispositivo {
    id: string;
    id_device: string;
}

export type UpdateUser = Partial<CreateUser>;

export type DeleteUser = Pick<UpdateUser, "id">;

export interface CreateDevice {
    id: string;
    Type: string;
    UserName: string;
    Password: string;
    Propierty: string;
}

export type UpdateDevice = Partial<CreateDevice>;

export interface DeleteDevice {
    ID_Device: string;
}
export type CretaeType = Pick<CreateDevice, "UserName" | "Type">;

export interface DeleteType {
    ID_Type: string;
}

export interface Session {
    UserName: string;
    Payload: string;
    RandomNumber: number;
}
export interface SessionCredentials {
    password: Buffer;
    ID_Session: string;
}

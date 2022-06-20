import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Role, User } from '../../session/session.service';

export enum PermissionType {
    CAN_INSPECT_LANGUAGE = 'CAN_INSPECT_LANGUAGE',
}

export interface Permission {
    id: number;
    type: PermissionType;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
    constructor(private http: HttpClient) {}

    usersApi = () => '/app/users';
    permissionsApi = () => '/app/permissions';
    rolesApi = (id: number, role: string) => `/app/users/${id}/roles/${role}`;

    getPermissions = () => this.http.get<Permission[]>(this.permissionsApi());
    addPermission = (id: number, permission: PermissionType) =>
        this.http.post<void>(this.permissionsApi(), { id, permission });
    removePermission = (id: number, permission: PermissionType) =>
        this.http.request<void>('delete', this.permissionsApi(), { body: { id, permission } });
    getUsers = (filter: string) => this.http.get<User[]>(this.usersApi(), { params: { filter } });
    addRole = (id: number, role: string) => this.http.post<Role>(this.rolesApi(id, role), null);
    updateRole = (id: number, role: string) => this.http.put<Role>(this.rolesApi(id, role), null);
    removeRole = (id: number, role: string) => this.http.delete<void>(this.rolesApi(id, role));
}

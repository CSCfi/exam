import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export enum PermissionType {
    CAN_INSPECT_LANGUAGE = 'CAN_INSPECT_LANGUAGE',
}

export interface Permission {
    id: number;
    type: PermissionType;
}

@Injectable()
export class UserManagementService {
    constructor(private http: HttpClient) {}

    usersApi = () => '/app/users';
    permissionsApi = () => '/app/permissions';
    rolesApi = (id: number, role: RoleType) => `/app/users/${id}/roles/${role}`;

    getPermissions = () => this.http.get<Permission[]>(this.permissionsApi());
    addPermission = (id: number, permission: PermissionType) =>
        this.http.post<void>(this.permissionsApi(), { id, permission });
    removePermission = (id: number, permission: PermissionType) =>
        this.http.request<void>('delete', this.permissionsApi(), { body: { id, permission } });
    getUsers = (filter: string) => this.http.get<User[]>(this.usersApi(), { params: { filter } });
    addRole = (id: number, role: RoleType) => this.http.post<Role>(this.rolesApi(id, role), null);
    updateRole = (id: number, role: RoleType) => this.http.put<Role>(this.rolesApi(id, role), null);
    removeRole = (id: number, role: RoleType) => this.http.delete<void>(this.rolesApi(id, role));
}

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Permission, PermissionType, Role, User } from 'src/app/session/session.model';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
    private http = inject(HttpClient);

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

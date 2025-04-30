// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { Permission, PermissionType, Role, User } from 'src/app/session/session.model';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlingService,
    ) {}

    usersApi = () => '/app/users';
    permissionsApi = () => '/app/permissions';
    rolesApi = (id: number, role: string) => `/app/users/${id}/roles/${role}`;

    getPermissions = (): Observable<Permission[]> =>
        this.http
            .get<Permission[]>(this.permissionsApi())
            .pipe(catchError((err) => this.errorHandler.handle(err, 'UserManagementService.getPermissions')));

    addPermission = (id: number, permission: PermissionType): Observable<void> =>
        this.http
            .post<void>(this.permissionsApi(), { id, permission })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'UserManagementService.addPermission')));

    removePermission = (id: number, permission: PermissionType): Observable<void> =>
        this.http
            .request<void>('delete', this.permissionsApi(), { body: { id, permission } })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'UserManagementService.removePermission')));

    getUsers = (filter: string): Observable<User[]> =>
        this.http
            .get<User[]>(this.usersApi(), { params: { filter } })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'UserManagementService.getUsers')));

    addRole = (id: number, role: string): Observable<Role> =>
        this.http
            .post<Role>(this.rolesApi(id, role), null)
            .pipe(catchError((err) => this.errorHandler.handle(err, 'UserManagementService.addRole')));

    updateRole = (id: number, role: string): Observable<Role> =>
        this.http
            .put<Role>(this.rolesApi(id, role), null)
            .pipe(catchError((err) => this.errorHandler.handle(err, 'UserManagementService.updateRole')));

    removeRole = (id: number, role: string): Observable<void> =>
        this.http
            .delete<void>(this.rolesApi(id, role))
            .pipe(catchError((err) => this.errorHandler.handle(err, 'UserManagementService.removeRole')));
}

// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PermissionType } from 'src/app/session/session.model';
import { UserManagementService } from './users.service';

describe('UserManagementService', () => {
    let service: UserManagementService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(UserManagementService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    const request = (method: string, url: string) => http.expectOne((r) => r.method === method && r.url === url);

    it('should search users by the filter', () => {
        service.getUsers('sauli').subscribe();
        expect(request('GET', '/app/users').request.params.get('filter')).toBe('sauli');
    });

    it('should give and take a role by user and role name', () => {
        service.addRole(2, 'TEACHER').subscribe();
        request('POST', '/app/users/2/roles/TEACHER').flush({});
        service.removeRole(2, 'TEACHER').subscribe();
        request('DELETE', '/app/users/2/roles/TEACHER').flush(null);
    });

    it('should give and take a permission, naming the user and permission in the body', () => {
        service.addPermission(2, PermissionType.CAN_INSPECT_LANGUAGE).subscribe();
        expect(request('POST', '/app/permissions').request.body).toEqual({
            id: 2,
            permission: 'CAN_INSPECT_LANGUAGE',
        });
        service.removePermission(2, PermissionType.CAN_INSPECT_LANGUAGE).subscribe();
        expect(request('DELETE', '/app/permissions').request.body).toEqual({
            id: 2,
            permission: 'CAN_INSPECT_LANGUAGE',
        });
    });
});

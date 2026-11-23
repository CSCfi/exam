// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import type { User } from 'src/app/session/session.model';
import { PermissionType } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { ToastService } from 'src/app/shared/toast/toast.service';
import { vi } from 'vitest';
import { UsersComponent } from './users.component';
import { UserManagementService } from './users.service';

const person = (id: number, roles: string[], permissions: string[] = []) =>
    ({
        id,
        firstName: `User${id}`,
        roles: roles.map((name) => ({ name })),
        permissions: permissions.map((type) => ({ type })),
    }) as unknown as User;

describe('UsersComponent', () => {
    const management = {
        getPermissions: vi.fn(),
        getUsers: vi.fn(),
        addRole: vi.fn(() => of({})),
        removeRole: vi.fn(() => of(undefined)),
        addPermission: vi.fn(() => of(undefined)),
        removePermission: vi.fn(() => of(undefined)),
    };
    const toast = { error: vi.fn() };
    let me: { id: number; isAdmin: boolean };

    const create = (users: User[], isAdmin = true) => {
        me = { id: 1, isAdmin };
        management.getUsers.mockReturnValue(of(users));
        const c = TestBed.runInInjectionContext(() => new UsersComponent());
        c.search();
        return c;
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        management.getPermissions.mockReturnValue(
            of([{ type: PermissionType.CAN_INSPECT_LANGUAGE }, { type: PermissionType.CAN_CREATE_BYOD_EXAM }]),
        );
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                { provide: UserManagementService, useValue: management },
                { provide: ToastService, useValue: toast },
                { provide: SessionService, useValue: { getUser: () => me } },
            ],
        });
    });

    afterEach(() => vi.useRealTimers());

    const role = (c: UsersComponent, type: string) => c.roles().find((r) => r.type === type)!;
    const permission = (c: UsersComponent, type: string) => c.permissions().find((p) => p.type === type)!;
    const shown = (c: UsersComponent) => c.filteredUsers().map((u) => u.id);

    it('should name the permissions for display', () => {
        const c = create([]);
        expect(c.permissions().map((p) => p.name)).toEqual(['i18n_can_inspect_language', 'i18n_can_create_byod_exam']);
    });

    it('should search once typing has paused, with the text typed', () => {
        const c = create([]);
        management.getUsers.mockClear();
        c.filterText = 'sau';
        c.filterText = 'saul';
        vi.advanceTimersByTime(999);
        expect(management.getUsers).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(management.getUsers).toHaveBeenCalledWith('saul');
        expect(c.loader().loading).toBe(false);
    });

    it('should leave the administrator out of the list', () => {
        const c = create([person(1, ['ADMIN']), person(2, ['TEACHER'])]);
        expect(shown(c)).toEqual([2]);
    });

    it('should filter by one role or permission at a time', () => {
        const c = create([
            person(2, ['TEACHER'], ['CAN_INSPECT_LANGUAGE']),
            person(3, ['STUDENT']),
            person(4, ['TEACHER', 'STUDENT']),
        ]);

        c.applyRoleFilter(role(c, 'TEACHER'));
        expect(shown(c)).toEqual([2, 4]);
        // Choosing another role replaces the first
        c.applyRoleFilter(role(c, 'STUDENT'));
        expect(shown(c)).toEqual([3, 4]);
        c.applyRoleFilter(role(c, 'STUDENT'));
        expect(shown(c)).toEqual([2, 3, 4]);

        c.applyPermissionFilter(permission(c, 'CAN_INSPECT_LANGUAGE'));
        expect(shown(c)).toEqual([2]);
    });

    it('should let an administrator give and take any role', () => {
        const c = create([person(2, ['TEACHER'])]);
        const user = c.users()[0];
        expect(user.availableRoles.map((r) => r.type)).toEqual(['ADMIN', 'STUDENT', 'SUPPORT']);
        expect(user.removableRoles.map((r) => r.type)).toEqual(['TEACHER']);
        expect(user.availablePermissions).toHaveLength(2);
    });

    it('should let support staff handle only the student and teacher roles', () => {
        const c = create([person(2, ['TEACHER', 'ADMIN'])], false);
        const user = c.users()[0];
        expect(user.availableRoles.map((r) => r.type)).toEqual(['STUDENT']);
        expect(user.removableRoles.map((r) => r.type)).toEqual(['TEACHER']);
    });

    it('should update a user and their options when a role or permission changes', () => {
        const c = create([person(2, ['TEACHER'])]);
        const current = () => c.users()[0];

        c.addRole(current(), role(c, 'STUDENT'));
        expect(management.addRole).toHaveBeenCalledWith(2, 'STUDENT');
        expect(current().roles.map((r) => r.name)).toEqual(['TEACHER', 'STUDENT']);
        expect(current().removableRoles.map((r) => r.type)).toEqual(['TEACHER', 'STUDENT']);

        c.removeRole(current(), role(c, 'TEACHER'));
        expect(current().roles.map((r) => r.name)).toEqual(['STUDENT']);
        expect(current().availableRoles.map((r) => r.type)).toContain('TEACHER');

        c.addPermission(current(), permission(c, 'CAN_CREATE_BYOD_EXAM'));
        expect(current().permissions.map((p) => p.type)).toEqual(['CAN_CREATE_BYOD_EXAM']);
        expect(current().removablePermissions.map((p) => p.type)).toEqual(['CAN_CREATE_BYOD_EXAM']);

        c.removePermission(current(), permission(c, 'CAN_CREATE_BYOD_EXAM'));
        expect(current().permissions).toEqual([]);
        expect(current().availablePermissions).toHaveLength(2);
    });

    it('should show the icons of the roles a user has', () => {
        const c = create([]);
        expect(c.getRoleIcons(person(2, ['TEACHER', 'ADMIN']))).toEqual(['bi-person-workspace', 'bi-shield-lock']);
    });

    it('should tell why the search failed', () => {
        me = { id: 1, isAdmin: true };
        management.getUsers.mockReturnValue(throwError(() => 'i18n_error'));
        const c = TestBed.runInInjectionContext(() => new UsersComponent());
        c.search();
        expect(toast.error).toHaveBeenCalledWith('i18n_error');
        expect(c.loader().loading).toBe(false);
    });
});

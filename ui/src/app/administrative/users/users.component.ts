// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
    NgbDropdown,
    NgbDropdownItem,
    NgbDropdownMenu,
    NgbDropdownToggle,
    NgbPopover,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { PermissionType, type Permission, type User } from 'src/app/session/session.model';
import { SessionService } from 'src/app/session/session.service';
import { PageContentComponent } from 'src/app/shared/components/page-content.component';
import { PageHeaderComponent } from 'src/app/shared/components/page-header.component';
import { PaginatorComponent } from 'src/app/shared/paginator/paginator.component';
import { UserManagementService } from './users.service';

interface PermissionOption extends Permission {
    name?: string;
    icon?: string;
    filtered?: boolean;
}

interface RoleOption {
    type: string;
    name: string;
    icon: string;
    filtered?: boolean;
}

interface UserWithOptions extends User {
    availableRoles: RoleOption[];
    removableRoles: RoleOption[];
    availablePermissions: PermissionOption[];
    removablePermissions: PermissionOption[];
}

@Component({
    templateUrl: './users.component.html',
    selector: 'xm-users',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        NgbPopover,
        NgbDropdown,
        NgbDropdownToggle,
        NgbDropdownMenu,
        NgbDropdownItem,
        NgClass,
        PaginatorComponent,
        SlicePipe,
        DatePipe,
        TranslateModule,
        PageHeaderComponent,
        PageContentComponent,
    ],
    styles: [
        `
            .flex-wrap-gap {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
        `,
    ],
})
export class UsersComponent implements OnDestroy {
    users = signal<UserWithOptions[]>([]);
    pageSize = 30;
    currentPage = signal(0);
    textChanged = new Subject<string>();
    ngUnsubscribe = new Subject<void>();
    roles = signal<RoleOption[]>([
        { type: 'ADMIN', name: 'i18n_admin', icon: 'bi-shield-lock' },
        { type: 'TEACHER', name: 'i18n_teacher', icon: 'bi-person-workspace' },
        { type: 'STUDENT', name: 'i18n_student', icon: 'bi-mortarboard' },
        { type: 'SUPPORT', name: 'i18n_support_person', icon: 'bi-person-heart' },
    ]);
    permissions = signal<PermissionOption[]>([]);
    loader = signal({ loading: false });
    appUser: User;

    filteredUsers = computed(() => {
        const currentUsers = this.users();
        const currentRoles = this.roles();
        const currentPermissions = this.permissions();
        return currentUsers.filter((user) => this.isUnfiltered(user, currentRoles, currentPermissions));
    });

    private _filterText = signal('');
    private translate = inject(TranslateService);
    private toast = inject(ToastrService);
    private session = inject(SessionService);
    private userManagement = inject(UserManagementService);

    constructor() {
        this.appUser = this.session.getUser();
        this.textChanged
            .pipe(debounceTime(1000), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe((text) => {
                this._filterText.set(text);
                this.search();
            });

        this.userManagement
            .getPermissions()
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe((permissions) => {
                const mappedPermissions = permissions.map((p) => {
                    if (p.type === PermissionType.CAN_INSPECT_LANGUAGE) {
                        return {
                            ...p,
                            name: 'i18n_can_inspect_language',
                            icon: 'bi-alphabet',
                        };
                    }
                    if (p.type === PermissionType.CAN_CREATE_BYOD_EXAM) {
                        return {
                            ...p,
                            name: 'i18n_can_create_byod_exam',
                            icon: 'bi-house-gear',
                        };
                    }

                    return p;
                });
                this.permissions.set(mappedPermissions);
            });

        this.loader.set({ loading: false });
    }

    get filterText(): string {
        return this._filterText();
    }

    set filterText(value: string) {
        this._filterText.set(value);
        this.textChanged.next(value);
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    getRoleIcons(user: User): string[] {
        const currentRoles = this.roles();
        return user.roles
            .map((ur) => currentRoles.find((r) => ur.name === r.type)?.icon)
            .filter((icon): icon is string => icon !== undefined);
    }

    pageSelected(event: { page: number }) {
        this.currentPage.set(event.page);
    }

    search() {
        this.loader.set({ loading: true });
        this.initSearch();
    }

    hasRole(user: User, role: string): boolean {
        return user.roles.some((r) => r.name === role);
    }

    hasPermission(user: User, permission: string): boolean {
        return user.permissions.some((p) => p.type === permission);
    }

    applyRoleFilter(role: RoleOption) {
        const currentRoles = this.roles();
        const updatedRoles = currentRoles.map((r: RoleOption) => {
            if (r.type === role.type) {
                return { ...r, filtered: !r.filtered };
            }
            return { ...r, filtered: false };
        });
        this.roles.set(updatedRoles);
    }

    applyPermissionFilter(permission: PermissionOption) {
        const currentPermissions = this.permissions();
        const updatedPermissions = currentPermissions.map((p) => {
            if (p.type === permission.type) {
                return { ...p, filtered: !p.filtered };
            }
            return { ...p, filtered: false };
        });
        this.permissions.set(updatedPermissions);
    }

    isUnfiltered(user: User, roles: RoleOption[], permissions: PermissionOption[]): boolean {
        // Do not show logged in user in results
        if (user.id === this.session.getUser().id) {
            return false;
        }
        let result = true;
        roles
            .filter((role) => role.filtered)
            .forEach((role) => {
                if (!this.hasRole(user, role.type)) {
                    result = false;
                }
            });
        if (!result) {
            return result;
        }
        permissions
            .filter((permission) => permission.filtered)
            .forEach((permission) => {
                if (!this.hasPermission(user, permission.type)) {
                    result = false;
                }
            });
        return result;
    }

    addRole(user: UserWithOptions, role: RoleOption) {
        this.userManagement
            .addRole(user.id, role.type)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(() => {
                const updatedUsers = this.users().map((u) => {
                    if (u.id === user.id) {
                        const updatedUser = { ...u, roles: [...u.roles, { name: role.type }] };
                        this.updateEditOptions(updatedUser);
                        return updatedUser;
                    }
                    return u;
                });
                this.users.set(updatedUsers);
            });
    }

    addPermission(user: UserWithOptions, permission: Permission) {
        this.userManagement
            .addPermission(user.id, permission.type)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(() => {
                const updatedUsers = this.users().map((u) => {
                    if (u.id === user.id) {
                        const updatedUser = { ...u, permissions: [...u.permissions, { type: permission.type }] };
                        this.updateEditOptions(updatedUser);
                        return updatedUser;
                    }
                    return u;
                });
                this.users.set(updatedUsers);
            });
    }

    removeRole(user: UserWithOptions, role: RoleOption) {
        this.userManagement.removeRole(user.id, role.type).subscribe(() => {
            const updatedUsers = this.users().map((u) => {
                if (u.id === user.id) {
                    const updatedUser = {
                        ...u,
                        roles: u.roles.filter((r) => r.name !== role.type),
                    };
                    this.updateEditOptions(updatedUser);
                    return updatedUser;
                }
                return u;
            });
            this.users.set(updatedUsers);
        });
    }

    removePermission(user: UserWithOptions, permission: PermissionOption) {
        this.userManagement
            .removePermission(user.id, permission.type)
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe(() => {
                const updatedUsers = this.users().map((u) => {
                    if (u.id === user.id) {
                        const updatedUser = {
                            ...u,
                            permissions: u.permissions.filter((p) => p.type !== permission.type),
                        };
                        this.updateEditOptions(updatedUser);
                        return updatedUser;
                    }
                    return u;
                });
                this.users.set(updatedUsers);
            });
    }

    updateEditOptions(user: UserWithOptions) {
        const currentRoles = this.roles();
        user.availableRoles = [];
        user.removableRoles = [];
        currentRoles.forEach((role) => {
            if (user.roles.map((r) => r.name).indexOf(role.type) === -1) {
                if (role.type === 'STUDENT' || role.type === 'TEACHER' || this.appUser.isAdmin) {
                    user.availableRoles.push({ ...role });
                }
            } else {
                if (role.type === 'STUDENT' || role.type === 'TEACHER' || this.appUser.isAdmin) {
                    user.removableRoles.push({ ...role });
                }
            }
        });
        const currentPermissions = this.permissions();
        user.availablePermissions = [];
        user.removablePermissions = [];
        currentPermissions.forEach((permission) => {
            if (user.permissions.map((p) => p.type).indexOf(permission.type) === -1) {
                user.availablePermissions.push({ ...permission });
            } else {
                user.removablePermissions.push({ ...permission });
            }
        });
    }

    initSearch() {
        this.userManagement
            .getUsers(this._filterText())
            .pipe(takeUntil(this.ngUnsubscribe))
            .subscribe({
                next: (users) => {
                    const usersWithOptions = users as UserWithOptions[];
                    usersWithOptions.forEach((user: UserWithOptions) => {
                        this.updateEditOptions(user);
                    });
                    this.users.set(usersWithOptions);
                    this.loader.set({ loading: false });
                },
                error: (err) => {
                    this.loader.set({ loading: false });
                    this.toast.error(this.translate.instant(err));
                },
            });
    }
}

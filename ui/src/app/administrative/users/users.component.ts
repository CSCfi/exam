// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { DatePipe, NgClass, SlicePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { Component, OnDestroy } from '@angular/core';
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
    standalone: true,
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
export class UsersComponent implements OnInit, OnDestroy {
    users: UserWithOptions[] = [];
    filteredUsers: UserWithOptions[] = [];
    pageSize = 30;
    currentPage = 0;
    filter = { text: '' };
    textChanged = new Subject<string>();
    ngUnsubscribe = new Subject();
    roles: RoleOption[] = [
        { type: 'ADMIN', name: 'i18n_admin', icon: 'bi-shield-lock' },
        { type: 'TEACHER', name: 'i18n_teacher', icon: 'bi-person-workspace' },
        { type: 'STUDENT', name: 'i18n_student', icon: 'bi-mortarboard' },
        { type: 'SUPPORT', name: 'i18n_support_person', icon: 'bi-person-heart' },
    ];
    permissions: PermissionOption[] = [];
    loader = { loading: false };
    appUser: User;

    constructor(
        private translate: TranslateService,
        private toast: ToastrService,
        private session: SessionService,
        private userManagement: UserManagementService,
    ) {
        this.appUser = this.session.getUser();
        this.textChanged
            .pipe(debounceTime(1000), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe((text) => {
                this.filter.text = text;
                this.search();
            });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next(undefined);
        this.ngUnsubscribe.complete();
    }

    ngOnInit() {
        this.userManagement.getPermissions().subscribe((permissions) => {
            this.permissions = permissions.map((p) => {
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
        });

        this.loader = { loading: false };
    }

    pageSelected = (event: { page: number }) => (this.currentPage = event.page);

    search = () => {
        this.loader.loading = true;
        this.initSearch();
    };

    hasRole = (user: User, role: string) => user.roles.some((r) => r.name === role);

    hasPermission = (user: User, permission: string) => user.permissions.some((p) => p.type === permission);

    applyRoleFilter = (role: RoleOption) => {
        this.roles = this.roles.map((r: RoleOption) => {
            if (r.type === role.type) {
                return { ...r, filtered: !r.filtered };
            }
            return { ...r, filtered: false };
        });
        this.filterUsers();
    };

    applyPermissionFilter = (permission: PermissionOption) => {
        this.permissions = this.permissions.map((p) => {
            if (p.type === permission.type) {
                return { ...p, filtered: !p.filtered };
            }
            return { ...p, filtered: false };
        });
        this.filterUsers();
    };

    isUnfiltered = (user: User) => {
        // Do not show logged in user in results
        if (user.id === this.session.getUser().id) {
            return false;
        }
        let result = true;
        this.roles
            .filter((role) => {
                return role.filtered;
            })
            .forEach((role) => {
                if (!this.hasRole(user, role.type)) {
                    result = false;
                }
            });
        if (!result) {
            return result;
        }
        this.permissions
            .filter((permission) => {
                return permission.filtered;
            })
            .forEach((permission) => {
                if (!this.hasPermission(user, permission.type)) {
                    result = false;
                }
            });
        return result;
    };

    addRole = (user: UserWithOptions, role: RoleOption) => {
        this.userManagement.addRole(user.id, role.type).subscribe(() => {
            user.roles.push({ name: role.type });
            this.updateEditOptions(user);
        });
    };

    addPermission = (user: UserWithOptions, permission: Permission) => {
        this.userManagement.addPermission(user.id, permission.type).subscribe(() => {
            user.permissions.push({ type: permission.type });
            this.updateEditOptions(user);
        });
    };

    removeRole = (user: UserWithOptions, role: RoleOption) => {
        this.userManagement.removeRole(user.id, role.type).subscribe(() => {
            const i = user.roles
                .map(function (r) {
                    return r.name;
                })
                .indexOf(role.type);
            user.roles.splice(i, 1);
            this.updateEditOptions(user);
            this.filterUsers();
        });
    };

    removePermission = (user: UserWithOptions, permission: PermissionOption) => {
        this.userManagement.removePermission(user.id, permission.type).subscribe(() => {
            const i = user.permissions
                .map(function (p) {
                    return p.type;
                })
                .indexOf(permission.type);
            user.permissions.splice(i, 1);
            this.updateEditOptions(user);
            this.filterUsers();
        });
    };

    filterUsers = () => (this.filteredUsers = this.users.filter(this.isUnfiltered));

    updateEditOptions = (user: UserWithOptions) => {
        user.availableRoles = [];
        user.removableRoles = [];
        this.roles.forEach((role) => {
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
        user.availablePermissions = [];
        user.removablePermissions = [];
        this.permissions.forEach((permission) => {
            if (user.permissions.map((p) => p.type).indexOf(permission.type) === -1) {
                user.availablePermissions.push({ ...permission });
            } else {
                user.removablePermissions.push({ ...permission });
            }
        });
    };

    initSearch = () => {
        this.userManagement.getUsers(this.filter.text).subscribe({
            next: (users) => {
                this.users = users as UserWithOptions[];
                this.users.forEach((user: UserWithOptions) => {
                    this.updateEditOptions(user);
                });
                this.filterUsers();
                this.loader.loading = false;
            },
            error: (err) => {
                this.loader.loading = false;
                this.toast.error(this.translate.instant(err));
            },
        });
    };
}

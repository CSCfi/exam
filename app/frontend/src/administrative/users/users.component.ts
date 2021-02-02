import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep } from 'lodash';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import * as toast from 'toastr';

import { SessionService } from '../../session/session.service';
import { PermissionType, UserManagementService } from './users.service';

import type { OnInit } from '@angular/core';
import type { User } from '../../session/session.service';
import type { Permission } from './users.service';

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
    selector: 'users',
})
export class UsersComponent implements OnInit {
    users: User[] = [];
    filteredUsers: User[] = [];
    pageSize = 30;
    currentPage = 0;
    filter = { text: '' };
    textChanged = new Subject<string>();
    ngUnsubscribe = new Subject();
    roles: RoleOption[] = [
        { type: 'ADMIN', name: 'sitnet_admin', icon: 'bi-gear' },
        { type: 'TEACHER', name: 'sitnet_teacher', icon: 'bi-person-fill' },
        { type: 'STUDENT', name: 'sitnet_student', icon: 'bi-person' },
    ];
    permissions: PermissionOption[];
    loader = { loading: false };

    constructor(
        private translate: TranslateService,
        private session: SessionService,
        private userManagement: UserManagementService,
    ) {
        this.textChanged
            .pipe(debounceTime(1000), distinctUntilChanged(), takeUntil(this.ngUnsubscribe))
            .subscribe((text) => {
                this.filter.text = text;
                this.search();
            });
    }

    ngOnDestroy() {
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();
    }

    ngOnInit() {
        this.userManagement.getPermissions().subscribe((permissions) => {
            this.permissions = permissions.map((p) => {
                if (p.type === PermissionType.CAN_INSPECT_LANGUAGE) {
                    return {
                        ...p,
                        name: 'sitnet_can_inspect_language',
                        icon: 'bi-pencil',
                    };
                }

                return p;
            });
        });

        this.loader = { loading: false };
    }

    pageSelected = (page: number) => (this.currentPage = page);

    search = () => {
        this.loader.loading = true;
        this.initSearch();
    };

    hasRole = (user: User, role: string) => user.roles.some((r) => r.name === role);

    hasPermission = (user: User, permission: string) => user.permissions.some((p) => p.type === permission);

    applyRoleFilter = function (role: RoleOption) {
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
                user.availableRoles.push(cloneDeep(role));
            } else {
                user.removableRoles.push(cloneDeep(role));
            }
        });
        user.availablePermissions = [];
        user.removablePermissions = [];
        this.permissions.forEach((permission) => {
            if (user.permissions.map((p) => p.type).indexOf(permission.type) === -1) {
                user.availablePermissions.push(cloneDeep(permission));
            } else {
                user.removablePermissions.push(cloneDeep(permission));
            }
        });
    };

    initSearch = () => {
        this.userManagement.getUsers(this.filter.text).subscribe(
            (users) => {
                this.users = users;
                this.users.forEach((user: UserWithOptions) => {
                    this.updateEditOptions(user);
                });
                this.filterUsers();
                this.loader.loading = false;
            },
            (err) => {
                this.loader.loading = false;
                toast.error(this.translate.instant(err.data));
            },
        );
    };
}

/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import angular from 'angular';
import toast from 'toastr';

angular.module('app.administrative.users')
    .component('users', {
        template: require('./users.template.html'),
        controller: ['$translate', 'UserManagement', 'Session',
            function ($translate, UserManagement, Session) {

                const vm = this;

                vm.$onInit = function () {
                    vm.filter = {};
                    vm.roles = [
                        { type: 'ADMIN', name: 'sitnet_admin', icon: 'fa-cog' },
                        { type: 'TEACHER', name: 'sitnet_teacher', icon: 'fa-university' },
                        { type: 'STUDENT', name: 'sitnet_student', icon: 'fa-graduation-cap' }
                    ];

                    UserManagement.permissions.query(function (permissions) {
                        permissions.forEach(function (p) {
                            if (p.type === 'CAN_INSPECT_LANGUAGE') {
                                p.name = 'sitnet_can_inspect_language';
                                p.icon = 'fa-pencil';
                            }
                        });
                        vm.permissions = permissions;
                    });


                    vm.loader = {
                        loading: false
                    };

                };

                vm.search = function () {
                    vm.loader.loading = true;
                    search();
                };

                vm.hasRole = function (user, role) {
                    return user.roles.some(function (r) {
                        return r.name === role;
                    });
                };

                vm.hasPermission = function (user, permission) {
                    return user.permissions.some(function (p) {
                        return p.type === permission;
                    });
                };

                vm.applyRoleFilter = function (role) {
                    vm.roles.forEach(function (r) {
                        r.filtered = r.type === role.type ? !r.filtered : false;
                    });
                };

                vm.applyPermissionFilter = function (permission) {
                    vm.permissions.forEach(function (p) {
                        p.filtered = p.type === permission.type ? !p.filtered : false;
                    });
                };

                vm.isUnfiltered = function (user) {
                    // Do not show logged in user in results
                    if (user.id === Session.getUser().id) {
                        return false;
                    }
                    let result = true;
                    vm.roles.filter(
                        function (role) {
                            return role.filtered;
                        }).forEach(function (role) {
                            if (!vm.hasRole(user, role.type)) {
                                result = false;
                            }
                        });
                    if (!result) {
                        return result;
                    }
                    vm.permissions.filter(
                        function (permission) {
                            return permission.filtered;
                        }).forEach(function (permission) {
                            if (!vm.hasPermission(user, permission.type)) {
                                result = false;
                            }
                        });
                    return result;
                };

                vm.addRole = function (user, role) {
                    UserManagement.roles.add({ id: user.id, role: role.type }, function () {
                        user.roles.push({ name: role.type });
                        updateEditOptions(user);
                    });
                };

                vm.addPermission = function (user, permission) {
                    UserManagement.permissions.add({ id: user.id, permission: permission.type }, function () {
                        user.permissions.push({ type: permission.type });
                        updateEditOptions(user);
                    });
                };

                vm.removeRole = function (user, role) {
                    UserManagement.roles.remove({ id: user.id, role: role.type }, function () {
                        const i = user.roles.map(function (r) {
                            return r.name;
                        }).indexOf(role.type);
                        user.roles.splice(i, 1);
                        updateEditOptions(user);
                    });
                };

                vm.removePermission = function (user, permission) {
                    UserManagement.permissions.remove({ id: user.id, permission: permission.type }, function () {
                        const i = user.permissions.map(function (p) {
                            return p.type;
                        }).indexOf(permission.type);
                        user.permissions.splice(i, 1);
                        updateEditOptions(user);
                    });
                };

                const updateEditOptions = function (user) {
                    user.availableRoles = [];
                    user.removableRoles = [];
                    vm.roles.forEach(function (role) {
                        if (user.roles.map(function (r) {
                            return r.name;
                        }).indexOf(role.type) === -1) {
                            user.availableRoles.push(angular.copy(role));
                        } else {
                            user.removableRoles.push(angular.copy(role));
                        }
                    });
                    user.availablePermissions = [];
                    user.removablePermissions = [];
                    vm.permissions.forEach(function (permission) {
                        if (user.permissions.map(function (p) {
                            return p.type;
                        }).indexOf(permission.type) === -1) {
                            user.availablePermissions.push(angular.copy(permission));
                        } else {
                            user.removablePermissions.push(angular.copy(permission));
                        }
                    });
                };

                const search = function () {
                    UserManagement.users.query({ filter: vm.filter.text }, function (users) {
                        vm.users = users;
                        vm.users.forEach(function (user) {
                            updateEditOptions(user);
                        });
                        vm.loader.loading = false;
                    }, function (err) {
                        vm.loader.loading = false;
                        toast.error($translate.instant(err.data));
                    });
                };

            }
        ]
    });


/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

angular.module('app.administrative.users')
    .component('users', {
        templateUrl: '/assets/app/administrative/users/users.template.html',
        controller: ['$timeout', '$translate', 'UserManagement', 'EXAM_CONF', 'Session', 'toast',
            function ($timeout, $translate, UserManagement, EXAM_CONF, Session, toast) {

                var updateEditOptions = function (user) {
                    user.availableRoles = [];
                    user.removableRoles = [];
                    ctrl.roles.forEach(function (role) {
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
                    ctrl.permissions.forEach(function (permission) {
                        if (user.permissions.map(function (p) {
                                return p.type;
                            }).indexOf(permission.type) === -1) {
                            user.availablePermissions.push(angular.copy(permission));
                        } else {
                            user.removablePermissions.push(angular.copy(permission));
                        }
                    });
                };

                var search = function () {
                    UserManagement.users.query({filter: ctrl.filter.text}, function (users) {
                        ctrl.users = users;
                        ctrl.users.forEach(function (user) {
                            updateEditOptions(user);
                        });
                        ctrl.loader.loading = false;
                    }, function (err) {
                        ctrl.loader.loading = false;
                        toast.error($translate.instant(err.data));
                    });
                };

                var ctrl = this;

                ctrl.$onInit = function () {
                    ctrl.filter = {};
                    ctrl.roles = [
                        {type: 'ADMIN', name: 'sitnet_admin', icon: 'fa-cog'},
                        {type: 'TEACHER', name: 'sitnet_teacher', icon: 'fa-university'},
                        {type: 'STUDENT', name: 'sitnet_student', icon: 'fa-graduation-cap'}
                    ];

                    UserManagement.permissions.query(function (permissions) {
                        permissions.forEach(function (p) {
                            if (p.type === 'CAN_INSPECT_LANGUAGE') {
                                p.name = 'sitnet_can_inspect_language';
                                p.icon = 'fa-pencil';
                            }
                        });
                        ctrl.permissions = permissions;
                    });


                    ctrl.loader = {
                        loading: false
                    };

                };

                ctrl.search = function () {
                    ctrl.loader.loading = true;
                    search();
                };

                ctrl.hasRole = function (user, role) {
                    return user.roles.some(function (r) {
                        return r.name === role;
                    });
                };

                ctrl.hasPermission = function (user, permission) {
                    return user.permissions.some(function (p) {
                        return p.type === permission;
                    });
                };

                ctrl.applyRoleFilter = function (role) {
                    ctrl.roles.forEach(function (r) {
                        r.filtered = r.type === role.type ? !r.filtered : false;
                    });
                };

                ctrl.applyPermissionFilter = function (permission) {
                    ctrl.permissions.forEach(function (p) {
                        p.filtered = p.type === permission.type ? !p.filtered : false;
                    });
                };

                ctrl.isUnfiltered = function (user) {
                    // Do not show logged in user in results
                    if (user.id === Session.getUser().id) {
                        return false;
                    }
                    var result = true;
                    ctrl.roles.filter(
                        function (role) {
                            return role.filtered;
                        }).forEach(function (role) {
                        if (!ctrl.hasRole(user, role.type)) {
                            result = false;
                        }
                    });
                    if (!result) {
                        return result;
                    }
                    ctrl.permissions.filter(
                        function (permission) {
                            return permission.filtered;
                        }).forEach(function (permission) {
                        if (!ctrl.hasPermission(user, permission.type)) {
                            result = false;
                        }
                    });
                    return result;
                };

                ctrl.addRole = function (user, role) {
                    UserManagement.roles.add({id: user.id, role: role.type}, function () {
                        user.roles.push({name: role.type});
                        updateEditOptions(user);
                    });
                };

                ctrl.addPermission = function (user, permission) {
                    UserManagement.permissions.add({id: user.id, permission: permission.type}, function () {
                        user.permissions.push({type: permission.type});
                        updateEditOptions(user);
                    });
                };

                ctrl.removeRole = function (user, role) {
                    UserManagement.roles.remove({id: user.id, role: role.type}, function () {
                        var i = user.roles.map(function (r) {
                            return r.name;
                        }).indexOf(role.type);
                        user.roles.splice(i, 1);
                        updateEditOptions(user);
                    });
                };

                ctrl.removePermission = function (user, permission) {
                    UserManagement.permissions.remove({id: user.id, permission: permission.type}, function () {
                        var i = user.permissions.map(function (p) {
                            return p.type;
                        }).indexOf(permission.type);
                        user.permissions.splice(i, 1);
                        updateEditOptions(user);
                    });
                };
            }
        ]
    });


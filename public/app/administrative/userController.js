(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('UserCtrl', ['$scope', '$timeout', '$translate', 'UserRes', 'EXAM_CONF', 'sessionService',
            function ($scope, $timeout, $translate, UserRes, EXAM_CONF, sessionService) {

                $scope.filter = {};
                $scope.roles = [
                    {type: 'ADMIN', name: 'sitnet_admin', icon: 'fa-cog'},
                    {type: 'TEACHER', name: 'sitnet_teacher', icon: 'fa-university'},
                    {type: 'STUDENT', name: 'sitnet_student', icon: 'fa-graduation-cap'}
                ];

                UserRes.permissions.query(function (permissions) {
                    permissions.forEach(function (p) {
                        if (p.type === 'CAN_INSPECT_LANGUAGE') {
                            p.name = 'sitnet_can_inspect_language';
                            p.icon = 'fa-pencil';
                        }
                    });
                    $scope.permissions = permissions;
                });


                $scope.loader = {
                    loading: false
                };

                var updateEditOptions = function (user) {
                    user.availableRoles = [];
                    user.removableRoles = [];
                    $scope.roles.forEach(function (role) {
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
                    $scope.permissions.forEach(function (permission) {
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
                    UserRes.users.query({filter: $scope.filter.text}, function (users) {
                        $scope.users = users;
                        $scope.users.forEach(function (user) {
                            updateEditOptions(user);
                        });
                        $scope.loader.loading = false;
                    }, function (err) {
                        $scope.loader.loading = false;
                        toastr.error($translate.instant(err.data));
                    });
                };

                $scope.search = function () {
                    $scope.loader.loading = true;
                    search();
                };

                $scope.hasRole = function (user, role) {
                    return user.roles.some(function (r) {
                        return r.name === role;
                    });
                };

                $scope.hasPermission = function (user, permission) {
                    return user.permissions.some(function (p) {
                        return p.type === permission;
                    });
                };

                $scope.applyRoleFilter = function (role) {
                    $scope.roles.forEach(function (r) {
                        r.filtered = r.type === role.type ? !r.filtered : false;
                    });
                };

                $scope.applyPermissionFilter = function (permission) {
                    $scope.permissions.forEach(function (p) {
                        p.filtered = p.type === permission.type ? !p.filtered : false;
                    });
                };

                $scope.isUnfiltered = function (user) {
                    // Do not show logged in user in results
                    if (user.id === sessionService.getUser().id) {
                        return false;
                    }
                    var result = true;
                    $scope.roles.filter(
                        function (role) {
                            return role.filtered;
                        }).forEach(function (role) {
                        if (!$scope.hasRole(user, role.type)) {
                            result = false;
                        }
                    });
                    if (!result) {
                        return result;
                    }
                    $scope.permissions.filter(
                        function (permission) {
                            return permission.filtered;
                        }).forEach(function (permission) {
                        if (!$scope.hasPermission(user, permission.type)) {
                            result = false;
                        }
                    });
                    return result;
                };

                $scope.addRole = function (user, role) {
                    UserRes.userRoles.add({id: user.id, role: role.type}, function () {
                        user.roles.push({name: role.type});
                        updateEditOptions(user);
                    })
                };

                $scope.addPermission = function (user, permission) {
                    UserRes.permissions.add({id: user.id, permission: permission.type}, function () {
                        user.permissions.push({type: permission.type});
                        updateEditOptions(user);
                    })
                };

                $scope.removeRole = function (user, role) {
                    UserRes.userRoles.remove({id: user.id, role: role.type}, function () {
                        var i = user.roles.map(function (r) {
                            return r.name
                        }).indexOf(role.type);
                        user.roles.splice(i, 1);
                        updateEditOptions(user);
                    })
                };

                $scope.removePermission = function (user, permission) {
                    UserRes.permissions.remove({id: user.id, permission: permission.type}, function () {
                        var i = user.permissions.map(function (p) {
                            return p.type;
                        }).indexOf(permission.type);
                        user.permissions.splice(i, 1);
                        updateEditOptions(user);
                    })
                };
            }
        ]);
})();

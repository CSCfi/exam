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

                $scope.loader = {
                    loading: false
                };

                var searching;

                var updateEditOptions = function(user) {
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
                };

                var doSearch = function () {
                    UserRes.users.query({filter: $scope.filter.text}, function (users) {
                        $scope.users = users;
                        $scope.users.forEach(function (user) {
                            updateEditOptions(user);
                        });
                        searching = false;
                        $scope.loader.loading = false;
                    }, function (err) {
                        $scope.loader.loading = false;
                        toastr.error($translate.instant(err.data));
                    });
                };

                $scope.search = function () {
                    // add a bit of delay so we don't hit the server that often
                    if (!searching) {
                        $scope.loader.loading = true;
                        $timeout(doSearch, 200);
                        searching = true;
                    }
                };

                $scope.hasRole = function (user, role) {
                    return sessionService.hasRole(user, role);
                };

                $scope.applyFilter = function (role) {
                    $scope.roles.forEach(function (r) {
                        r.filtered = r.type === role.type ? !r.filtered : false;
                    });
                };

                $scope.isUnfiltered = function (user) {
                    var result = true;
                    $scope.roles.filter(
                        function (role) {
                            return role.filtered;
                        }).forEach(function (role) {
                            if (!sessionService.hasRole(user, role.type)) {
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

                $scope.removeRole = function (user, role) {
                    UserRes.userRoles.remove({id: user.id, role: role.type}, function () {
                        var i = user.roles.map(function(r) {
                            return r.name
                        }).indexOf(role.type);
                        user.roles.splice(i, 1);
                        updateEditOptions(user);
                    })
                };

                $scope.search();
            }
        ]);
})();
(function () {
    'use strict';
    angular.module('exam.services')
        .factory('sessionService', ['$q', '$sessionStorage', '$translate', '$injector', '$location', '$rootScope',
            'tmhDynamicLocale', 'EXAM_CONF',
            function ($q, $sessionStorage, $translate, $injector, $location, $rootScope, tmhDynamicLocale, EXAM_CONF) {

                var _user;

                var getUser = function () {
                    return _user;
                };

                var getUserName = function () {
                    if (_user) {
                        return _user.firstname + " " + _user.lastname;
                    }
                };

                var setUser = function (user) {
                    _user = user;
                };

                // Services need to be accessed like this because of circular dependency issues
                var $http;
                var http = function () {
                    return $http = $http || $injector.get('$http');
                };
                var $modal;
                var modal = function () {
                    return $modal = $modal || $injector.get('$modal');
                };
                var $route;
                var route = function () {
                    return $route = $route || $injector.get('$route');
                };
                var UserRes;
                var userRes = function () {
                    return UserRes = UserRes || $injector.get('UserRes');
                };

                var hasRole = function (user, role) {
                    if (!user || !user.loginRole) {
                        return false;
                    }
                    return user.loginRole.name === role;
                };

                var logout = function () {
                    var deferred = $q.defer();
                    http().post('/logout').success(function (data) {
                        delete $sessionStorage[EXAM_CONF.AUTH_STORAGE_KEY];
                        delete http().defaults.headers.common;
                        _user = undefined;
                        deferred.resolve(data);
                    }).error(function (error) {
                        toastr(error.data);
                        deferred.reject();
                    });
                    return deferred.promise;
                };

                var translate = function (lang) {
                    $translate.use(lang);
                    tmhDynamicLocale.set(lang);
                };

                var openEulaModal = function (user) {
                    modal().open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/show_eula.html',
                        backdrop: 'static',
                        keyboard: false,
                        controller: function ($scope, $modalInstance) {
                            $scope.ok = function () {
                                // OK button
                                userRes().updateAgreementAccepted.update({id: user.id}, function () {
                                    user.userAgreementAccepted = true;
                                    setUser(user);
                                }, function (error) {
                                    toastr.error(error.data);
                                });
                                $modalInstance.dismiss();
                                if ($location.url() === '/login' || $location.url() === '/logout') {
                                    $location.path("/");
                                }
                                if ($location.url() === '/login' || $location.url() === '/logout') {
                                    $location.path("/");
                                } else {
                                    route().reload();
                                }
                            };
                            $scope.cancel = function () {
                                $modalInstance.dismiss('cancel');
                                $location.path("/logout");
                            };
                        }
                    });
                };

                var openRoleSelectModal = function (user) {
                    var ctrl = ["$scope", "$modalInstance", function ($scope, $modalInstance) {
                        $scope.user = user;
                        $scope.ok = function (role) {
                            userRes().userRoles.update({id: user.id, role: role.name}, function () {
                                user.loginRole = role;
                                user.isAdmin = hasRole(user, 'ADMIN');
                                user.isTeacher = hasRole(user, 'TEACHER');
                                user.isStudent = hasRole(user, 'STUDENT');
                                setUser(user);
                                $modalInstance.dismiss();
                                $rootScope.$broadcast('userUpdated');
                                if (user.isStudent && !user.userAgreementAccepted) {
                                    openEulaModal(user);
                                } else if ($location.url() === '/login' || $location.url() === '/logout') {
                                    $location.path("/");
                                } else {
                                    route().reload();
                                }
                            }, function (error) {
                                toastr.error(error.data);
                                $location.path("/logout");
                            });

                        };
                        $scope.cancel = function () {
                            $modalInstance.dismiss('cancel');
                            $location.path("/logout");
                        };
                    }];
                    var m = modal().open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'common/select_role.html',
                        backdrop: 'static',
                        keyboard: false,
                        controller: ctrl,
                        resolve: {
                            user: function () {
                                return user;
                            }
                        }
                    });

                    m.result.then(function () {
                        console.log("closed");
                    });
                };

                var login = function (username, password) {
                    var deferred = $q.defer();
                    var credentials = {
                        username: username,
                        password: password
                    };
                    http().post('/login', credentials, {ignoreAuthModule: true}).success(
                        function (user) {
                            var header = {};
                            header[EXAM_CONF.AUTH_HEADER] = user.token;
                            http().defaults.headers.common = header;
                            user.roles.forEach(function (role) {
                                switch (role.name) {
                                    case 'ADMIN':
                                        role.displayName = 'sitnet_admin';
                                        role.icon = 'fa-cog';
                                        break;
                                    case 'TEACHER':
                                        role.displayName = 'sitnet_teacher';
                                        role.icon = 'fa-university';
                                        break;
                                    case 'STUDENT':
                                        role.displayName = 'sitnet_student';
                                        role.icon = 'fa-graduation-cap';
                                        break;
                                }
                            });

                            _user = {
                                id: user.id,
                                firstname: user.firstname,
                                lastname: user.lastname,
                                lang: user.lang,
                                loginRole: user.roles.length == 1 ? user.roles[0] : undefined,
                                roles: user.roles,
                                isLoggedOut: false,
                                token: user.token,
                                userAgreementAccepted: user.userAgreementAccepted,
                                userNo: user.userIdentifier
                            };
                            _user.isAdmin = hasRole(_user, 'ADMIN');
                            _user.isStudent = hasRole(_user, 'STUDENT');
                            _user.isTeacher = hasRole(_user, 'TEACHER');

                            $sessionStorage[EXAM_CONF.AUTH_STORAGE_KEY] = _user;
                            translate(_user.lang);
                            deferred.resolve();
                        }).error(function (error) {
                            deferred.reject(error);
                        });
                    return deferred.promise;
                };

                var switchLanguage = function (lang) {
                    if (!_user) {
                        translate(lang);
                    } else {
                        http().put('/user/lang', {lang: lang}).success(function () {
                            _user.lang = lang;
                            translate(lang);
                        }).error(function () {
                            toastr.error('failed to switch language');
                        })
                    }
                };

                return {
                    login: login,
                    logout: logout,
                    getUser: getUser,
                    getUserName: getUserName,
                    setUser: setUser,
                    switchLanguage: switchLanguage,
                    translate: translate,
                    hasRole: hasRole,
                    openRoleSelectModal: openRoleSelectModal,
                    openEulaModal: openEulaModal
                };

            }]);
}());

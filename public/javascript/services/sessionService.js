(function () {
    'use strict';
    angular.module('sitnet.services')
        .factory('sessionService', ['$q', '$localStorage', '$translate', '$injector', 'SITNET_CONF', function ($q, $localStorage, $translate, $injector, SITNET_CONF) {
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

            // Service needs to be accessed like this because of circular dependency issue
            var $http;
            var http = function () {
                return $http = $http || $injector.get('$http');
            };

            var hasRole = function (user, role) {
                if (!user || !user.roles) {
                    return false;
                }
                return user.roles.some(function (r) {
                    return (r.name === role)
                });
            };

            var logout = function () {
                var deferred = $q.defer();
                http().post('/logout').success(function () {
                    delete $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
                    delete http().defaults.headers.common;
                    _user = undefined;
                    deferred.resolve();
                }).error(function (error) {
                    toastr(error.data);
                    deferred.reject();
                });
                return deferred.promise;
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
                        header[SITNET_CONF.AUTH_HEADER] = user.token;
                        http().defaults.headers.common = header;

                        _user = {
                            id: user.id,
                            firstname: user.firstname,
                            lastname: user.lastname,
                            isAdmin: (hasRole(user, 'ADMIN')),
                            isStudent: (hasRole(user, 'STUDENT')),
                            isTeacher: (hasRole(user, 'TEACHER')),
                            isLoggedOut: false,
                            token: user.token,
                            hasAcceptedUserAgreament: user.hasAcceptedUserAgreament
                        };

                        $localStorage[SITNET_CONF.AUTH_STORAGE_KEY] = _user;
                        deferred.resolve();
                    }).error(function (error) {
                        deferred.reject(error);
                    });
                return deferred.promise;
            };

            var switchLanguage = function (key) {
                $translate.uses(key);
                tmhDynamicLocale.set(key);
            };

            return {
                login: login,
                logout: logout,
                getUser: getUser,
                getUserName: getUserName,
                setUser: setUser,
                switchLanguage: switchLanguage
            };

        }]);
}());

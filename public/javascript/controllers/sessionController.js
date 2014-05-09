(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('SessionCtrl', ['$scope', '$rootScope', '$localStorage', '$sessionStorage', '$location', '$http', '$modal', '$translate', 'authService', 'sessionService', 'ExamRes', 'SITNET_CONF',
            function ($scope, $rootScope, $localStorage, $sessionStorage, $location, $http, $modal, $translate, authService, sessionService, ExamRes, SITNET_CONF) {

                $scope.session = sessionService;

                $scope.switchLanguage = function (key) {
                    $translate.uses(key);
                };

                var dialog;

                $scope.$on('event:auth-loginRequired', function () {
                    dialog = $modal.open({
                        templateUrl: 'assets/templates/login.html',
                        backdrop: 'static',
                        keyboard: false,
                        controller: "SessionCtrl"
                    });
                });

                $scope.$on('event:auth-loginConfirmed', function () {
                    if (dialog !== undefined) {
                        dialog.close();
                    }
                });

                $scope.logout = function () {
                    // Todo: Fix the backend query to only return this user exams
//                   var userexams = ExamRes.exams.query({state: 'STUDENT_STARTED'},
//
//                   );

                    ExamRes.examsByState.query({state: 'STUDENT_STARTED'},
                        function (value) {

                            if (value.length > 0) {
                                toastr.success("SULLA ON TENTTI KESKEN!");
                            } else {
                                $scope.dologout();
                            };
                        },
                        function (error) {
                            toastr.success(error, "SULLA ON TENTTI HUKASSA!");
                        });
                };

                $scope.dologout = function () {
                    var xhr = $http.post('/logout');
                    xhr.success(function (message) {

                        // This could be how the service is called if we could use it to handle logout
//                        sessionService.logout();
                        delete $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
                        delete $http.defaults.headers.common;
                        toastr.success($translate("sitnet_logout_success"));
                        delete $scope.session.user;
                        $rootScope.$broadcast('userUpdated');
                        $location.path("/login");
                    });
                };

                $scope.login = function () {
                    var credentials = {
                        username: $scope.login.username,
                        password: $scope.login.password
                    };
                    var xhr = $http.post('/login', credentials, {
                        ignoreAuthModule: true
                    });
                    xhr.success(function (user) {

                        var hasRole = function (user, role) {
                                if (!user || !user.roles) {
                                    return false;
                                }
                                var i = user.roles.length;
                                while (i--) {
                                    if (user.roles[i].name === role) {
                                        return true;
                                    }
                                }
                                return false;
                            },
                            header = {};
                        header[SITNET_CONF.AUTH_HEADER] = user.token;
                        $http.defaults.headers.common = header;
                        var sessionUser = {
                            firstname: user.firstname,
                            lastname: user.lastname,
                            isAdmin: (hasRole(user, 'ADMIN')),
                            isStudent: (hasRole(user, 'STUDENT')),
                            isTeacher: (hasRole(user, 'TEACHER')),
                            token: user.token
                        };
                        $localStorage[SITNET_CONF.AUTH_STORAGE_KEY] = sessionUser;
                        $scope.session.user = sessionUser;
                        authService.loginConfirmed();
                        $rootScope.$broadcast('userUpdated');
                        toastr.success($translate("sitnet_welcome") + " " + user.firstname + " " + user.lastname);
                    });
                    xhr.error(function (message) {
                        toastr.error(message, "Kirjautuminen epäonnistui!");
                    });
                };



            }]);
}());
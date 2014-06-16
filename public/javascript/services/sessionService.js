(function () {
    'use strict';
    angular.module('sitnet.services', [])
        .factory('sessionService', function () {
            var sessionUser = {};

            var minimizeLibrary = false;
            var minimizeNavigation = false;
            var teacherQuestionExpanded = false;
            var dialog;


            var login = function(/*params*/) {

              return sessionUser;
            };

            var logout = function(/*params*/) {

            };

            var go = function (location) {
                $location.path(location);
            };


            var switchLanguage = function (key) {
                $translate.uses(key);
            };

//            var logout = function () {
//                // Todo: Fix the backend query to only return this user exams
//
//                ExamRes.examsByState.query({state: 'STUDENT_STARTED'},
//                    function (value) {
//
//                        if (value.length > 0) {
//                            toastr.success("Päätä avoin tentti ennen uloskirjautumista");
//                        } else {
//                            dologout();
//                        }
//                        ;
//                    },
//                    function (error) {
//                        toastr.success(error, "Jotain odottamatonta tapahtui!");
//                    });
//            };
//
//            var dologout = function () {
//                var backend = $http.post('/logout');
//                var xhr = $http.get('https://testidp.funet.fi/logout_dummy.jsp');
//
//                xhr.success(function (message) {
//                    delete $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
//                    delete $http.defaults.headers.common;
//                    toastr.success($translate("sitnet_logout_success"));
//                    delete $scope.session.user;
//                    $rootScope.$broadcast('userUpdated');
//                    $location.path("/login");
//                });
//            };
//
//            var login = function () {
//                var credentials = {
//                    username: $scope.login.username,
//                    password: $scope.login.password
//                };
//                var xhr = $http.post('/login', credentials, {
//                    ignoreAuthModule: true
//                });
//                xhr.success(function (user) {
//
//                    var hasRole = function (user, role) {
//                            if (!user || !user.roles) {
//                                return false;
//                            }
//                            var i = user.roles.length;
//                            while (i--) {
//                                if (user.roles[i].name === role) {
//                                    return true;
//                                }
//                            }
//                            return false;
//                        },
//                        header = {};
//
//                    header[SITNET_CONF.AUTH_HEADER] = user.token;
//                    $http.defaults.headers.common = header;
//                    var sessionUser = {
//                        id: user.id,
//                        firstname: user.firstname,
//                        lastname: user.lastname,
//                        isAdmin: (hasRole(user, 'ADMIN')),
//                        isStudent: (hasRole(user, 'STUDENT')),
//                        isTeacher: (hasRole(user, 'TEACHER')),
//                        token: user.token
//                    };
//                    $localStorage[SITNET_CONF.AUTH_STORAGE_KEY] = sessionUser;
//                    $scope.session.user = sessionUser;
//                    authService.loginConfirmed();
//                    $rootScope.$broadcast('userUpdated');
//                    toastr.success($translate("sitnet_welcome") + " " + user.firstname + " " + user.lastname);
//                    $location.path("/home");
//                });
//                xhr.error(function (message) {
//                    toastr.error(message, "Kirjautuminen epäonnistui!");
//                });
//            };
//
            var logoutDialog = function () {

                var modalInstance = $modal.open({
                    templateUrl: 'assets/templates/logout/dialog_logout.html',
                    backdrop: 'static',
                    keyboard: true,
                    controller: "ModalInstanceCtrl"
                });

                modalInstance.result.then(function () {
                    // OK button
                    dologout();
                }, function () {
                    // Cancel button
                });
            };


            return {
                login: login,
                logout: logout,
                getUser: sessionUser,
                logoutDialog: logoutDialog,
                switchLanguage: switchLanguage
            };

        });
}());

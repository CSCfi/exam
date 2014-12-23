(function() {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('SessionCtrl', ['$scope', '$routeParams', '$rootScope', '$localStorage', '$sessionStorage', '$location', '$http', '$modal', '$translate', 'authService', 'sessionService', 'ExamRes', 'UserRes', 'SITNET_CONF', 'tmhDynamicLocale',
            function($scope, $routeParams, $rootScope, $localStorage, $sessionStorage, $location, $http, $modal, $translate, authService, sessionService, ExamRes, UserRes, SITNET_CONF, tmhDynamicLocale) {

                $scope.path = $location.path();
                $scope.session = sessionService;

                $scope.doExam = false;


                $scope.$on('startExam', function() {
                    $scope.doExam = true;
                });

                $scope.$on('endExam', function() {
                    $scope.doExam = false;
                });

                $scope.dologout = function() {
                    $http.post('/logout').success(function() {
                        delete $localStorage[SITNET_CONF.AUTH_STORAGE_KEY];
                        delete $http.defaults.headers.common;
                        toastr.success($translate("sitnet_logout_success"));
                        delete $scope.session.user;
                        $rootScope.$broadcast('userUpdated');
                        //$location.path('/login'); // should forward to some "you are logged out" page?
                    });
                };

                if ($location.url() == "/logout" && $scope.session.user != undefined)
                {
                    $scope.dologout();
                }

                $scope.switchLanguage = function(key) {
                    $translate.uses(key);
                    tmhDynamicLocale.set(key);
                };

                var dialog;

                $scope.$on('event:auth-loginRequired', function() {
                    dialog = $modal.open({
                        templateUrl: 'assets/templates/login.html',
                        backdrop: 'static',
                        keyboard: false,
                        controller: "SessionCtrl"
                    });
                });

                $scope.$on('event:auth-loginConfirmed', function() {
                    if (dialog !== undefined) {
                        dialog.close();
                    }
                });

                $scope.logout = function() {

                    ExamRes.examsByState.query({state: 'STUDENT_STARTED'},
                        function(value) {

                            if (value.length > 0) {
                                toastr.success($translate('sitnet_finish_exam_before_logout'));
                            } else {
                                dologout();
                            }
                        },
                        function(error) {
                            toastr.success(error, $translate('sitnet_internal_error'));
                        });
                };

                $scope.login = function() {
                    var credentials = {
                        username: $scope.login.username,
                        password: $scope.login.password
                    };
                    var xhr = $http.post('/login', credentials, {
                        ignoreAuthModule: true
                    });
                    xhr.success(function(user) {

                        var hasRole = function(user, role) {
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

                        $localStorage[SITNET_CONF.AUTH_STORAGE_KEY] = sessionUser;
                        sessionService.user = $scope.session.user = sessionUser;
                        authService.loginConfirmed();
                        $rootScope.$broadcast('userUpdated');
                        toastr.success($translate("sitnet_welcome") + " " + user.firstname + " " + user.lastname);

                        if (sessionUser.isStudent) {

                            if (!sessionUser.hasAcceptedUserAgreament) {

                                var modalInstance = $modal.open({

                                    templateUrl: 'assets/templates/dialogs/show_eula.html',
                                    backdrop: 'static',
                                    keyboard: false,
                                    controller: function($scope, $modalInstance, sessionService) {

                                        $scope.ok = function() {
                                            console.log("ok")
                                            // OK button
                                            UserRes.updateAgreementAccepted.update({id: sessionUser.id}, function(user) {
                                                sessionService.user = user;
                                            }, function(error) {
                                                toastr.error(error.data);
                                            });
                                            $modalInstance.dismiss();
                                            if ($localStorage["LOCATION.PATH"].indexOf("login") === -1) {
                                                $location.path($localStorage["LOCATION.PATH"]);
                                                $localStorage["LOCATION.PATH"] = "";
                                            } else {
                                                $location.path("/home");
                                            }
                                        };
                                        $scope.cancel = function() {
                                            console.log("cancel")
                                            $modalInstance.dismiss('cancel');
                                            $location.path("/logout");
                                        };
                                    }
                                });

                            }
                        }

                        if ($localStorage["LOCATION.PATH"].indexOf("login") === -1) {
                            $location.path($localStorage["LOCATION.PATH"]);
                            $localStorage["LOCATION.PATH"] = "";
                        } else {
                            $location.path("/home");
                        }
                    });
                    xhr.error(function(message) {
                        toastr.error(message);
                        $location.path("/login");
                    });
                };

                $scope.go = function(location) {
                    $location.path(location);
                };
            }]);
}());
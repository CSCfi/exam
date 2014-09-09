(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('SessionCtrl', ['$scope', '$routeParams', '$rootScope', '$localStorage', '$sessionStorage', '$location', '$http', '$modal', '$translate', 'authService', 'sessionService', 'ExamRes', 'UserRes', 'SITNET_CONF', 'tmhDynamicLocale',
            function ($scope, $routeParams, $rootScope, $localStorage, $sessionStorage, $location, $http, $modal, $translate, authService, sessionService, ExamRes, UserRes, SITNET_CONF, tmhDynamicLocale) {

                $scope.session = sessionService;

//                $scope.logoutDialog = function () {
//
//                    var modalInstance = $modal.open({
//                        templateUrl: 'assets/templates/logout/dialog_logout.html',
//                        backdrop: 'static',
//                        keyboard: true,
//                        controller: "ModalInstanceCtrl"
//                    });
//
//                    modalInstance.result.then(function () {
//                        // OK button
//                        $scope.dologout();
//                    }, function () {
//                        // Cancel button
//                    });
//                };

                if($location.url() == "/logout")
                {
                    if($scope.session.user != undefined)
                    {
                        $scope.dologout();
                    }
                }


                $scope.switchLanguage = function (key) {
                    $translate.uses(key);
                    if(key == 'fi') {
                        tmhDynamicLocale.set('fi');
                    }
                    else if (key == 'swe') {
                        tmhDynamicLocale.set('sv');
                    }
                    else if (key == 'en') {
                        tmhDynamicLocale.set('en');
                    }
                };

                var dialog;

                $scope.$on('event:auth-loginRequired', function () {
                    dialog = $modal.open({
                        templateUrl: 'assets/templates/login.html',
                        backdrop: 'static',
                        keyboard: false,
                        controller: "SessionCtrl"
                    });

//                    $scope.login();
                });

                $scope.$on('event:auth-loginConfirmed', function () {
                    if (dialog !== undefined) {
                        dialog.close();
                    }
                });

                $scope.logout = function () {

                    ExamRes.examsByState.query({state: 'STUDENT_STARTED'},
                        function (value) {

                            if (value.length > 0) {
                                toastr.success("Päätä avoin tentti ennen uloskirjautumista");
                            } else {
                                $scope.dologout();
                            };
                        },
                        function (error) {
                            toastr.success(error, "Jotain odottamatonta tapahtui!");
                        });
                };

                $scope.dologout = function () {
                    var asd = $http.post('/logout');
                    var xhr = $http.get('https://testidp.funet.fi/logout_dummy.jsp');

                    asd.success(function (message) {

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
                            id: user.id,
                            firstname: user.firstname,
                            lastname: user.lastname,
                            isAdmin: (hasRole(user, 'ADMIN')),
                            isStudent: (hasRole(user, 'STUDENT')),
                            isTeacher: (hasRole(user, 'TEACHER')),
                            isLoggedOut : false,
                            token: user.token,
                            eulaAccepted: user.eulaAccepted
                        };
                        $localStorage[SITNET_CONF.AUTH_STORAGE_KEY] = sessionUser;
                        $scope.session.user = sessionUser;
                        authService.loginConfirmed();
                        $rootScope.$broadcast('userUpdated');
                        toastr.success($translate("sitnet_welcome") + " " + user.firstname + " " + user.lastname);
                        if (sessionUser.isStudent) {

                            if (!sessionUser.eulaAccepted) {

                                var modalInstance = $modal.open({

                                    templateUrl: 'assets/templates/dialogs/show_eula.html',
                                    backdrop: 'static',
                                    keyboard: false,
                                    controller: function($scope, $modalInstance) {

                                        $scope.ok = function(){
                                            console.log("ok")
                                            // OK button
                                            UserRes.updateAgreementAccepted.update({id: sessionUser.id}, function (user) {
                                                $scope.session.user = user;
                                            }, function (error) {
                                                toastr.error(error.data);
                                            });
                                            $modalInstance.dismiss();
                                            $location.path("/home");
                                        };
                                        $scope.cancel = function () {
                                            console.log("cancel")
                                            $modalInstance.dismiss('cancel');
                                            $location.path("/logout");
                                        };
                                    }
                                });

                            }
                        }

                        $location.path("/home");
                    });
                    xhr.error(function (message) {
                        toastr.error(message, "Kirjautuminen epäonnistui!");
                    });
                };

                $scope.go = function (location) {
                    $location.path(location);
                };
            }]);
}());
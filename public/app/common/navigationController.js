(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('NavigationCtrl', ['$scope', '$rootScope', '$modal', '$location', 'sessionService', 'waitingRoomService',
            function ($scope, $rootScope, $modal, $location, sessionService, waitingRoomService) {

                $scope.isActive = function (link) {
                    return link.href === "#" + $location.path();
                };

                $scope.loggedOut = false;
                $scope.examStarted = false;

                var links = function () {
                    $scope.user = sessionService.getUser();

                    if (!$scope.user || $scope.user.isLoggedOut) {
                        $scope.loggedOut = true;
                        return [];
                    }

                    var user = $scope.user || {};
                    var admin = user.isAdmin || false;
                    var student = user.isStudent || false;
                    var teacher = user.isTeacher || false;

                    // Do not show if waiting for exam to begin
                    var hideDashboard = (waitingRoomService.getEnrolmentId() || $scope.examStarted) && student;

                    return [
                        {
                            href: "#/",
                            visible: !hideDashboard,
                            class: "fa-home",
                            name: "sitnet_dashboard"
                        },
                        {
                            href: "#/questions",
                            visible: (admin || teacher),
                            class: "fa-list-ol",
                            name: "sitnet_library"
                        },
                        {
                            href: "#/exams",
                            visible: (admin || teacher),
                            class: "fa-paste",
                            name: "sitnet_exams"
                        },
                        {
                            href: "#/reservations",
                            visible: (teacher),
                            class: "fa-clock-o",
                            name: "sitnet_reservations"
                        },
                        {
                            href: "#/rooms",
                            visible: (admin),
                            class: "fa-building-o",
                            name: "sitnet_exam_rooms"
                        },
                        {
                            href: "#/reports",
                            visible: (admin),
                            class: "fa-file-word-o",
                            name: "sitnet_reports"
                        },
                        {
                            href: "#/statistics",
                            visible: (admin),
                            class: "fa-line-chart",
                            name: "sitnet_statistics"
                        },
                        {
                            href: "#/settings",
                            visible: (admin),
                            class: "fa-wrench",
                            name: "sitnet_settings"
                        },
                        {
                            href: "#/users",
                            visible: (admin),
                            class: "fa-users",
                            name: "sitnet_users"
                        },
                        {
                            href: "#/student/exams",
                            visible: (student && !$scope.wrongMachine && !$scope.upcomingExam),
                            class: "fa-search",
                            name: "sitnet_exam_search",
                            sub: []
                        },
                        {
                            href: "#/logout",
                            visible: (student || admin || teacher),
                            class: "fa-sign-out",
                            name: "sitnet_logout"
                        },
                        {
                            href: "#/login",
                            visible: (!sessionService.getUser()),
                            class: "fa-sign-in",
                            name: "sitnet_login"
                        }
                    ];
                };

                $rootScope.$on('userUpdated', function () {
                    $scope.links = links();
                });

                $scope.$on('invalidToken', function () {
                    $scope.links = links();
                    var user = sessionService.getUser();
                    user['isLoggedOut'] = true;
                    sessionService.setUser(user);
                    $location.path("/invalid_session");
                });

                $scope.$on('upcomingExam', function () {
                    $scope.upcomingExam = true;
                    $scope.links = links();
                });

                $scope.$on('examStarted', function () {
                    $scope.examStarted = true;
                    $scope.links = links();
                });

                $scope.$on('examEnded', function () {
                    $scope.examStarted = false;
                    $scope.links = links();
                });

                $scope.$on('wrongMachine', function () {
                    $scope.wrongMachine = true;
                    $scope.links = links();
                });

                $scope.links = links();

            }]);
}());
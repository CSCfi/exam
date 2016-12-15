(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('NavigationCtrl', ['$scope', '$rootScope', '$uibModal', '$location', 'sessionService', 'waitingRoomService', 'SettingsResource',
            function ($scope, $rootScope, $modal, $location, sessionService, waitingRoomService, SettingsResource) {

                $scope.isActive = function (link) {
                    return link.href === $location.path();
                };

                $scope.canDisplayFullNavbar = function () {
                    return window.matchMedia("(min-width: 600px)").matches;
                };

                $scope.loggedOut = false;
                $scope.examStarted = false;
                $scope.mobileMenuOpen = false;

                $scope.openMenu = function () {
                    $scope.mobileMenuOpen = !$scope.mobileMenuOpen;
                };

                var links = function () {
                    $scope.user = sessionService.getUser();

                    if (!$scope.user || $scope.user.isLoggedOut) {
                        $scope.loggedOut = true;
                        delete $scope.appVersion;
                        return [];
                    }

                    var user = $scope.user || {};
                    var admin = user.isAdmin || false;
                    var student = user.isStudent || false;
                    var teacher = user.isTeacher || false;
                    var languageInspector = user.isTeacher && user.isLanguageInspector;

                    if (admin) {
                        SettingsResource.appVersion.get(function (data) {
                            $scope.appVersion = data.appVersion;
                        });
                    }

                    // Do not show if waiting for exam to begin
                    var hideDashboard = (waitingRoomService.getEnrolmentId() || $scope.examStarted) && student;

                    // Change the menu item title if student
                    var nameForDashboard = "sitnet_dashboard";
                    if (student) {
                        nameForDashboard = "sitnet_user_enrolled_exams_title";
                    }

                    return [
                        {
                            href: "/",
                            visible: !hideDashboard,
                            class: "fa-home",
                            name: nameForDashboard,
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/inspections",
                            visible: (languageInspector || admin),
                            class: 'fa-language',
                            name: "sitnet_language_inspections",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/exams",
                            visible: (admin),
                            class: "fa-paste",
                            name: "sitnet_exams",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/rooms",
                            visible: (admin),
                            class: "fa-building-o",
                            name: "sitnet_exam_rooms",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/reports",
                            visible: (admin),
                            class: "fa-files-o",
                            name: "sitnet_reports",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/statistics",
                            visible: (admin),
                            class: "fa-line-chart",
                            name: "sitnet_statistics",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/settings",
                            visible: (admin),
                            class: "fa-wrench",
                            name: "sitnet_settings",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        },
                        {
                            href: "/users",
                            visible: (admin),
                            class: "fa-users",
                            name: "sitnet_users",
                            icon_svg: "icon_reservations.svg",
                            icon_png: "icon_reservations.png"
                        },
                        {
                            href: "/questions",
                            visible: (admin || teacher),
                            class: "fa-list-ol",
                            name: "sitnet_library_new",
                            icon_svg: "icon_pencil.svg",
                            icon_png: "icon_pencil.png"
                        },
                        {
                            href: "/reservations",
                            visible: (teacher),
                            class: "fa-clock-o",
                            name: "sitnet_reservations_new",
                            icon_svg: "icon_reservations.svg",
                            icon_png: "icon_reservations.png"
                        },
                        {
                            href: "/student/exams",
                            visible: (student && !$scope.wrongMachine && !$scope.upcomingExam),
                            class: "fa-search",
                            name: "sitnet_exams",
                            sub: [],
                            icon_svg: "icon_exams.svg",
                            icon_png: "icon_exams.png"
                        },
                        {
                            href: "/student/finishedexams",
                            visible: (student && !$scope.wrongMachine && !$scope.upcomingExam),
                            class: "fa-search",
                            name: "sitnet_exam_responses",
                            sub: [],
                            icon_svg: "icon_finished.svg",
                            icon_png: "icon_finished.png"
                        },
                        {
                            href: "/logout",
                            visible: (student || admin || teacher),
                            class: "fa-sign-out",
                            name: "sitnet_logout",
                            icon_svg: "icon_logout.svg",
                            icon_png: "icon_logout.png"

                        },
                        {
                            href: "/login",
                            visible: (!sessionService.getUser()),
                            class: "fa-sign-in",
                            name: "sitnet_login",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        }
                    ];
                };

                $rootScope.$on('userUpdated', function () {
                    $scope.links = links();
                });

                $scope.$on('invalidToken', function () {
                    $scope.links = links();
                    var user = sessionService.getUser();
                    user.isLoggedOut = true;
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

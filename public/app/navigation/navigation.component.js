angular.module("navigation")
    .component("navigation", {
        templateUrl: '/assets/app/navigation/navigation.template.html',
        controller: ['$rootScope', '$location', 'Session', 'waitingRoomService', 'Navigation',
            function ($rootScope, $location, Session, waitingRoomService, Navigation) {

                var ctrl = this;

                ctrl.isActive = function (link) {
                    return link.href === $location.path();
                };

                ctrl.canDisplayFullNavbar = function () {
                    return window.matchMedia("(min-width: 600px)").matches;
                };

                ctrl.openMenu = function () {
                    ctrl.mobileMenuOpen = !ctrl.mobileMenuOpen;
                };

                var links = function () {
                    ctrl.user = Session.getUser();

                    if (!ctrl.user || ctrl.user.isLoggedOut) {
                        ctrl.loggedOut = true;
                        delete ctrl.appVersion;
                        return [];
                    }

                    var admin = ctrl.user.isAdmin || false;
                    var student = ctrl.user.isStudent || false;
                    var teacher = ctrl.user.isTeacher || false;
                    var languageInspector = ctrl.user.isTeacher && ctrl.user.isLanguageInspector;

                    if (admin) {
                        Navigation.appVersion.get(function (data) {
                            ctrl.appVersion = data.appVersion;
                        });
                    }

                    // Do not show if waiting for exam to begin
                    var hideDashboard = waitingRoomService.getEnrolmentId() && student;

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
                            icon_svg: "icon_language_inspection.svg",
                            icon_png: "icon_language_inspection.png"
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
                            href: "/printouts",
                            visible: (admin),
                            class: "fa-print",
                            name: "sitnet_printout_exams"
                            //icon_svg: "icon_enrols.svg",
                            //icon_png: "icon_enrols.png"
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
                            visible: (student && !ctrl.wrongMachine && !ctrl.upcomingExam),
                            class: "fa-search",
                            name: "sitnet_exams",
                            sub: [],
                            icon_svg: "icon_exams.svg",
                            icon_png: "icon_exams.png"
                        },
                        {
                            href: "/student/finishedexams",
                            visible: (student && !ctrl.wrongMachine && !ctrl.upcomingExam),
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
                            visible: !ctrl.user,
                            class: "fa-sign-in",
                            name: "sitnet_login",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        }
                    ];
                };

                $rootScope.$on('userUpdated', function () {
                    ctrl.links = links();
                });

                $rootScope.$on('upcomingExam', function () {
                    ctrl.upcomingExam = true;
                    ctrl.links = links();
                });

                $rootScope.$on('wrongMachine', function () {
                    ctrl.wrongMachine = true;
                    ctrl.links = links();
                });

                ctrl.switchLanguage = function (key) {
                    Session.switchLanguage(key);
                };

                ctrl.$onInit = function() {
                    ctrl.links = links();
                };


            }]
    });


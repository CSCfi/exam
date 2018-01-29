/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import angular from'angular';

angular.module('app.navigation')
    .component("navigation", {
        template: require('./navigation.template.html'),
        controller: ['$rootScope', '$location', 'Session', 'Navigation',
            function ($rootScope, $location, Session, Navigation) {

                const vm = this;

                vm.isActive = function (link) {
                    return link.href === $location.path();
                };

                vm.canDisplayFullNavbar = function () {
                    return window.matchMedia("(min-width: 600px)").matches;
                };

                vm.openMenu = function () {
                    vm.mobileMenuOpen = !vm.mobileMenuOpen;
                };

                const links = function () {
                    vm.user = Session.getUser();

                    if (!vm.user || vm.user.isLoggedOut) {
                        vm.loggedOut = true;
                        delete vm.appVersion;
                        return [];
                    }

                    const admin = vm.user.isAdmin || false;
                    const student = vm.user.isStudent || false;
                    const teacher = vm.user.isTeacher || false;
                    const languageInspector = vm.user.isTeacher && vm.user.isLanguageInspector;

                    if (admin) {
                        Navigation.appVersion.get(function (data) {
                            vm.appVersion = data.appVersion;
                        });
                    }

                    // Do not show if waiting for exam to begin
                    const hideDashboard = /\/student\/waiting-room|wrong-machine|wrong-room/.test($location.path());

                    // Change the menu item title if student
                    let nameForDashboard = "sitnet_dashboard";
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
                            visible: (student && !hideDashboard),
                            class: "fa-search",
                            name: "sitnet_exams",
                            sub: [],
                            icon_svg: "icon_exams.svg",
                            icon_png: "icon_exams.png"
                        },
                        {
                            href: "/student/participations",
                            visible: (student && !hideDashboard),
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
                            visible: !vm.user,
                            class: "fa-sign-in",
                            name: "sitnet_login",
                            icon_svg: "icon_enrols.svg",
                            icon_png: "icon_enrols.png"
                        }
                    ];
                };

                $rootScope.$on('userUpdated', function () {
                    vm.links = links();
                });

                $rootScope.$on('upcomingExam', function () {
                    vm.links = links();
                });

                $rootScope.$on('wrongLocation', function () {
                    vm.links = links();
                });

                vm.switchLanguage = function (key) {
                    Session.switchLanguage(key);
                };

                vm.$onInit = function() {
                    vm.links = links();
                };


            }]
    });


(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('NavigationCtrl', ['$scope', '$translate', '$location', 'sessionService',
            function ($scope, $translate, $location, sessionService) {

                $scope.isActive = function (link) {
                    return link.href === "#" + $location.path();
                };

                var links = function () {

                    var user = sessionService.user || {},
                        admin = user.isAdmin || false,
                        student = user.isStudent || false,
                        teacher = user.isTeacher || false;

                    return [
                        {href: "#/home", visible: (student || admin || teacher), class: "fa-home", name: $translate("sitnet_dashboard")},
                        {href: "#/questions", visible: (admin || teacher), class: "fa-question-circle", name: $translate("sitnet_questions"), sub: [
                           /* {href: "#/questions/new", visible: (admin || teacher), class: "fa-caret-right", name: $translate("sitnet_questions_new")}
                             {href: "#/active", class: "fa-caret-right", name: $translate("sitnet_questions_all")}
                             {href: "#/questions/own", class: "fa-caret-right", name: $translate("sitnet_questions_ows")},
                             {href: "#/questions/bank", class: "fa-caret-right", name: $translate("sitnet_questions_bank")}*/
                        ]},
                        /*{href: "#/reports", visible: (admin || teacher), class: "fa-bar-chart-o", name: $translate("sitnet_reports")},*/
                        {href: "#/exams", visible: (student || admin || teacher), class: "fa-pencil-square-o", name: $translate("sitnet_exams"), sub: [
//                        {href: "#/student/exams", visible: (student || admin || teacher), class: "fa-caret-right", name: $translate("sitnet_active_exams")}
                        ]},
                        {href: "#/rooms", visible: (student || admin || teacher), class: "fa-sitemap", name: $translate("sitnet_exam_rooms"), sub: [
//                        {href: "#/student/exams", visible: (student || admin || teacher), class: "fa-caret-right", name: $translate("sitnet_active_exams")}
                        ]},
                        /*{href: "#/calendar", visible: (student || admin || teacher), class: "fa-calendar", name: $translate("sitnet_calendar")},*/
                        /*{href: "#/notifications", visible: (student || admin || teacher), class: "fa-bullhorn", name: $translate("sitnet_notifications")},*/
                        /*{href: "#/messages", visible: (student || admin || teacher), class: "fa-comment-o", name: $translate("sitnet_messages")},*/
                        /*{href: "#/tools", visible: (student || admin || teacher), class: "fa-map-marker", name: $translate("sitnet_tools")},*/
                        {href: "#/logout", visible: (student || admin || teacher), class: "fa-sign-out", name: $translate("sitnet_logout")},
                        {href: "#/login", visible: true, class: "fa-sign-in", name: $translate("sitnet_login")}
                    ];
                };

                $scope.$on('$translateChangeSuccess', function () {
                    $scope.links = links();
                });

                $scope.$on('userUpdated', function () {
                    $scope.links = links();
                });

                $scope.toggleNavigation = function () {

                };

            }]);
}());
(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('NavigationCtrl', ['$scope', '$translate', '$location', '$http', 'UserRes', function ($scope, $translate, $location) {

            $scope.isActive = function (link) {
                return link.href == "#" + $location.path();
            };

            var links = function () {
                return [
                    {href: "#/home", class: "fa-home", name: $translate("sitnet_dashboard")},
                    {href: "#/questions", class: "fa-question-circle", name: $translate("sitnet_questions"), sub: [
                        {href: "#/questions/new", class: "fa-caret-right", name: $translate("sitnet_questions_new")},
                        {href: "#/questions/all", class: "fa-caret-right", name: $translate("sitnet_questions_all")},
                        {href: "#/questions/own", class: "fa-caret-right", name: $translate("sitnet_questions_ows")},
                        {href: "#/questions/bank", class: "fa-caret-right", name: $translate("sitnet_questions_bank")},
                    ]},
                    {href: "#/reports", class: "fa-bar-chart-o", name: $translate("sitnet_reports")},
                    {href: "#/exams", class: "fa-pencil-square-o", name: $translate("sitnet_exams")},
                    {href: "#/calendar", class: "fa-calendar", name: $translate("sitnet_calendar")},
                    {href: "#/notifications", class: "fa-bullhorn", name: $translate("sitnet_notifications")},
                    {href: "#/messages", class: "fa-comment-o", name: $translate("sitnet_messages")},
                    {href: "#/tools", class: "fa-map-marker", name: $translate("sitnet_tools")},
                    {href: "#/logout", class: "fa-sign-out", name: $translate("sitnet_logout")},
                    {href: "#/login", class: "fa-sign-in", name: $translate("sitnet_login")}
                ];
            };

            $scope.$on('$translateChangeSuccess', function () {
                $scope.links = links();
            });

        }]);
})();
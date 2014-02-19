(function () {
    'use strict'
    angular.module("sitnet.controllers")
        .controller('LibraryCtrl', ['$scope', '$translate', '$location', function ($scope, $translate, $location) {

            $scope.isActive = function (link) {
                return link.href == "#" + $location.path();
            };


            $scope.links = [
                    {href: "#/home", icon: "fa-home", name: $translate("sitnet_dashboard")},
                    {href: "#/questions", icon: "fa-question-circle", name: $translate("sitnet_questions")},
                    {href: "#/reports", icon: "fa-bar-chart-o", name: $translate("sitnet_reports")},
                    {href: "#/exams", icon: "fa-pencil-square-o", name: $translate("sitnet_exams")},
                    {href: "#/calendar", icon: "fa-calendar", name: $translate("sitnet_calendar")},
                    {href: "#/notifications", icon: "fa-bullhorn", name: $translate("sitnet_notifications")},
                    {href: "#/messages", icon: "fa-comment-o", name: $translate("sitnet_messages")},
                    {href: "#/tools", icon: "fa-map-marker", name: $translate("sitnet_tools")},
                    {href: "#/logout", icon: "fa-sign-out", name: $translate("sitnet_logout")},
                    {href: "#/login", icon: "fa-sign-in", name: $translate("sitnet_login")}
                ];

            $scope.contentTypes = ["aineistotyypit","haettava","kannasta","Kaikki aineistotyypit - oletus"];

            $scope.libraryFilter = "";


        }]);


})();
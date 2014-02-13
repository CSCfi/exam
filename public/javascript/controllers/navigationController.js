(function () {
    'use strict'
    angular.module("sitnet.controllers")
        .controller('NavigationCtrl', ['$scope', '$translate', '$location', '$http', 'UserRes', function ($scope, $translate, $location) {

            $scope.isActive = function (link) {
                return link.href == "#" + $location.path();
            };

            var dashboard = $translate("sitnet_dashboard");

            $scope.links = [
                {href: "#/home", class: "fa-home", name: dashboard},
                {href: "#/questions", class: "fa-question-circle", name: "Kysymykset"},
                {href: "#/reports", class: "fa-bar-chart-o", name: "Tilastot ja Raportit"},
                {href: "#/exams", class: "fa-pencil-square-o", name: "Tentit"},
                {href: "#/calendar", class: "fa-calendar", name: "Kalenteri"},
                {href: "#/notifications", class: "fa-bullhorn", name: "Ilmoitukset"},
                {href: "#/messages", class: "fa-comment-o", name: "Viestit"},
                {href: "#/tools", class: "fa-map-marker", name: "Työkalut"},
                {href: "#/logout", class: "fa-sign-out", name: "Kirjaudu ulos"},
                {href: "#/login", class: "fa-sign-in", name: "Kirjaudu Sisään"}
            ];
        }]);
})();
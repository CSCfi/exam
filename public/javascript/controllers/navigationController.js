(function () {
    'use strict'
    angular.module("sitnet.controllers")
        .controller('vmenuCtrl', ['$scope', '$location', '$http', '$modal', 'UserRes', function ($scope, $location, $http, $modal, userRes) {
            //todo: move dialog open to loginController.js
            var dialog;
            $scope.$on('event:auth-loginRequired', function () {
                dialog = $modal.open({
                    templateUrl: 'assets/templates/login.html',
                    backdrop: 'static',
                    keyboard: false,
                    controller: "LoginCtrl"
                });
            });
            $scope.$on('event:auth-loginConfirmed', function () {
                if (dialog !== undefined) {
                    dialog.close();
                }
            });

            $scope.user = userRes.get({userId:123});

            //todo: move this to the view layer
            $scope.isActive = function (link) {
                return link.href == "#" + $location.path();
            };

            //todo: find better place for this? only business logic should be in angular controllers
            $scope.links = [
                {href: "#/home", class: "fa-home", name: "Työpöytä"},
                {href: "#/questions", class: "fa-question-circle", name: "Kysymykset"},
                {href: "#/reports", class: "fa-bar-chart-o", name: "Tilastot ja Raportit"},
                {href: "#/exams", class: "fa-pencil-square-o", name: "Tentit"},
                {href: "#/calendar", class: "fa-calendar", name: "Kalenteri"},
                {href: "#/notifications", class: "fa-bullhorn", name: "Ilmoitukset"},
                {href: "#/messages", class: "fa-comment-o", name: "Viestit"},
                {href: "#/tools", class: "fa-map-marker", name: "Työkalut"}
                /*{href: "#/about", class: "fa-info-circle", name: "Tietoja"}*/
            ];
        }]);
})();
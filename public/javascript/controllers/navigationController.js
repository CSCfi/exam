(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('NavigationCtrl', ['$scope', '$modal', '$translate', '$location', 'sessionService',
            function ($scope, $modal, $translate, $location, sessionService) {

                $scope.isActive = function (link) {
                    return link.href === "#" + $location.path();
                };

                $scope.loggedOut = false;

                var links = function () {

                    if(sessionService.user && sessionService.user.isLoggedOut) {
                        $scope.loggedOut = true;
                        return [];
                    }

                    var user = sessionService.user || {},
                        admin = user.isAdmin || false,
                        student = user.isStudent || false,
                        teacher = user.isTeacher || false;

                    return [
                        {href: "#/home", visible: (student || admin || teacher), class: "fa-home", name: $translate("sitnet_dashboard")},
                        {href: "#/questions", visible: (admin || teacher), class: "fa-list-ol", name: $translate("sitnet_questions"), sub: []},
                        {href: "#/exams", visible: (admin || teacher), class: "fa-paste", name: $translate("sitnet_exams"), sub: []},
                        {href: "#/rooms", visible: (admin), class: "fa-building-o", name: $translate("sitnet_exam_rooms"), sub: []},
                        {href: "#/reports", visible: (admin), class: "fa-file-word-o", name: $translate("sitnet_reports"), sub: []},
                        {href: "#/admin/reservations", visible: (admin), class: "fa-clock-o", name: $translate("sitnet_reservations"), sub: []},
                        {href: "#/logout", visible: (student || admin || teacher), class: "fa-sign-out", name: $translate("sitnet_logout")},
                        {href: "#/login", visible: (sessionService.user == undefined ? true : false), class: "fa-sign-in", name: $translate("sitnet_login")}
                    ];
                };

//                $scope.login = function () {
//                    var dialog = $modal.open({
//                        templateUrl: 'assets/templates/login.html',
//                        backdrop: 'static',
//                        keyboard: false,
//                        controller: "SessionCtrl"
//                    });
//                };

//                if(!sessionService.user)
//                {
//                    $scope.login();
//                }

                $scope.$on('$translateChangeSuccess', function () {
                    $scope.links = links();
                });

                $scope.$on('userUpdated', function () {
                    $scope.links = links();
                });

                $scope.$on('invalidToken', function () {
                    $scope.links = links();
                    sessionService.user.isLoggedOut = true;
                    $location.path("/invalid_session");
                });

            }]);
}());
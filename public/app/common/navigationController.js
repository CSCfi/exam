(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('NavigationCtrl', ['$scope', '$rootScope', '$modal', '$translate', '$location', 'sessionService', 'waitingRoomService',
            function ($scope, $rootScope, $modal, $translate, $location, sessionService, waitingRoomService) {

                $scope.isActive = function (link) {
                    return link.href === "#" + $location.path();
                };

                $scope.loggedOut = false;
                $scope.examStarted = false;

                var links = function () {
                    $scope.user = sessionService.getUser();

                    if($scope.user && $scope.user.isLoggedOut) {
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
                        {href: "#/home", visible: !hideDashboard, class: "fa-home", name: $translate("sitnet_dashboard")},
                        {href: "#/questions", visible: (admin || teacher), class: "fa-list-ol", name: $translate("sitnet_questions"), sub: []},
                        {href: "#/exams", visible: (admin || teacher), class: "fa-paste", name: $translate("sitnet_exams"), sub: []},
                        {href: "#/rooms", visible: (admin), class: "fa-building-o", name: $translate("sitnet_exam_rooms"), sub: []},
                        {href: "#/reports", visible: (admin), class: "fa-file-word-o", name: $translate("sitnet_reports"), sub: []},
                        {href: "#/admin/reservations", visible: (admin), class: "fa-clock-o", name: $translate("sitnet_reservations"), sub: []},
                        {href: "#/logout", visible: (student || admin || teacher), class: "fa-sign-out", name: $translate("sitnet_logout")},
                        {href: "#/login", visible: (sessionService.getUser() == undefined), class: "fa-sign-in", name: $translate("sitnet_login")}
                    ];
                };

                $scope.$on('$translateChangeSuccess', function () {
                    $scope.links = links();
                });

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

                $scope.$on('upcomingExam', function() {
                    $scope.links = links();
                });

                $scope.$on('examStarted', function() {
                    $scope.examStarted = true;
                    $scope.links = links();
                });

                $scope.$on('examEnded', function() {
                    $scope.examStarted = false;
                    $scope.links = links();
                });

                $scope.$on('wrongMachine', function() {
                    $scope.links = links();
                });

            }]);
}());
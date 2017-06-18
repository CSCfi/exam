(function () {
    'use strict';
    angular.module('app.exam')
        .controller('ExamTabsController', ['$scope', '$timeout', '$q', '$routeParams', '$translate', 'ExamRes', 'EXAM_CONF', 'Session',
            function ($scope, $timeout, $q, $routeParams, $translate, ExamRes, EXAM_CONF, Session) {

                $scope.user = Session.getUser();
                $scope.examInfo = {};
                $scope.examFull = {};

                $scope.tabtemplates = {
                    reviewListPath: EXAM_CONF.TEMPLATES_PATH + "review/review_list.html",
                    examBasicPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_basic_info.html",
                    examQuestionsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_questions.html",
                    examMaterialsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_materials.html",
                    examPublishSettingsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_publish_settings.html"
                };

                $scope.tabs = [
                    {title: 'perus', active: $routeParams.tab === '1'},
                    {title: 'kysymys', active: $routeParams.tab === '2'},
                    {title: 'julkaisu', active: $routeParams.tab === '3'},
                    {title: 'suoritukset', active: $routeParams.tab === '4'}
                ];

                $scope.updateTitle = function (code, name) {
                    if (code && name) {
                        $scope.examInfo.title = code + " " + name;
                    }
                    else if (code) {
                        $scope.examInfo.title = code + " " + $translate.instant("sitnet_no_name");
                    }
                    else {
                        $scope.examInfo.title = name;
                    }
                };

                $scope.initializeExam = function (refresh) {
                    var deferred = $q.defer();
                    if ($scope.newExam && !refresh) {
                        deferred.resolve($scope.newExam);
                        return deferred.promise;
                    } else {
                        ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                            $scope.newExam = exam;
                            $scope.updateTitle(!exam.course ? undefined : exam.course.code, exam.name);
                            $scope.examInfo.examOwners = exam.examOwners;
                            $scope.examFull = exam;
                            $scope.isOwner = filterOwners($scope.user.id, $scope.examInfo);
                            deferred.resolve($scope.newExam);
                        });
                        return deferred.promise;
                    }

                };

                $scope.switchToBasicInfo = function () {
                    $timeout(function() {
                        $scope.tabs.forEach(function (t) {
                            t.active = false;
                        });
                        $scope.tabs[0].active = true;
                    });
                };

                $scope.switchToQuestions = function () {
                    $timeout(function() {
                        $scope.tabs.forEach(function (t) {
                            t.active = false;
                        });
                        $scope.tabs[1].active = true;
                    });
                };

                $scope.switchToPublishSettings = function () {
                    $timeout(function() {
                        $scope.tabs.forEach(function (t) {
                            t.active = false;
                        });
                        $scope.tabs[2].active = true;
                    });
                };

                $scope.titleUpdated = function (props) {
                    $scope.updateTitle(props.code, props.name);
                };

                var filterOwners = function (userId, exam) {

                    var owner = exam.examOwners.filter(function (own) {
                        return (own.id === userId);
                    });
                    return owner.length > 0;
                };

            }
        ]);
}());

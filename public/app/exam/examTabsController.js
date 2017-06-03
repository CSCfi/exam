(function () {
    'use strict';
    angular.module('app.exam')
        .controller('ExamTabsController', ['$scope', '$q', '$routeParams', '$translate', 'ExamRes', 'EXAM_CONF', 'Session',
            function ($scope, $q, $routeParams, $translate, ExamRes, EXAM_CONF, Session) {

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

                $scope.updateTitle = function(exam) {
                    if (exam.course && exam.course.code && exam.name) {
                        $scope.examInfo.title = exam.course.code + " " + exam.name;
                    }
                    else if (exam.course && exam.course.code) {
                        $scope.examInfo.title = exam.course.code + " " + $translate.instant("sitnet_no_name");
                    }
                    else {
                        $scope.examInfo.title = exam.name;
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
                            $scope.updateTitle(exam);
                            $scope.examInfo.examOwners = exam.examOwners;
                            $scope.examFull = exam;
                            $scope.isOwner = filterOwners($scope.user.id, $scope.examInfo);
                            deferred.resolve($scope.newExam);
                        });
                        return deferred.promise;
                    }

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

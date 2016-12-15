(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('ExamTabsController', ['$filter', 'dialogs', '$scope', '$q', '$route', '$routeParams',
            '$location', '$translate', 'ExamRes', 'dateService', 'examService', 'examReviewService', 'fileService', '$uibModal', 'EXAM_CONF',
            function ($filter, dialogs, $scope, $q, $route, $routeParams, $location, $translate, ExamRes, dateService,
                      examService, examReviewService, fileService, $modal, EXAM_CONF) {

                $scope.examInfo = {};
                $scope.examFull = {};
                $scope.tab0 = true;
                $scope.tab1 = false;
                $scope.tab2 = false;
                $scope.tab3 = false;

                if($routeParams.tab == 3) {
                    $scope.tab3 = true;
                }

                $scope.templates = {
                    reviewListPath: EXAM_CONF.TEMPLATES_PATH + "review/review_list.html",
                    examBasicPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_basic_info.html",
                    examQuestionsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_questions.html",
                    examMaterialsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_materials.html",
                    examPublishSettingsPath: EXAM_CONF.TEMPLATES_PATH + "exam/editor/exam_publish_settings.html"
                };

                ExamRes.exams.get({id: $routeParams.id}, function (exam) {
                    if (exam.course && exam.course.code && exam.name) {
                        $scope.examInfo.title = exam.course.code + " " + exam.name;
                    }
                    else if (exam.course && exam.course.code) {
                        $scope.examInfo.title = exam.course.code + " " + $translate.instant("sitnet_no_name");
                    }
                    else {
                        $scope.examInfo.title = exam.name;
                    }
                    $scope.examInfo.examOwners = exam.examOwners;
                    $scope.examFull = exam;
                });


            }
        ]);
}());

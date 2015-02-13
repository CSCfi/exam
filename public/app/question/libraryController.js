(function () {
    'use strict';
    angular.module("sitnet.controllers")
        .controller('LibraryCtrl', ['$scope', 'sessionService', 'QuestionRes', 'ExamRes', 'CourseRes', '$translate', function ($scope, sessionService, QuestionRes, ExamRes, CourseRes, $translate) {

            $scope.courses = [];
            $scope.exams = [];

            $scope.getTags = function() {
                var courses = $scope.courses.filter(function(course) {
                    return course.filtered;
                });
                var exams = $scope.exams.filter(function(exam) {
                    return exam.filtered;
                });
                return courses.concat(exams);
            };

            var query = function() {
                var courseIds = $scope.courses.filter(function(course) {
                   return course.filtered;
                }).map(function(course) {
                    return course.id;
                });
                var examIds = $scope.exams.filter(function(exam) {
                    return exam.filtered;
                }).map(function(exam) {
                    return exam.id;
                });
                QuestionRes.questionlist.query({exam: examIds, course: courseIds}, function (data) {
                    data.map(function (item) {
                        var icon = "";
                        switch (item.type) {
                            case "MultipleChoiceQuestion":
                                icon = "fa-list-ul";
                                break;
                            case "EssayQuestion":
                                icon = "fa-edit";
                                break;
                            default:
                                icon = "fa-edit";
                                break;
                        }
                        item.icon = icon;
                        return item;
                    });
                    $scope.questions = data;
                });
            };

            query();

            $scope.removeTag = function(tag) {
                tag.filtered = false;
                query();
            };

            ExamRes.exams.query(function (data) {
                $scope.exams = data;
            });

            CourseRes.userCourses.query({id: sessionService.getUser().id}, function (data) {
                $scope.courses = data;
            });

            $scope.setExamFilter = function(exam) {
                exam.filtered = !exam.filtered;
                query();
            };

            $scope.setCourseFilter = function(course) {
                course.filtered = !course.filtered;
                query();
            };

            $scope.stripHtml = function(text) {
                if(text && text.indexOf("math-tex") === -1) {
                    return String(text).replace(/<[^>]+>/gm, '');
                }
                return text;
            };

            $scope.shortText = function (text) {

                if(text && text.indexOf("math-tex") === -1) {
                    // reomve HTML tags
                    var str = String(text).replace(/<[^>]+>/gm, '');

                    // shorten string
                    var maxLength = 40;
                    if (str.length > maxLength) {
                        str = String(str).substr(0, maxLength) + "...";
                    }
                    return str;
                }
                return text;
            };

            /**
             * if mathjax formula then no cut
             **/
            $scope.shortText = function (text, maxLength) {

                if(text && text.length > 0 && text.indexOf("math-tex") === -1) {
                    // remove HTML tags
                    var str = String(text).replace(/<[^>]+>/gm, '');
                    // shorten string
                    // ugly hack
                    str = str.replace("&auml;", "ä").replace("&ouml;", "ö").replace("&aring;", "å");
                    return str.length + 3 > maxLength ? String(str).replace("&nbsp;", "").substr(0, maxLength) + "..." : str;
                }
                return text ? text.replace("&nbsp;", "").replace("&auml;", "ä").replace("&ouml;", "ö").replace("&aring;", "å") : "";
            };

        }]);
}());
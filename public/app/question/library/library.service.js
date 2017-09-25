'use strict';
angular.module('app.question')
    .service('Library', ['$resource', '$sessionStorage', '$q', 'Question',
        function ($resource, $sessionStorage, $q, Question) {

            var self = this;

            self.examApi = $resource('/app/examsearch');
            self.courseApi = $resource('/app/courses/user');
            self.tagApi = $resource('/app/tags');
            self.questionApi = $resource('/app/questions');

            self.loadFilters = function (category) {
                if ($sessionStorage.questionFilters && $sessionStorage.questionFilters[category]) {
                    return JSON.parse($sessionStorage.questionFilters[category]);
                }
                return {};
            };

            self.storeFilters = function (filters, category) {
                var data = {filters: filters};
                if (!$sessionStorage.questionFilters) {
                    $sessionStorage.questionFilters = {};
                }
                $sessionStorage.questionFilters[category] = JSON.stringify(data);
            };

            self.applyFreeSearchFilter = function (text, questions) {
                if (text) {
                    return questions.filter(function (question) {
                        var re = new RegExp(text, 'i');

                        var isMatch = question.question && htmlDecode(question.question).match(re);
                        if (isMatch) {
                            return true;
                        }
                        // match course code
                        return question.examSectionQuestions.filter(function (esq) {
                            // Course can be empty in case of a copied exam
                            return esq.examSection.exam.course && esq.examSection.exam.course.code.match(re);
                        }).length > 0;
                    });
                } else {
                    return questions;
                }
            };

            self.applyOwnerSearchFilter = function (owner, questions) {
                if (owner) {
                    return questions.filter(function (question) {
                        var re = new RegExp(vm.filter.owner, 'i');
                        var owner = question.creator.firstName + ' ' + question.creator.lastName;
                        return owner.match(re);
                    });
                } else {
                    return questions;
                }
            };

            self.search = function (examIds, courseIds, tagIds, sectionIds) {
                var deferred = $q.defer();
                self.questionApi.query({
                    exam: examIds,
                    course: courseIds,
                    tag: tagIds,
                    section: sectionIds
                }, function (data) {
                    data.map(function (item) {
                        switch (item.type) {
                            case 'MultipleChoiceQuestion':
                                item.icon = 'fa-list-ul';
                                break;
                            case 'WeightedMultipleChoiceQuestion':
                                item.icon = 'fa-balance-scale';
                                break;
                            case 'EssayQuestion':
                                item.icon = 'fa-edit';
                                break;
                            case 'ClozeTestQuestion':
                                item.icon = 'fa-commenting-o';
                                break;
                        }
                        return item;
                    });
                    var questions = Question.applyFilter(data);
                    questions.forEach(function (q) {
                        if (q.defaultEvaluationType === 'Points' || q.type === 'ClozeTestQuestion' || q.type === 'MultipleChoiceQuestion') {
                            q.displayedMaxScore = q.defaultMaxScore;
                        } else if (q.defaultEvaluationType === 'Selection') {
                            q.displayedMaxScore = 'sitnet_evaluation_select';
                        } else if (q.type === 'WeightedMultipleChoiceQuestion') {
                            q.displayedMaxScore = Question.calculateDefaultMaxPoints(q);
                        }
                        q.typeOrd = ['EssayQuestion',
                            'ClozeTestQuestion',
                            'MultipleChoiceQuestion',
                            'WeightedMultipleChoiceQuestion'].indexOf(q.type);
                        q.ownerAggregate = q.creator.lastName + q.creator.firstName;
                        q.allowedToRemove = q.examSectionQuestions.filter(function (esq) {
                            var exam = esq.examSection.exam;
                            return exam.state === 'PUBLISHED' && exam.examActiveEndDate > new Date().getTime();
                        }).length === 0;
                    });
                    deferred.resolve(questions);
                });
                return deferred.promise;
            };


            var htmlDecode = function (text) {
                return $('<div/>').html(text).text();
            };


        }]);


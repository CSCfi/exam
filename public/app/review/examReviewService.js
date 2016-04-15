(function () {
    'use strict';
    angular.module('exam.services')
        .service('examReviewService', ['$uibModal', '$q', '$translate', 'ExamRes', 'EXAM_CONF',
            function ($modal, $q, $translate, ExamRes, EXAM_CONF) {

                var self = this;

                self.saveFeedback = function (exam, silent) {
                    var deferred = $q.defer();
                    var examFeedback = {
                        "comment": exam.examFeedback.comment
                    };

                    // TODO: combine these to one API call
                    // Update comment
                    if (exam.examFeedback.id) {
                        ExamRes.comment.update({
                            eid: exam.id,
                            cid: exam.examFeedback.id
                        }, examFeedback, function (data) {
                            if (!silent) {
                                toastr.info($translate.instant("sitnet_comment_updated"));
                            }
                            deferred.resolve();
                        }, function (error) {
                            toastr.error(error.data);
                            deferred.reject();
                        });
                        // Insert new comment
                    } else {
                        ExamRes.comment.insert({
                            eid: exam.id,
                            cid: 0
                        }, examFeedback, function (comment) {
                            if (!silent) {
                                toastr.info($translate.instant("sitnet_comment_added"));
                            }
                            exam.examFeedback = comment;
                            deferred.resolve();
                        }, function (error) {
                            toastr.error(error.data);
                            deferred.reject();
                        });
                    }
                    return deferred.promise;
                };

                self.showFeedbackEditor = function (exam) {
                    var modalController = ["$scope", "$uibModalInstance", function ($scope, $modalInstance) {
                        $scope.exam = angular.copy(exam);
                        $scope.ok = function () {
                            $modalInstance.close("Accepted");
                            if (!exam.examFeedback) {
                                exam.examFeedback = {};
                            }
                            exam.examFeedback.comment = $scope.exam.examFeedback.comment;
                            self.saveFeedback(exam);
                        };
                        $scope.cancel = function () {
                            $modalInstance.close("Canceled");
                        };
                    }];

                    var modalInstance = $modal.open({
                        templateUrl: EXAM_CONF.TEMPLATES_PATH + 'review/listings/feedback_modal.html',
                        backdrop: 'static',
                        keyboard: true,
                        controller: modalController,
                        resolve: {
                            exam: function () {
                                return exam;
                            }
                        }
                    });

                    modalInstance.result.then(function () {
                        console.log("closed");
                    });
                };

                self.isReadOnly = function (exam) {
                    return exam && ["GRADED_LOGGED", "ARCHIVED", "ABORTED", "REJECTED"].indexOf(exam.state) > -1;
                };

                self.isGraded = function (exam) {
                    return exam && exam.state === "GRADED";
                };

                self.pickExamLanguage = function (exam) {
                    var lang = exam.answerLanguage;
                    if (lang) {
                        return {code: lang};
                    }
                    else if (exam.examLanguages.length == 1) {
                        lang = exam.examLanguages[0];
                    }
                    return lang;
                };

                self.checkCredit = function (exam, silent) {
                    var credit = exam.customCredit;
                    var valid = !isNaN(credit) && credit >= 0;
                    if (!valid) {
                        if (!silent) {
                            toastr.error($translate.instant('sitnet_not_a_valid_custom_credit'));
                        }
                        // Reset to default
                        exam.customCredit = exam.course.credits;
                    }
                    return valid;
                };

                // Defining markup outside templates is not advisable, but creating a working custom dialog template for this
                // proved to be a bit too much of a hassle. Lets live with this.
                self.getRecordReviewConfirmationDialogContent = function (feedback) {
                    return '<h4>' + $translate.instant('sitnet_teachers_comment') + '</h4>' +
                        feedback + '<br/><strong>' + $translate.instant('sitnet_confirm_record_review') + '</strong>';
                };


                var strip = function (html) {
                    var tmp = document.createElement("div");
                    tmp.innerHTML = html;

                    if (!tmp.textContent && typeof tmp.innerText == "undefined") {
                        return "";
                    }

                    return tmp.textContent || tmp.innerText;
                };

                self.countCharacters = function (text) {
                    if (!text) {
                        return 0;
                    }
                    var normalizedText = text
                        .replace(/\s/g, "")
                        .replace(/&nbsp;/g, "")
                        .replace(/(\r\n|\n|\r)/gm, "")
                        .replace(/&nbsp;/gi, " ");
                    normalizedText = strip(normalizedText)
                        .replace(/^([\t\r\n]*)$/, "");
                    return normalizedText.length;
                };

                self.countWords = function(text) {
                    if (!text) {
                        return 0;
                    }
                    var normalizedText = text
                        .replace(/(\r\n|\n|\r)/gm, " ")
                        .replace(/^\s+|\s+$/g, "")
                        .replace("&nbsp;", " ");

                    normalizedText = strip(normalizedText);

                    var words = normalizedText.split(/\s+/);

                    for (var wordIndex = words.length - 1; wordIndex >= 0; wordIndex--) {
                        if (words[wordIndex].match(/^([\s\t\r\n]*)$/)) {
                            words.splice(wordIndex, 1);
                        }
                    }
                    return words.length;
                };


            }]);
}());

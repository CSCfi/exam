(function () {
    'use strict';
    angular.module("exam.controllers")
        .controller('TagTypeaheadCtrl', ['$scope', 'limitToFilter', 'TagRes', '$translate',
            function ($scope, limitToFilter, TagRes, $translate) {

                $scope.getTags = function (filter, question) {
                    return TagRes.tags.query({filter: filter}).$promise.then(
                        function (tags) {
                            if (filter) {
                                tags.unshift({id: 0, name: filter});
                            }
                            // filter out the ones already tagged for this question
                            var filtered = tags.filter(function(tag) {
                                return question.tags.map(function(qtag) {
                                        return qtag.name;
                                    }).indexOf(tag.name) === -1;
                            });
                            return limitToFilter(filtered, 15);
                        },
                        function (error) {
                            toastr.error(error.data);
                        }
                    );
                };

                var associate = function(tag, question) {
                    TagRes.question.add({tid: tag.id, qid: question.id}, function () {
                        toastr.info($translate('sitnet_question_associated_with_tag'));
                        $scope.newQuestion.tags.push(tag);
                        delete $scope.newQuestion.newTag;
                    }, function (error) {
                        toastr.error(error.data);
                    });
                };

                $scope.onTagSelect = function (tag, question) {
                    if (!tag.id) {
                        // add first
                        TagRes.tags.add(tag, function (response) {
                            if (response.status === 201) {
                                toastr.info($translate('sitnet_new_tag_added'));
                            }
                            tag = response.data;
                            associate(tag, question);
                        }, function (error) {
                            toastr.error(error.data);
                        });
                    } else {
                        associate(tag, question);
                    }
                };
            }]);
}());

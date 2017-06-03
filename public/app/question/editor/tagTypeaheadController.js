'use strict';
angular.module('app.question')
    .controller('TagTypeaheadCtrl', ['$scope', 'limitToFilter', 'TagRes', '$translate',
        function ($scope, limitToFilter, TagRes, $translate) {

            $scope.getTags = function (filter, question) {
                return TagRes.tags.query({filter: filter}).$promise.then(
                    function (tags) {
                        if (filter) {
                            tags.unshift({id: 0, name: filter});
                        }
                        // filter out the ones already tagged for this question
                        var filtered = tags.filter(function (tag) {
                            return question.tags.map(function (qtag) {
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

            $scope.onTagSelect = function (tag, question) {
                $scope.newQuestion.tags.push(tag);
                delete $scope.newQuestion.newTag;
            }
        }]);

/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

import angular from 'angular';
import toast from 'toastr';

angular.module('app.question')
    .component('tagPicker', {
        template: '<div class="col-md-12 margin-20 padl0 padr0">\n' +
            '        <div class="col-md-3 exam-basic-title padl0">\n' +
            '            {{ \'sitnet_tag_question\' | translate}}\n' +
            '            <sup><img popover-placement="right" popover-trigger="\'mouseenter\'"\n' +
            '                      uib-popover="{{\'sitnet_question_tag_question_description\' | translate}}"\n' +
            '                      src="{{$ctrl.tooltipIcon}}" alt="exam"/></sup>\n' +
            '        </div>\n' +
            '        <div class="col-md-9 padr0">\n' +
            '            <input id="newTag" name="newTag" maxlength="30" lowercase\n' +
            '                   class="form-control"\n' +
            '                   ng-model="$ctrl.question.newTag"\n' +
            '                   uib-typeahead="t as t.name for t in $ctrl.getTags($viewValue)"\n' +
            '                   typeahead-on-select="$ctrl.onTagSelect($item)"\n' +
            '                   typeahead-min-length="2"/>\n' +
            '            <ul class="list-inline mart10">\n' +
            '                <li ng-repeat="tag in $ctrl.question.tags">{{tag.name}}\n' +
            '                    <button class="reviewer-remove"\n' +
            '                            popover-placement="top" popover-popup-delay="500"\n' +
            '                            popover-trigger="\'mouseenter\'"\n' +
            '                            uib-popover="{{ \'sitnet_remove\' | translate }}"\n' +
            '                            ng-click="$ctrl.removeTag(tag)"\n' +
            '                            title="{{\'sitnet_remove\' | translate}}">\n' +
            '                        <img src="{{$ctrl.removalIcon}}" alt="exam"/>\n' +
            '                    </button>\n' +
            '                </li>\n' +
            '            </ul>\n' +
            '        </div>\n' +
            '    </div>',
        bindings: {
            question: '<'
        }, controller: ['$resource', 'limitToFilter',
            function ($resource, limitToFilter) {

                const vm = this;

                vm.$onInit = function () {
                    vm.tooltipIcon = require('../../assets/images/icon_tooltip.svg');
                    vm.removalIcon = require('../../assets/images/icon_remove.svg');
                }

                vm.getTags = function (filter) {
                    return $resource("/app/tags").query({ filter: filter }).$promise.then(
                        function (tags) {
                            if (filter) {
                                tags.unshift({ id: 0, name: filter });
                            }
                            // filter out the ones already tagged for this question
                            const filtered = tags.filter(function (tag) {
                                return vm.question.tags.map(function (qtag) {
                                    return qtag.name;
                                }).indexOf(tag.name) === -1;
                            });
                            return limitToFilter(filtered, 15);
                        },
                        function (error) {
                            toast.error(error.data);
                        }
                    );
                };

                vm.onTagSelect = function (tag) {
                    vm.question.tags.push(tag);
                    delete vm.question.newTag;
                };

                vm.removeTag = function (tag) {
                    vm.question.tags.splice(vm.question.tags.indexOf(tag), 1);
                };

            }]
    });




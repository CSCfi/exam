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
import * as angular from 'angular';
import * as toast from 'toastr';

import { Question, Tag } from '../../exam/exam.model';


export const TagPickerComponent: angular.IComponentOptions = {
    template:
        `<div class="col-md-12 margin-20 padl0 padr0">
            <div class="col-md-3 exam-basic-title padl0">
                {{ 'sitnet_tag_question' | translate}}
                <sup><img popover-placement="right" popover-trigger="'mouseenter'"
                        uib-popover="{{'sitnet_question_tag_question_description' | translate}}"
                        src="{{$ctrl.tooltipIcon}}" alt="exam"/></sup>
            </div>
            <div class="col-md-9 padr0">
                <input id="newTag" name="newTag" maxlength="30" lowercase
                    class="form-control"
                    ng-model="$ctrl.question.newTag"
                    uib-typeahead="t as t.name for t in $ctrl.getTags($viewValue)"
                    typeahead-on-select="$ctrl.onTagSelect($item)"
                    typeahead-min-length="2"/>
                <ul class="list-inline mart10">
                    <li ng-repeat="tag in $ctrl.question.tags">{{tag.name}}
                    <button class="reviewer-remove"
                            popover-placement="top" popover-popup-delay="500"
                                popover-trigger="'mouseenter'"
                                uib-popover="{{ 'sitnet_remove' | translate }}"
                                ng-click="$ctrl.removeTag(tag)"
                                title="{{'sitnet_remove' | translate}}">
                            <img src="{{$ctrl.removalIcon}}" alt="exam"/>
                        </button>
                    </li>
                </ul>
            </div>
        </div>`,
    bindings: {
        question: '<'
    },
    controller: class TagPickerController implements angular.IComponentController, angular.IOnInit {
        question: Question & { newTag: Tag };
        tooltipIcon: unknown;
        removalIcon: unknown;

        constructor(private $http: angular.IHttpService, private $q: angular.IQService) {
            'ngInject';
        }

        $onInit() {
            this.tooltipIcon = require('Images/icon_tooltip.svg');
            this.removalIcon = require('Images/icon_remove.svg');
        }

        getTags = (filter: string): angular.IPromise<Tag[]> => {
            const deferred: angular.IDeferred<Tag[]> = this.$q.defer();
            this.$http.get('/app/tags', { params: { filter: filter } })
                .then(
                    (resp: angular.IHttpResponse<Tag[]>) => {
                        const tags = resp.data;
                        if (filter) {
                            tags.unshift({ id: 0, name: filter });
                        }
                        // filter out the ones already tagged for this question and slice
                        const filtered = tags.filter(tag =>
                            this.question.tags.every(qt => qt.name !== tag.name)
                        ).slice(0, 15);
                        return deferred.resolve(filtered);
                    })
                .catch(error => {
                    toast.error(error.data);
                    return deferred.resolve([]);
                });
            return deferred.promise;
        }

        onTagSelect = (tag: Tag) => {
            this.question.tags.push(tag);
            delete this.question.newTag;
        };

        removeTag = (tag: Tag) =>
            this.question.tags.splice(this.question.tags.indexOf(tag), 1);

    }
}

angular.module('app.question').component('tagPicker', TagPickerComponent);

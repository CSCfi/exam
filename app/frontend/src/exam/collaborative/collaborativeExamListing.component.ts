/*
 * Copyright (c) 2018 Exam Consortium
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
import * as moment from 'moment';
import * as toast from 'toastr';
import { CollaborativeExamService, CollaborativeExam } from './collaborativeExam.service';

export const CollaborativeExamListingComponent: angular.IComponentOptions = {
    template: `
        <div id="sitnet-header" class="header">
            <div class="col-md-12 header-wrapper">
                <span class="header-text">{{\'sitnet_collaborative_exams\' | translate}}</span>
            </div>
        </div>
        <div id="dashboard">
            <!-- toolbar -->
            <div class="top-row">
                <div class="col-md-12">
                    <button class=" pull-right btn btn-info" ng-click="$ctrl.createExam()">
                        {{'sitnet_toolbar_new_exam' | translate}}
                    </a>
                </div>
            </div>
            <div class="top-row">
                <div class="col-md-12">
                    <table class="table table-striped table-condensed exams-table">
                        <thead>
                        <tr>
                            <th sort by="name" text="sitnet_exam_name" predicate="$ctrl.predicate"
                                reverse="$ctrl.reverse"></th>
                            <th sort by="ownerAggregate" text="sitnet_teachers"
                                predicate="$ctrl.predicate" reverse="$ctrl.reverse"></th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr ng-repeat="exam in $ctrl.exams | orderBy:$ctrl.predicate:$ctrl.reverse">
                            <td>
                                <a class="exams-info-title bold-button"
                                    href="/exams/collaborative/{{exam.id}}/1">
                                    <span ng-if="exam.name">{{exam.name}}</span>
                                    <span ng-if="!exam.name" class="text-danger">
                                        {{'sitnet_no_name' | translate | uppercase }}
                                    </span>
                                </a>
                            </td>
                            <td>
                                <teacher-list exam="exam"/>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`,
    controller: class CollaborativeExamListingController implements angular.IComponentController {

        exams: CollaborativeExam[];

        constructor(
            private $location: angular.ILocationService,
            private $translate: angular.translate.ITranslateService,
            private CollaborativeExam: CollaborativeExamService) {
            'ngInject';
        }

        $onInit() {

            this.CollaborativeExam.listExams().then((exams: CollaborativeExam[]) => {
                this.exams = exams;
            }).catch(angular.noop);
        }

        createExam() {
            this.CollaborativeExam.createExam().then((exam: CollaborativeExam) => {
                toast.info(this.$translate.instant('sitnet_exam_created'));
                this.$location.path(`/exams/collaborative/${exam.id}/1`);
            }).catch(resp => toast.error(resp.data));
        }

    }
};

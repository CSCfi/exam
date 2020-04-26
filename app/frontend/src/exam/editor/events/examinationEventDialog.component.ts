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
 *
 */
import * as angular from 'angular';
import * as toast from 'toastr';

import { ExaminationEventConfiguration } from '../../exam.model';

export const ExaminationEventDialogComponent: angular.IComponentOptions = {
    template: `
    <div id="sitnet-dialog">
        <div class="student-message-dialog-wrapper-padding">
            <div class="student-enroll-dialog-wrap">
                <h1 class="student-enroll-title">
                    <span ng-if="!$ctrl.resolve.config">{{'sitnet_add_examination_event' | translate}}</span>
                    <span ng-if="$ctrl.resolve.config">{{'sitnet_update_examination_event' | translate}}</span>
                </h1>
            </div>
            <form class="modal-body" name="eventForm">
                <div class="row" ng-if="$ctrl.hasEnrolments">
                    <div class="col-md-12 text text-danger">
                        {{ 'sitnet_enrolments_exist_for_examination_event' | translate }}
                    </div>
                </div>
                <div id="datetimepicker">
                    <div class="row">
                        <div class="col-md-12">
                            <label for="dtpicker">{{'sitnet_begin' | translate}}:</label>
                            <date-time-picker disabled="$ctrl.hasEnrolments" id="dtpicker" hour-step="1" minute-step="15" 
                                initial-time="$ctrl.start" on-update="$ctrl.onStartDateChange(date)">
                            </date-time-picker>
                        </div>  
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-12">
                        <label for="description">{{'sitnet_instructions' | translate}}:</label>
                        <textarea id="description" class="form-control" required 
                            ng-model="$ctrl.description"></textarea>
                    </div>
                </div>
                <div class="row" ng-if="$ctrl.requiresPassword">
                    <div class="col-md-12">
                        <label for="password">{{'sitnet_settings_password' | translate}}:</label>
                        <div id="password" class="input-group wdth-30">
                            <input type="{{$ctrl.pwdInputType}}" name="password" class="form-control"
                            ng-model="$ctrl.password" ng-disabled="$ctrl.hasEnrolments" required>
                            <span class="input-group-addon">
                                <span ng-class="$ctrl.pwdInputType === 'text' ? 'fa fa-lock' : 'fa fa-unlock'"
                                    ng-click="$ctrl.togglePasswordInputType()">
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </form>
            <div class="student-message-dialog-footer">
                <div class="student-message-dialog-button-save">
                    <button class="btn btn-sm btn-primary" ng-disabled="!eventForm.$valid" ng-click="$ctrl.ok()">
                        {{'sitnet_button_accept' | translate}}
                    </button>
                </div>
                <div class="student-message-dialog-button-cancel">
                    <button class="btn btn-sm btn-danger pull-left" ng-click="$ctrl.cancel()">
                        {{'sitnet_button_decline' | translate}}
                    </button>
                </div>
            </div>
        </div>
    </div>
    `,
    bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&',
    },
    controller: class ExaminationEventDialogController implements angular.IComponentController {
        resolve: { config: ExaminationEventConfiguration; requiresPassword: boolean };
        close: (_: { $value: { config: Omit<ExaminationEventConfiguration, 'examEnrolments'> } }) => any;
        dismiss: () => any;

        start: Date;
        requiresPassword: boolean;
        description: string;
        password?: string;
        hasEnrolments: boolean;
        pwdInputType = 'password';

        constructor(private $translate: angular.translate.ITranslateService) {
            'ngInject';
        }

        $onInit() {
            this.requiresPassword = this.resolve.requiresPassword;
            if (this.resolve.config) {
                this.start = new Date(this.resolve.config.examinationEvent.start);
                this.description = this.resolve.config.examinationEvent.description;
                this.password = this.resolve.config.settingsPassword;
                this.hasEnrolments = this.resolve.config.examEnrolments.length > 0;
            } else {
                this.start = new Date();
            }
        }

        togglePasswordInputType = () => (this.pwdInputType = this.pwdInputType === 'text' ? 'password' : 'text');
        onStartDateChange = (date: Date) => (this.start = date);

        ok() {
            if (!this.start) {
                toast.error(this.$translate.instant('sitnet_no_examination_start_date_picked'));
            }
            this.close({
                $value: {
                    config: {
                        examinationEvent: {
                            start: this.start,
                            description: this.description,
                        },
                        settingsPassword: this.password,
                    },
                },
            });
        }

        cancel() {
            this.dismiss();
        }
    },
};

angular.module('app.exam.editor').component('examinationEventDialog', ExaminationEventDialogComponent);

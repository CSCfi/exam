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


declare function require(name: string): any;

export const DateTimePickerComponent: angular.IComponentOptions = {
    template: `
        <div id="datetimepicker" class="datetimepicker-wrapper">
            <date-picker on-update="$ctrl.onDateUpdate(date)"><date-picker/>
        </div>
        <div id="datetimepicker" class="datetimepicker-wrapper"
            ng-model="$ctrl.time" ng-change="$ctrl.onTimeUpdate()" style="display:inline-block">
            <div uib-timepicker show-meridian="false" hour-step="$ctrl.hourStep" minute-step="$ctrl.minuteStep">
        </div>
        `,
    bindings: {
        initialTime: '<?',
        disabled: '<',
        onUpdate: '&',
        hourStep: '<?',
        minuteStep: '<?'
    },
    controller: class DateTimePickerController implements angular.IComponentController {

        onUpdate: ({ date: Date }) => any;
        date: Date = new Date();
        hourStep: number;
        minuteStep: number;
        time: Date;
        initialTime: Date;
        disabled: boolean;

        private setDateTime = (dt: Date) => {
            this.date.setFullYear(dt.getFullYear());
            this.date.setMonth(dt.getMonth(), dt.getDate());
            this.time.setHours(dt.getHours());
            this.time.setMinutes(dt.getMinutes());
            this.time.setSeconds(0);
            this.time.setMilliseconds(0);
        }

        $onInit() {
            this.time = new Date();
            this.date = new Date();
            if (this.initialTime) {
                this.setDateTime(this.initialTime);
            }
        }

        onTimeUpdate() {
            this.date.setHours(this.time.getHours());
            this.date.setMinutes(this.time.getMinutes());
            this.date.setSeconds(0);
            this.date.setMilliseconds(0);
            this.onUpdate({ date: this.date });
        }

        onDateUpdate(date: Date) {
            this.date.setFullYear(date.getFullYear());
            this.date.setMonth(date.getMonth(), date.getDate());
            this.date.setHours(this.time.getHours());
            this.date.setMinutes(this.time.getMinutes());
            this.date.setSeconds(0);
            this.date.setMilliseconds(0);
            this.onUpdate({ date: this.date });
        }
    }
};

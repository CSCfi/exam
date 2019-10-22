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
import * as _ from 'lodash';
import * as moment from 'moment';

export const DatePickerComponent: angular.IComponentOptions = {
    template: require('./datePicker.template.html'),
    bindings: {
        onUpdate: '&',
        initialDate: '<?',
        extra: '<?',
        extraText: '@',
        onExtraAction: '&',
        modelOptions: '<?',
        optional: '<?',
    },
    controller: class DatePickerController implements angular.IComponentController {
        onUpdate: ({ date: Date }) => any;
        onExtraAction: ({ date: Date }) => any;
        date: Date | null;
        initialDate: Date | string | null;
        showWeeks = true;
        modelOptions: any;
        optional: boolean;

        opened: boolean;
        options = {
            startingDay: 1,
        };
        format = 'dd.MM.yyyy';

        $onInit() {
            if (angular.isUndefined(this.modelOptions)) {
                this.modelOptions = {};
            }
            if (_.isString(this.initialDate)) {
                this.date = moment(this.initialDate).toDate();
            } else {
                this.date = angular.isUndefined(this.initialDate) ? new Date() : this.initialDate;
            }
        }

        openPicker(event) {
            event.preventDefault();
            event.stopPropagation();
            this.opened = true;
        }

        dateChanged() {
            this.onUpdate({ date: this.date });
        }

        extraClicked() {
            this.onExtraAction({ date: this.date });
        }
    },
};

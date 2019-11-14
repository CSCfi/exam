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
import moment from 'moment';
import toast from 'toastr';

class ArchiveDownloadController {
    constructor($translate) {
        this.$onInit = function() {
            this.params = { startDate: new Date(), endDate: new Date() };
        };
        this.startDateChanged = function(date) {
            this.params.startDate = date;
        };
        this.endDateChanged = function(date) {
            this.params.endDate = date;
        };
        this.ok = function() {
            let start, end;
            if (this.params.startDate) {
                start = moment(this.params.startDate);
            }
            if (this.params.endDate) {
                end = moment(this.params.endDate);
            }
            if (start && end && end < start) {
                toast.error($translate.instant('sitnet_endtime_before_starttime'));
            } else {
                this.close({
                    $value: {
                        start: start.format('DD.MM.YYYY'),
                        end: end.format('DD.MM.YYYY'),
                    },
                });
            }
        };
        this.cancel = function() {
            this.dismiss({ $value: 'cancel' });
        };
    }
}

angular.module('app.review').component('archiveDownload', {
    template: require('./archiveDownload.template.html'),
    bindings: {
        close: '&',
        dismiss: '&',
    },
    controller: ['$translate', ArchiveDownloadController],
});

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
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';

import { Exam } from '../../exam.model';

@Component({
    selector: 'publication-dialog',
    template: require('./publicationDialog.component.html'),
})
export class PublicationDialogComponent {
    @Input() exam: Exam;
    @Input() prePublication: boolean;

    constructor(public activeModal: NgbActiveModal, private translate: TranslateService) {}

    getConfirmationText = () => {
        let confirmation = this.prePublication
            ? this.translate.instant('sitnet_pre_publish_exam_confirm')
            : this.translate.instant('sitnet_publish_exam_confirm');
        if (this.exam.executionType.type !== 'PRINTOUT' && !this.prePublication) {
            confirmation += ' ' + this.translate.instant('sitnet_publish_exam_confirm_enroll');
        }
        return confirmation;
    };

    getTitle = () =>
        this.prePublication
            ? 'sitnet_pre_publish_exam_confirm_dialog_title'
            : 'sitnet_publish_exam_confirm_dialog_title';
}

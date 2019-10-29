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
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as toast from 'toastr';

import { User } from '../../../session/session.service';

@Component({
    selector: 'r-inspection',
    template: require('./inspection.component.html'),
})
export class InspectionComponent implements OnInit {
    @Input() inspection: { id: number; user: User; ready: boolean };
    @Input() user: User;
    @Input() disabled: boolean;
    @Output() onInspection = new EventEmitter<void>();

    reviewStatuses: { key: boolean; value: string }[];

    constructor(private http: HttpClient, private translate: TranslateService) {}

    ngOnInit() {
        this.reviewStatuses = [
            {
                key: true,
                value: this.translate.instant('sitnet_ready'),
            },
            {
                key: false,
                value: this.translate.instant('sitnet_in_progress'),
            },
        ];
    }

    setInspectionStatus = () => {
        if (this.inspection.user.id === this.user.id) {
            this.http.put(`/app/exams/inspection/${this.inspection.id}`, { ready: this.inspection.ready }).subscribe(
                () => {
                    toast.info(this.translate.instant('sitnet_exam_updated'));
                    this.onInspection.emit();
                },
                err => toast.error(err.data),
            );
        }
    };
}

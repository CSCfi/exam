/*
 * Copyright (c) 2020 Exam Consortium
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
import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FileService } from '../../../shared/file/file.service';

@Component({
    selector: 'xm-library-file-export',
    template: `<div *ngIf="selections.length > 0" class="padl30 questions-selections-box">
        <div class="make-inline">
            <span class="padl10">
                <i class="bi-cloud-upload-fill" style="color: #266b99"></i>&nbsp;
                <a class="infolink pointer" (click)="export()"> {{ 'sitnet_export_questions' | translate }}</a>
            </span>
        </div>
    </div> `,
})
export class LibraryFileExportComponent {
    @Input() selections: number[] = [];

    constructor(private Files: FileService, private translate: TranslateService, private toast: ToastrService) {}

    export() {
        if (this.selections.length === 0) {
            this.toast.warning(this.translate.instant('sitnet_choose_atleast_one'));
        } else {
            this.Files.download(
                '/app/questions/export',
                'moodle-export.xml',
                { ids: this.selections.map((s) => s.toString()) },
                true,
            );
        }
    }
}

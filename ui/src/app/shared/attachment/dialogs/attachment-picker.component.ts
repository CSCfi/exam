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

import type { OnInit } from '@angular/core';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { FileService } from 'src/app/shared/file/file.service';

export interface FileResult {
    $value: { attachmentFile: File };
}

/*
    file-select has been made accessible so that there is button (<label>)
    that is hidden from non-visual_user and keyboard accessible input field
    that is "hidden" from visual_user. Both works the same but one solution
    is hidden from the other.

    If this ever gets refactored. There should only be input field for
    file-selection. Now it's split in two to have better language support.
 */

@Component({
    selector: 'xm-attachment-selector',
    standalone: true,
    imports: [TranslateModule],
    template: `
        <div class="modal-header">
            <h2 class="xm-modal-title">{{ title | translate }}</h2>
        </div>
        <div class="modal-body">
            <div class="row">
                <div class="col-3">
                    <label for="file-select" class="btn btn-success btn-file" aria-hidden="true"
                        >{{ 'i18n_choose' | translate }}
                    </label>
                    <input
                        id="file-select"
                        type="file"
                        class="attachment-input"
                        tabindex="0"
                        autofocus
                        #file
                        (change)="onFilesAdded()"
                        attr.aria-label="{{ 'i18n_choose_file' | translate }}"
                    />
                </div>
                <div class="col-9 attachment-file">
                    {{ fileObject?.name }}
                </div>
            </div>
            <div class="row pt-2">
                @if (isTeacherModal) {
                    <div class="col-12">
                        {{ 'i18n_check_file_accessible' | translate }}
                    </div>
                }
            </div>
            <div class="row">
                <div class="col-12">{{ 'i18n_max_file_size' | translate }} {{ (maxFileSize || 0) / 1000000 }} MB.</div>
            </div>
        </div>
        <div class="d-flex flex-row-reverse flex-align-r m-3">
            <button class="btn btn-success " (click)="confirmed()" [disabled]="!fileObject">
                {{ 'i18n_button_save' | translate }}
            </button>
            <button class="btn btn-outline-secondary me-3" (click)="activeModal.dismiss()">
                {{ 'i18n_button_cancel' | translate }}
            </button>
        </div>
    `,
    styleUrls: ['./attachment-picker.component.scss'],
})
export class AttachmentSelectorComponent implements OnInit {
    @ViewChild('file', { static: false }) file!: ElementRef;
    @Input() title = '';
    @Input() isTeacherModal = false;
    fileObject!: File;
    maxFileSize = 0;

    constructor(
        public activeModal: NgbActiveModal,
        private Files: FileService,
    ) {}

    ngOnInit() {
        this.Files.getMaxFilesize().then((data) => (this.maxFileSize = data.filesize));
    }

    confirmed() {
        this.activeModal.close({ $value: { attachmentFile: this.fileObject } });
    }

    onFilesAdded() {
        const files: { [key: string]: File } = this.file.nativeElement.files;
        for (const key in files) {
            if (!isNaN(parseInt(key))) {
                this.fileObject = files[key];
                break;
            }
        }
    }
}

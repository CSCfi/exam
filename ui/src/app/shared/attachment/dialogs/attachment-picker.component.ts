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
import { FileService } from '../../file/file.service';

export interface FileResult {
    $value: { attachmentFile: File };
}

@Component({
    selector: 'xm-attachment-selector',
    template: `<div id="sitnet-dialog">
        <div class="modal-header">
            <h2>{{ title | translate }}</h2>
        </div>

        <div class="modal-body">
            <div class="row">
                <div class="col-md-3">
                    <label for="file-select" class="btn btn-success btn-file">{{ 'sitnet_choose' | translate }}</label>
                    <input
                        id="file-select"
                        type="file"
                        class="attachment-input"
                        #file
                        style="display: none"
                        (change)="onFilesAdded()"
                    />
                </div>
                <div class="col-md-9 attachment-file">
                    {{ fileObject?.name }}
                </div>
            </div>
            <div class="row top-padding-2">
                <div class="col-md-12" *ngIf="isTeacherModal">
                    {{ 'sitnet_check_file_accessible' | translate }}
                </div>
            </div>
            <div class="row">
                <div class="col-md-12">
                    {{ 'sitnet_max_file_size' | translate }} {{ (maxFileSize || 0) / 1000000 }} MB.
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary float-start" (click)="activeModal.dismiss()">
                {{ 'sitnet_button_cancel' | translate }}
            </button>
            <button class="btn btn btn-success float-end" (click)="confirmed()" [disabled]="!fileObject">
                {{ 'sitnet_button_save' | translate }}
            </button>
        </div>
    </div> `,
})
export class AttachmentSelectorComponent implements OnInit {
    @ViewChild('file', { static: false }) file!: ElementRef;
    @Input() title = '';
    @Input() isTeacherModal = false;
    fileObject!: File;
    maxFileSize = 0;

    constructor(public activeModal: NgbActiveModal, private Files: FileService) {}

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

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

import { Component, OnInit, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FileService } from '../../file/file.service';

export interface FileResult {
    $value: { attachmentFile: File };
}

@Component({
    selector: 'attachment-selector',
    template: require('./attachmentSelector.component.html')
})
export class AttachmentSelectorComponent implements OnInit {
    @ViewChild('file') file;
    fileObject: File;

    title = 'sitnet_attachment_selection';
    isTeacherModal: boolean;
    maxFileSize: number;

    constructor(public activeModal: NgbActiveModal, private Files: FileService) { }

    ngOnInit() {
        this.Files.getMaxFilesize().then(data => this.maxFileSize = data.filesize);
    }

    confirmed() {
        this.activeModal.close({ $value: { attachmentFile: this.fileObject } });
    }

    onFilesAdded() {
        const files: { [key: string]: File } = this.file.nativeElement.files;
        for (let key in files) {
            if (!isNaN(parseInt(key))) {
                this.fileObject = files[key];
                break;
            }
        }
    }

}

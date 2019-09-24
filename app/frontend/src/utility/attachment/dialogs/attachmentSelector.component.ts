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

import { FileService } from '../../file/file.service';


declare function require(name: string): any;

export interface FileResult {
    $value: { attachmentFile: File };
}

interface CancelResult {
    $value: string;
}

export const AttachmentSelectorComponent: angular.IComponentOptions = {
    template: require('./attachmentSelector.template.html'),
    bindings: {
        close: '&',
        dismiss: '&',
        resolve: '<'
    },
    controller: class AttachmentSelectorController implements angular.IComponentController {
        close: (r: FileResult) => void;
        dismiss: (r: CancelResult) => void;
        resolve: { isTeacherModal: boolean; title: string };
        title: string;
        isTeacherModal: boolean;
        maxFileSize: number;
        attachmentFile: File;

        constructor(
            private Files: FileService
        ) {
            'ngInject';
        }

        $onInit() {
            this.title = this.resolve.title || 'sitnet_attachment_selection';
            this.isTeacherModal = this.resolve.isTeacherModal;
            this.Files.getMaxFilesize().then(data => this.maxFileSize = data.filesize);
        }

        ok() {
            this.close({
                $value: { 'attachmentFile': this.attachmentFile }
            });
        }

        cancel() {
            this.dismiss({ $value: 'cancel' });
        }

    }
};

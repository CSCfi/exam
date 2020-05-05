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
import * as toast from 'toastr';

import { FileService } from '../../../utility/file/file.service';

export const LibraryExportComponent: angular.IComponentOptions = {
    template: require('./libraryExport.template.html'),
    bindings: {
        selections: '<',
    },
    controller: class LibraryExportController implements angular.IComponentController {
        selections: number[];

        constructor(private Files: FileService, private $translate: angular.translate.ITranslateService) {
            'ngInject';
        }

        export = () => {
            if (this.selections.length == 0) {
                toast.warning(this.$translate.instant('sitnet_choose_atleast_one'));
            } else {
                this.Files.download('/app/questions/export', 'moodle-export.xml', { ids: this.selections }, true);
            }
        };
    },
};

angular.module('app.question').component('libraryExport', LibraryExportComponent);

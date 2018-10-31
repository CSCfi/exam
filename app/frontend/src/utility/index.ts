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
 */
import { downgradeInjectable } from '@angular/upgrade/static';

import * as angular from 'angular';

import runBlock from './utility.run';
import { AttachmentService } from './attachment/attachment.service';
import { DateTimeService } from './date/date.service';
import { FileService } from './file/file.service';
import { AttachmentSelectorComponent } from './attachment/dialogs/attachmentSelector.component';
import { DatePickerComponent } from './date/datePicker.component';
import { DropDownSelectComponent } from './select/dropDownSelect.component';
import { DroppableDirective, DraggableModalDirective, SortableDirective } from './dragndrop/dragndrop.directive';
import { DateTimePickerComponent } from './date/dateTimePicker.component';
import { PaginatorComponent } from './paginator/paginator.component';

export default angular.module('app.utility', [])
    .run(runBlock)
    .service('Attachment', AttachmentService)
    .service('DateTime', DateTimeService)
    .service('Files', downgradeInjectable(FileService))
    .component('attachmentSelector', AttachmentSelectorComponent)
    .component('datePicker', DatePickerComponent)
    .component('dateTimePicker', DateTimePickerComponent)
    .component('dropDownSelect', DropDownSelectComponent)
    .component('paginator', PaginatorComponent)
    .directive('droppable', DroppableDirective.factory())
    .directive('draggableModal', DraggableModalDirective.factory())
    .directive('sortable', SortableDirective.factory())
    .name;


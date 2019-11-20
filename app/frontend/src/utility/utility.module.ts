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
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { TruncatingPipe } from '../utility/truncate/truncate.pipe';
import { AttachmentService } from './attachment/attachment.service';
import { AttachmentSelectorComponent } from './attachment/dialogs/attachmentSelector.component';
import { CKEditorComponent } from './ckeditor/ckeditor.component';
import { ApplyDstPipe } from './date/applyDst.pipe';
import { DateTimeService } from './date/date.service';
import { DatePickerComponent } from './date/datePicker.component';
import { DateTimePickerComponent } from './date/dateTimePicker.component';
import { ConfirmationDialogComponent } from './dialogs/confirmationDialog.component';
import { ConfirmationDialogService } from './dialogs/confirmationDialog.service';
import { DraggableModalDirective } from './dragndrop/draggableModal.directive';
import { SortableDirective } from './dragndrop/sortable.directive';
import { FileService } from './file/file.service';
import { HistoryBackComponent } from './history/historyBack.component';
import { LanguageService } from './language/language.service';
import { MathJaxDirective } from './math/mathJax.directive';
import { PageFillPipe } from './paginator/pageFill.pipe';
import { PaginatorComponent } from './paginator/paginator.component';
import { DropdownSelectComponent } from './select/dropDownSelect.component';
import { TableSortComponent } from './sorting/tableSort.component';
import { TeacherListComponent } from './user/teacherList.component';
import { UserService } from './user/user.service';
import { UniqueValuesValidatorDirective } from './validation/uniqueValues.directive';
import { WindowRef } from './window/window.service';

@NgModule({
    imports: [CommonModule, TranslateModule, FormsModule, NgbModule],
    exports: [
        CommonModule,
        TranslateModule,
        FormsModule,
        CKEditorComponent,
        DatePickerComponent,
        TruncatingPipe,
        ApplyDstPipe,
        DraggableModalDirective,
        DropdownSelectComponent,
        PageFillPipe,
        SortableDirective,
        HistoryBackComponent,
        TeacherListComponent,
        TableSortComponent,
        PaginatorComponent,
        MathJaxDirective,
        UniqueValuesValidatorDirective,
    ],
    declarations: [
        AttachmentSelectorComponent,
        CKEditorComponent,
        ConfirmationDialogComponent,
        DatePickerComponent,
        DateTimePickerComponent,
        HistoryBackComponent,
        PaginatorComponent,
        DraggableModalDirective,
        DropdownSelectComponent,
        MathJaxDirective,
        SortableDirective,
        TableSortComponent,
        TeacherListComponent,
        TruncatingPipe,
        PageFillPipe,
        ApplyDstPipe,
        UniqueValuesValidatorDirective,
    ],
    entryComponents: [
        AttachmentSelectorComponent,
        ConfirmationDialogComponent,
        DatePickerComponent,
        DateTimePickerComponent,
        HistoryBackComponent,
        PaginatorComponent,
        TeacherListComponent,
        TableSortComponent,
    ],
    providers: [
        AttachmentService,
        ConfirmationDialogService,
        DateTimeService,
        FileService,
        LanguageService,
        UserService,
        WindowRef,
    ],
})
export class UtilityModule {}

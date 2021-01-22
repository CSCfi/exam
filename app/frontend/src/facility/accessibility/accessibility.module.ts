import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { AccessibilityComponent } from './accessibility.component';
import { AccessibilitySelectorComponent } from './accessibilitySelector.component';

@NgModule({
    entryComponents: [AccessibilityComponent, AccessibilitySelectorComponent],
    imports: [NgbModule, TranslateModule, CommonModule, FormsModule],
    declarations: [AccessibilityComponent, AccessibilitySelectorComponent],
    exports: [AccessibilityComponent, AccessibilitySelectorComponent],
})
export class AccessibilityModule {}

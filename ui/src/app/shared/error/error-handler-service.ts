import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';

export interface AppError {
    code: string;
    message: string;
    context?: string;
    originalError?: unknown;
}

@Injectable({ providedIn: 'root' })
export class ErrorHandlingService {
    constructor(
        private toast: ToastrService,
        private translate: TranslateService,
    ) {}

    handle(error: unknown, context: string): Observable<never> {
        // Log error
        console.error(`Error in ${context}:`, error);

        // Show user-friendly message
        this.toast.error(this.getUserFriendlyMessage(error));

        // Return consistent error
        return throwError(() => this.normalizeError(error, context));
    }

    private getUserFriendlyMessage(error: unknown): string {
        if (error instanceof HttpErrorResponse) {
            return this.translate.instant(error.error?.message || error.message || 'An HTTP error occurred');
        }
        if (error instanceof Error) {
            return this.translate.instant(error.message);
        }
        if (typeof error === 'string') {
            return this.translate.instant(error);
        }
        return 'An unexpected error occurred';
    }

    private normalizeError(error: unknown, context: string): AppError {
        return {
            code: this.getErrorCode(error),
            message: this.getUserFriendlyMessage(error),
            context,
            originalError: error,
        };
    }

    private getErrorCode(error: unknown): string {
        if (error instanceof HttpErrorResponse) {
            return `HTTP_${error.status}`;
        }
        if (error instanceof Error) {
            return error.name;
        }
        return 'UNKNOWN_ERROR';
    }
}

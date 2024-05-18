// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl;

import com.google.inject.ImplementedBy;
import models.Exam;

@FunctionalInterface
@ImplementedBy(AutoEvaluationHandlerImpl.class)
public interface AutoEvaluationHandler {
    void autoEvaluate(Exam exam);
}

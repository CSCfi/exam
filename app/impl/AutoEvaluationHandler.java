package impl;

import com.google.inject.ImplementedBy;
import models.Exam;

@FunctionalInterface
@ImplementedBy(AutoEvaluationHandlerImpl.class)
public interface AutoEvaluationHandler {
    void autoEvaluate(Exam exam);

}

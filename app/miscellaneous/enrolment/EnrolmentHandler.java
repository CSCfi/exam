// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.enrolment;

import com.google.inject.ImplementedBy;
import models.exam.Exam;
import models.user.User;

@FunctionalInterface
@ImplementedBy(EnrolmentHandlerImpl.class)
public interface EnrolmentHandler {
    boolean isAllowedToParticipate(Exam exam, User user);
}

// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl;

import com.google.inject.ImplementedBy;
import java.io.IOException;
import java.util.Collection;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import models.Course;
import models.User;

@ImplementedBy(ExternalCourseHandlerImpl.class)
public interface ExternalCourseHandler {
    CompletionStage<Set<Course>> getCoursesByCode(User user, String code) throws IOException;
    CompletionStage<Collection<String>> getPermittedCourses(User user) throws IOException;
}

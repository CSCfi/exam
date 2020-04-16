/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package backend.impl;

import backend.models.AutoEvaluationConfig;
import backend.models.Exam;
import backend.models.Role;
import backend.models.User;
import com.google.inject.ImplementedBy;
import java.util.Optional;
import play.mvc.Http;
import play.mvc.Result;

@ImplementedBy(ExamUpdaterImpl.class)
public interface ExamUpdater {
  Optional<Result> updateTemporalFieldsAndValidate(Exam exam, User user, Http.Request request);
  Optional<Result> updateStateAndValidate(Exam exam, User user, Http.Request request);
  boolean isPermittedToUpdate(Exam exam, User user);
  boolean isAllowedToUpdate(Exam exam, User user);
  boolean isAllowedToRemove(Exam exam);
  void update(Exam exam, Http.Request request, Role.Name loginRole);
  void updateAutoEvaluationConfig(Exam exam, AutoEvaluationConfig newConfig);
  Optional<Result> updateLanguage(Exam exam, String code, User user);
  void preparePreview(Exam exam);
}

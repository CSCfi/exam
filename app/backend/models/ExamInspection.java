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

package backend.models;

import backend.models.base.GeneratedIdentityModel;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Entity
public class ExamInspection extends GeneratedIdentityModel {
  @ManyToOne
  @JsonBackReference
  private Exam exam;

  @ManyToOne
  @JsonManagedReference
  private User user;

  @OneToOne
  private User assignedBy;

  @OneToOne
  @JsonBackReference
  private Comment comment;

  private boolean ready;

  public boolean isReady() {
    return ready;
  }

  public void setReady(boolean ready) {
    this.ready = ready;
  }

  public Exam getExam() {
    return exam;
  }

  public User getUser() {
    return user;
  }

  public User getAssignedBy() {
    return assignedBy;
  }

  public void setExam(Exam exam) {
    this.exam = exam;
  }

  public void setUser(User user) {
    this.user = user;
  }

  public void setAssignedBy(User user) {
    this.assignedBy = user;
  }

  public Comment getComment() {
    return comment;
  }

  public void setComment(Comment comment) {
    this.comment = comment;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) return true;
    if (!(other instanceof ExamInspection)) {
      return false;
    }
    ExamInspection otherInspection = (ExamInspection) other;
    return new EqualsBuilder().append(id, otherInspection.id).build();
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder().append(id).build();
  }
}

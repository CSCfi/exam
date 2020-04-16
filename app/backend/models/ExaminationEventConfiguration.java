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
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.Set;
import javax.persistence.Entity;
import javax.persistence.JoinColumn;
import javax.persistence.Lob;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.Transient;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Entity
public class ExaminationEventConfiguration extends GeneratedIdentityModel {
  @ManyToOne
  @JoinColumn(name = "exam_id")
  @JsonBackReference
  private Exam exam;

  @ManyToOne
  @JoinColumn(name = "examination_event_id")
  @JsonBackReference
  private ExaminationEvent examinationEvent;

  @OneToMany(mappedBy = "examinationEventConfiguration")
  @JsonBackReference
  private Set<ExamEnrolment> examEnrolments;

  @Lob
  @JsonIgnore
  private byte[] encryptedSettingsPassword;

  @JsonIgnore
  private String settingsPasswordSalt;

  @JsonIgnore
  private String configKey;

  @JsonIgnore
  private String hash;

  @Transient
  private String settingsPassword;

  public Exam getExam() {
    return exam;
  }

  public void setExam(Exam exam) {
    this.exam = exam;
  }

  public ExaminationEvent getExaminationEvent() {
    return examinationEvent;
  }

  public void setExaminationEvent(ExaminationEvent examinationEvent) {
    this.examinationEvent = examinationEvent;
  }

  public Set<ExamEnrolment> getExamEnrolments() {
    return examEnrolments;
  }

  public void setExamEnrolments(Set<ExamEnrolment> examEnrolments) {
    this.examEnrolments = examEnrolments;
  }

  public byte[] getEncryptedSettingsPassword() {
    return encryptedSettingsPassword;
  }

  public void setEncryptedSettingsPassword(byte[] encryptedSettingsPassword) {
    this.encryptedSettingsPassword = encryptedSettingsPassword;
  }

  public String getSettingsPasswordSalt() {
    return settingsPasswordSalt;
  }

  public void setSettingsPasswordSalt(String settingsPasswordSalt) {
    this.settingsPasswordSalt = settingsPasswordSalt;
  }

  public String getConfigKey() {
    return configKey;
  }

  public void setConfigKey(String configKey) {
    this.configKey = configKey;
  }

  public String getHash() {
    return hash;
  }

  public void setHash(String hash) {
    this.hash = hash;
  }

  public String getSettingsPassword() {
    return settingsPassword;
  }

  public void setSettingsPassword(String settingsPassword) {
    this.settingsPassword = settingsPassword;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;

    if (!(o instanceof ExaminationEventConfiguration)) return false;

    ExaminationEventConfiguration that = (ExaminationEventConfiguration) o;

    return new EqualsBuilder().append(exam, that.exam).append(examinationEvent, that.examinationEvent).isEquals();
  }

  @Override
  public int hashCode() {
    return new HashCodeBuilder(17, 37).append(exam).append(examinationEvent).toHashCode();
  }
}

package builders;

import models.Exam;
import org.joda.time.DateTime;

import java.util.Date;

/**
 * Created by mlupari on 14/01/15.
 */
public class ExamBuilder {

    private Exam exam = new Exam();

    private ExamBuilder() {
        exam.setDuration(45);
        exam.setEnrollInstruction("enroll like this");
        exam.setExamActiveEndDate(DateTime.now().plusWeeks(1).toDate());
        exam.setExamActiveStartDate(new Date());
        exam.setInstruction("do like this");
        exam.setName("Exam");
        exam.setState(Exam.State.SAVED);
    }

    public static ExamBuilder get() {
        return new ExamBuilder();
    }

    public Exam build() {
        return exam;
    }

    public ExamBuilder withId(Long id) {
        exam.setId(id);
        return this;
    }

    public ExamBuilder withAnswerLanguage(String language) {
        exam.setAnswerLanguage(language);
        return this;
    }

    public ExamBuilder withDuration(Integer duration) {
        exam.setDuration(duration);
        return this;
    }

    public ExamBuilder withEnrollInstruction(String instruction) {
        exam.setEnrollInstruction(instruction);
        return this;
    }

    public ExamBuilder withActiveStartDate(Date date) {
        exam.setExamActiveStartDate(date);
        return this;
    }

    public ExamBuilder withActiveEndDate(Date date) {
        exam.setExamActiveEndDate(date);
        return this;
    }

    public ExamBuilder withInstruction(String instruction) {
        exam.setInstruction(instruction);
        return this;
    }

    public ExamBuilder withName(String name) {
        exam.setName(name);
        return this;
    }

    public ExamBuilder withState(Exam.State state) {
        exam.setState(state);
        return this;
    }

}

package models.questions;


public interface Scorable {

    Double getAssessedScore();
    Double getMaxAssessedScore();
    boolean isRejected();
    boolean isApproved();
    String validate();

}

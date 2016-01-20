package models.questions;


public interface Scorable {

    double getAssessedScore();
    double getMaxAssessedScore();
    boolean isRejected();
    boolean isApproved();

}

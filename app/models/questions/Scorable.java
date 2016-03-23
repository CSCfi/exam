package models.questions;


interface Scorable {

    Double getAssessedScore();
    Double getMaxAssessedScore();
    boolean isRejected();
    boolean isApproved();
    String getValidationResult();

}

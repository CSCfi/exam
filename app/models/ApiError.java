package models;

/**
 *  Model to easily return JSend like error messages as JSON
 *  @see <a href="http://labs.omniti.com/labs/jsend">JSend</a>
 */
public class ApiError {
    private static final String STATUS = "error";

    private String message;

    public ApiError(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStatus() {
        return STATUS;
    }
}

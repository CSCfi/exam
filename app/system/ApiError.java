package system;

/**
 *  Model to easily return JSend like error messages as JSON
 *  @see <a href="http://labs.omniti.com/labs/jsend">JSend</a>
 */
class ApiError {
    private static final String STATUS = "error";

    private String message;

    ApiError(String message) {
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

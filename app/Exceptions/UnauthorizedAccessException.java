package Exceptions;

public class UnauthorizedAccessException extends SitnetException {
    public UnauthorizedAccessException() {
    }

    public UnauthorizedAccessException(String message) {
        super(message);
    }
}

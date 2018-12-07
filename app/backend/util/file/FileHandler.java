package backend.util.file;

import java.io.File;

import com.google.inject.ImplementedBy;
import play.mvc.Http;

@ImplementedBy(FileHandlerImpl.class)
public interface FileHandler {
    byte[] read(File file);
    String encode(File file);
    void setContentType(File file, Http.Response response);
}

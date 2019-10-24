package backend.util.file;

import java.io.File;

import com.google.inject.ImplementedBy;

@ImplementedBy(FileHandlerImpl.class)
public interface FileHandler {
    byte[] read(File file);
    String read(String path);
    String encode(File file);
    String getContentDisposition(File file);
}

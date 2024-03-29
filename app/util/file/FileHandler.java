package util.file;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import models.Attachment;
import models.api.AttachmentContainer;
import play.libs.Files;
import play.mvc.Http;

public interface FileHandler {
    byte[] read(File file);
    String read(String path);
    String encodeAndDelete(File file);
    String getContentDisposition(File file);
    String createFilePath(String... pathParams);
    String getAttachmentPath();
    void removeAttachmentFile(String filePath);
    void removePrevious(AttachmentContainer container);
    Attachment createNew(Http.MultipartFormData.FilePart<?> file, String path);
    Attachment createNew(String fileName, String contentType, String path);
    void copyFile(Files.TemporaryFile sourceFile, File destFile) throws IOException;
    void copyFile(Path sourceFile, File destFile) throws IOException;
}

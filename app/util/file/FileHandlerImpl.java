package util.file;

import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.file.FileSystems;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.UUID;
import javax.inject.Inject;
import javax.validation.constraints.NotNull;
import models.Attachment;
import models.api.AttachmentContainer;
import play.Environment;
import play.Logger;
import play.libs.Files;
import play.mvc.Http;

public class FileHandlerImpl implements FileHandler {

    private static final int KB = 1024;
    private static final Logger.ALogger logger = Logger.of(FileHandlerImpl.class);

    private Environment environment;

    @Inject
    public FileHandlerImpl(Environment environment) {
        this.environment = environment;
    }

    @Override
    public byte[] read(File file) {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (InputStream fis = new FileInputStream(file)) {
            byte[] buf = new byte[KB];
            for (int readNum; (readNum = fis.read(buf)) != -1;) {
                bos.write(buf, 0, readNum);
            }
        } catch (IOException e) {
            logger.error("Failed to read file {} from disk!", file.getAbsolutePath());
            throw new RuntimeException(e);
        }
        return bos.toByteArray();
    }

    @Override
    public String read(String path) {
        byte[] encoded;
        try {
            encoded = java.nio.file.Files.readAllBytes(Paths.get(path));
        } catch (IOException e) {
            logger.error("Failed to read file {} from disk!", path);
            throw new RuntimeException(e);
        }
        return new String(encoded, Charset.defaultCharset());
    }

    @Override
    public String getContentDisposition(File file) {
        return "attachment; filename=\"" + file.getName() + "\"";
    }

    @Override
    public String encodeAndDelete(File file) {
        String content = Base64.getEncoder().encodeToString(read(file));
        if (!file.delete()) {
            logger.warn("Failed to delete temporary file {}", file.getAbsolutePath());
        }
        return content;
    }

    public String createFilePath(String... pathParams) {
        StringBuilder path = new StringBuilder(getAttachmentPath());
        for (String param : pathParams) {
            path.append(File.separator).append(param);
        }

        File dir = new File(path.toString());
        if (dir.mkdirs()) {
            logger.info("Created attachment directory");
        }
        String rndFileName = UUID.randomUUID().toString();
        return path.append(File.separator).append(rndFileName).toString();
    }

    @NotNull
    public String getAttachmentPath() {
        String uploadPath = ConfigFactory.load().getString(("sitnet.attachments.path"));
        StringBuilder path = new StringBuilder();
        // Following does not work on windows, but we hopefully aren't using it anyway :)
        if (!uploadPath.startsWith(File.separator)) {
            // relative path
            path.append(environment.rootPath().getAbsolutePath()).append(File.separator);
        }
        path.append(uploadPath).append(File.separator);
        return path.toString();
    }

    @Override
    public void removeAttachmentFile(String filePath) {
        // Remove physical file upon attachment removal.
        Path path = FileSystems.getDefault().getPath(filePath);
        try {
            if (!java.nio.file.Files.deleteIfExists(path)) {
                logger.error("Could not delete " + path + " because it does not exist.");
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void removePrevious(AttachmentContainer container) {
        if (container.getAttachment() != null) {
            Attachment a = container.getAttachment();
            String filePath = a.getFilePath();
            container.setAttachment(null);
            container.save();
            a.delete();
            // Remove the file from disk if no references to it are found
            boolean removeFromDisk = Ebean.find(Attachment.class).where().eq("filePath", filePath).findList().isEmpty();
            if (removeFromDisk) {
                removeAttachmentFile(a.getFilePath());
            }
        }
    }

    @Override
    public Attachment createNew(Http.MultipartFormData.FilePart<?> file, String path) {
        Attachment attachment = new Attachment();
        attachment.setFileName(file.getFilename());
        attachment.setFilePath(path);
        attachment.setMimeType(file.getContentType());
        attachment.save();
        return attachment;
    }

    @Override
    public void copyFile(Files.TemporaryFile sourceFile, File destFile) throws IOException {
        java.nio.file.Files.copy(
            sourceFile.path(),
            destFile.toPath(),
            StandardCopyOption.REPLACE_EXISTING,
            StandardCopyOption.COPY_ATTRIBUTES
        );
    }
}

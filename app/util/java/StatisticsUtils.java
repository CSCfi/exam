package util.java;

import org.apache.poi.ss.usermodel.*;

import java.io.*;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;

/**
 * Created by Mikko Katajamaki on 10/09/14.
 */
public class StatisticsUtils {

    private static final DateFormat dateFormat = new SimpleDateFormat("dd.MM.yyyy"); // ! java.text
    // format not joda

    public static ByteArrayOutputStream setData(Workbook wb, File file) {

        ByteArrayOutputStream bos = new ByteArrayOutputStream();

        try {
            OutputStream fileOut = new FileOutputStream(file);
            wb.write(fileOut);
            InputStream fis = new FileInputStream(file);

            byte[] buf = new byte[1024];

            for (int readNum; (readNum = fis.read(buf)) != -1; ) {
                bos.write(buf, 0, readNum);
            }

            fis.close();
            fileOut.close();
        } catch (IOException ex) {
            ex.printStackTrace();
        }

        return bos;
    }

    public static void addHeader(Sheet sheet, String[] headers, int row, final int SIZE) {
        Row headerRow = sheet.createRow(row);
        for (int i = 0; i < SIZE; i++) {
            headerRow.createCell(i).setCellValue(headers[i]);

        }
    }

    public static void addCell(Row dataRow, int index, String content) {
        if (content == null) {
            dataRow.createCell(index).setCellValue("");
        } else {
            dataRow.createCell(index).setCellValue(content);
        }
    }

    public static void addDateCell(CellStyle style, Row dataRow, int index, Date date) {
        Cell cell = dataRow.createCell(index);
        if (date == null) {
            cell.setCellValue("");
        } else {
            cell.setCellStyle(style);
            cell.setCellValue(date);
        }


    }

    public static void addDateBetweenCell(Row dataRow, int index, Date from, Date to) {
        if (from == null || to == null) {
            dataRow.createCell(index).setCellValue("");
        } else {
            dataRow.createCell(index).setCellValue(
                    String.format("%s - %s", dateFormat.format(from), dateFormat.format(to)));
        }
    }

    public static void incrementResult(Long id, Map<Long, Integer> map) {
        if (map.get(id) == null) {
            map.put(id, 1);
        } else {
            int i = map.get(id);
            map.put(id, ++i);
        }
    }

    public static int getMapResult(Long id, Map<Long, Integer> map) {
        int i = map.get(id) != null ? map.get(id) : 0;
        return i;
    }

    public static Cell dateCell(Workbook wb, Row row, int index, Date date, String format) {

        if (date == null) {
            row.createCell(index).setCellValue("");
            return null;
        }

        CellStyle style = wb.createCellStyle();
        CreationHelper creationHelper = wb.getCreationHelper();
        style.setDataFormat(creationHelper.createDataFormat().getFormat(format));

        Cell cell = row.createCell(index);
        cell.setCellStyle(style);

        return cell;
    }

}

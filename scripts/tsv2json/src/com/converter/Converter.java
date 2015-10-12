package com.converter;

import javax.swing.UIManager.LookAndFeelInfo;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

public class Converter extends JFrame {

    private static final long serialVersionUID = 4632232403894862215L;

    private JButton buttonOpen;
    private JButton buttonConvert;
    private File tsv = null;
    private File json = null;
    private JLabel outFile;
    private JLabel inFile;

    public Converter() {
        super("TSV-to-JSON");
        this.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        Container container = this.getContentPane();
        GridLayout layout = new GridLayout(2, 2);
        container.setLayout(layout);
        container.setPreferredSize(new Dimension(250, 80));

        buttonOpen = new JButton("Open");
        buttonOpen.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {
                tsv = FileSystem.getFilePath();
                inFile.setText(tsv.getAbsolutePath());
            }
        });

        buttonConvert = new JButton("Convert");
        buttonConvert.addActionListener(new ActionListener() {
            public void actionPerformed(ActionEvent e) {

                json = FileSystem.setFilePath(tsv.getAbsolutePath().replace("tsv", "json"));
                outFile.setText(json.getAbsolutePath());
                try {
                    parse(tsv, json);
                    outFile.setText("Done: " + json.getName());
                    editFile(json);
                    openFile(json);

                } catch (Exception e1) {
                    outFile.setText(e1.getMessage());
                    e1.printStackTrace();
                }
            }
        });

        container.add(buttonOpen);

        inFile = new JLabel("");
        container.add(inFile);

        container.add(buttonConvert);
        outFile = new JLabel("");
        container.add(outFile);

        this.pack();
        this.setVisible(true);
    }

    public static boolean parse(File cvs, File json) throws Exception {

        FileWriter fw = null;
        BufferedWriter bw = null;
        String line = null;
        FileReader fileReader = null;
        BufferedReader br;


        try {
            fw = new FileWriter(json.getAbsoluteFile());
            fileReader = new FileReader(cvs);
            br = new BufferedReader(fileReader);
            bw = new BufferedWriter(fw);

            bw.write("{");
            bw.write("\n");

            line = br.readLine().trim();

            while (true) {

                line = line.replace("\"", "");
                String[] asd = line.split("\\\t");

                line = br.readLine();

                if (asd.length >= 2) {
                    String json_line = "    " + "\"" + asd[0] + "\": \"" + asd[1].trim() + "\"" + (line != null ? "," : "");
                    bw.write(json_line);
                    bw.write("\n");
                }

                if (line == null)
                    break;
            }

            bw.write("}");

            fileReader.close();
            bw.close();
            br.close();
            fw.close();

        } catch (FileNotFoundException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }

        return true;
    }

    public static void openFile(final File file) {
        try {
            Runtime.getRuntime().exec("edit " + file.getAbsolutePath());
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public boolean editFile(final File file) {
        if (!Desktop.isDesktopSupported()) {
            return false;
        }

        Desktop desktop = Desktop.getDesktop();
        if (!desktop.isSupported(Desktop.Action.EDIT)) {
            return false;
        }

        try {
            desktop.edit(file);
        } catch (IOException e) {
            // Log an error
            return false;
        }

        return true;
    }


    public static void main(String[] args) {
        try {
            // UIManager.setLookAndFeel("com.sun.java.swing.plaf.gtk.GTKLookAndFeel");
            for (LookAndFeelInfo info : UIManager.getInstalledLookAndFeels()) {
                if ("Nimbus".equals(info.getName())) {
                    UIManager.setLookAndFeel(info.getClassName());
                    break;
                }
            }
        } catch (UnsupportedLookAndFeelException e) {
        } catch (ClassNotFoundException e) {
        } catch (InstantiationException e) {
        } catch (IllegalAccessException e) {
        }

        new Converter();

    }

}

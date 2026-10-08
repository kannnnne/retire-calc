package cn.guangzhou.pension;

import java.awt.*;
import java.awt.event.*;
import java.net.URI;
import javax.swing.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;

/** Portable Windows launcher: bundled JVM, loopback server and system browser. */
final class DesktopLauncher {
    private DesktopLauncher() {}
    static void launch() {
        System.setProperty("java.awt.headless","false");
        try {
            var context=(ServletWebServerApplicationContext)new SpringApplicationBuilder(PensionApplication.class)
                .headless(false).run("--server.address=127.0.0.1","--server.port=0");
            String url="http://127.0.0.1:"+context.getWebServer().getPort()+"/";
            SwingUtilities.invokeLater(()->{
                JFrame frame=new JFrame("广州退休账本");
                frame.setDefaultCloseOperation(WindowConstants.DO_NOTHING_ON_CLOSE);
                JPanel panel=new JPanel(new BorderLayout(12,16));panel.setBorder(BorderFactory.createEmptyBorder(22,24,22,24));
                JLabel info=new JLabel("<html><b>退休账本已启动</b><br><br>计算在本机运行，关闭此窗口退出。<br>浏览器关闭后可点击按钮重新打开。</html>");
                JButton open=new JButton("打开计算器");open.addActionListener(e->browse(url));
                panel.add(info,BorderLayout.CENTER);panel.add(open,BorderLayout.SOUTH);frame.setContentPane(panel);
                frame.setSize(390,210);frame.setLocationRelativeTo(null);
                frame.addWindowListener(new WindowAdapter(){@Override public void windowClosing(WindowEvent e){
                    frame.dispose();new Thread(()->{context.close();System.exit(0);},"pension-exit").start();
                }});
                frame.setVisible(true);browse(url);
            });
        } catch(Exception e) {
            JOptionPane.showMessageDialog(null,"启动失败，请检查程序文件是否完整。\n"+e.getClass().getSimpleName(),"退休账本",JOptionPane.ERROR_MESSAGE);
            System.exit(1);
        }
    }
    private static void browse(String url) {
        try { Desktop.getDesktop().browse(URI.create(url)); }
        catch(Exception e) { JOptionPane.showMessageDialog(null,"请在浏览器打开：\n"+url,"打开计算器",JOptionPane.INFORMATION_MESSAGE); }
    }
}

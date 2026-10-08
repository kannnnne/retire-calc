package cn.guangzhou.pension;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class PensionApplication {
    public static void main(String[] args) {
        if(java.util.Arrays.asList(args).contains("--desktop")) DesktopLauncher.launch();
        else SpringApplication.run(PensionApplication.class, args);
    }
    @Bean Clock clock() { return Clock.system(ZoneId.of("Asia/Shanghai")); }
}

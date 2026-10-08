package cn.guangzhou.pension.domain;

import java.math.BigDecimal;
import java.math.MathContext;
import org.springframework.stereotype.Component;

@Component
public class BasicPensionCalculator {
    public static final MathContext MC = MathContext.DECIMAL128;
    public BigDecimal correction(BigDecimal index) {
        return index.compareTo(new BigDecimal("0.6")) < 0 ? index.divide(new BigDecimal("0.6"), MC) : BigDecimal.ONE;
    }
    // basic: 粤府〔2006〕96号第三条，policy/guangdong.json保存出处及生效状态。
    public BigDecimal calculate(BigDecimal base, BigDecimal index, int totalMonths) {
        return base.multiply(correction(index).add(index), MC).divide(new BigDecimal("2"), MC)
                .multiply(BigDecimal.valueOf(totalMonths), MC).divide(new BigDecimal("12"), MC)
                .multiply(new BigDecimal("0.01"), MC);
    }
}

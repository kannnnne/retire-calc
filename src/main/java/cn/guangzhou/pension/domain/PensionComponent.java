package cn.guangzhou.pension.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record PensionComponent(String name, String status, BigDecimal amount, String formula, String policyId) {
    public static PensionComponent known(String name, BigDecimal amount, String formula, String policy) {
        return new PensionComponent(name, "CALCULATED", amount.setScale(2, RoundingMode.HALF_UP), formula, policy);
    }
    public static PensionComponent pending(String name, String reason, String policy) {
        return new PensionComponent(name, "PENDING", null, reason, policy);
    }
}

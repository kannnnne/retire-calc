package cn.guangzhou.pension.domain;

import java.math.BigDecimal;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class PersonalAccountPensionCalculator {
    public PensionComponent calculate(BigDecimal balance, int ageMonths, Map<Integer, Integer> table) {
        if (ageMonths % 12 != 0) return PensionComponent.pending("个人账户养老金",
                "当前官方计发月数规则需要以退休时社会保险经办机构最终核定为准；非整数年龄不自行插值。", "account");
        Integer months = table.get(ageMonths / 12);
        if (months == null) return PensionComponent.pending("个人账户养老金", "退休年龄超出已核验国家计发月数表。", "account");
        return PensionComponent.known("个人账户养老金", balance.divide(BigDecimal.valueOf(months), BasicPensionCalculator.MC),
                balance.toPlainString() + " ÷ " + months + "（计发月数）", "account");
    }
}

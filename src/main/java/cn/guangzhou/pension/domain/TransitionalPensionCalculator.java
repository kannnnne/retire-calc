package cn.guangzhou.pension.domain;

import cn.guangzhou.pension.api.CalculationRequest;
import java.math.BigDecimal;
import java.time.YearMonth;
import org.springframework.stereotype.Component;

@Component
public class TransitionalPensionCalculator {
    public PensionComponent calculate(CalculationRequest input, BigDecimal base) {
        boolean early = !YearMonth.parse(input.firstInsuredMonth()).isAfter(YearMonth.of(1998, 6));
        if (input.historyStatus() == CalculationRequest.HistoryStatus.UNKNOWN)
            return PensionComponent.pending("过渡性养老金", "历史养老保险权益尚未核定，请向社保经办机构查询。", "transition");
        if (early) {
            if (input.pre1998ActualMonths() == null || input.pre1998AverageIndex() == null)
                return PensionComponent.pending("过渡性养老金", "需要1998年6月前经核定实际月数及平均缴费指数；不能从首次参保年月推算。", "transition");
            return component(base, input.pre1998AverageIndex(), input.deemedMonths() + input.pre1998ActualMonths());
        }
        if (input.deemedMonths() > 0) {
            if (input.deemedIndex() == null) return PensionComponent.pending("过渡性养老金", "请查询社保部门核定的视同缴费指数。", "transition");
            return component(base, input.deemedIndex(), input.deemedMonths());
        }
        return PensionComponent.known("过渡性养老金", BigDecimal.ZERO, "1998年7月及以后参保，已确认无视同缴费权益。", "transition");
    }
    private PensionComponent component(BigDecimal base, BigDecimal index, int months) {
        BigDecimal amount = base.multiply(index, BasicPensionCalculator.MC).multiply(BigDecimal.valueOf(months), BasicPensionCalculator.MC)
                .divide(BigDecimal.valueOf(12), BasicPensionCalculator.MC).multiply(new BigDecimal("0.012"), BasicPensionCalculator.MC);
        return PensionComponent.known("过渡性养老金", amount, base.toPlainString() + " × " + index.toPlainString() + " × " + months + " ÷ 12 × 1.2%", "transition");
    }
}

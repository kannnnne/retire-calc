package cn.guangzhou.pension.domain;

import cn.guangzhou.pension.api.CalculationRequest;
import cn.guangzhou.pension.policy.PensionPolicyService;
import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class RetirementCalculator {
    public record Result(String calculationMode, String calculatedAt, String policyVersion, CalculationRequest input,
                         RetirementAgeCalculator.Retirement retirement, int monthsUntilRetirement, String earliestReceiptIfApproved,
                         int totalContributionMonths, int minimumContributionMonths, int missingContributionMonths,
                         boolean contributionSatisfied, boolean historicalMonthsUnknown, Integer projectedContributionMonths,
                         PensionPolicyService.BaseSnapshot base, List<PensionComponent> components, BigDecimal monthlyTotal,
                         List<String> warnings, List<PensionPolicyService.Policy> policies) {}
    private final RetirementAgeCalculator age;
    private final ContributionYearCalculator contribution;
    private final BasicPensionCalculator basic;
    private final PersonalAccountPensionCalculator personal;
    private final TransitionalPensionCalculator transition;
    private final PensionPolicyService policy;
    private final Clock clock;
    public RetirementCalculator(RetirementAgeCalculator age, ContributionYearCalculator contribution, BasicPensionCalculator basic,
            PersonalAccountPensionCalculator personal, TransitionalPensionCalculator transition, PensionPolicyService policy, Clock clock) {
        this.age=age; this.contribution=contribution; this.basic=basic; this.personal=personal; this.transition=transition; this.policy=policy; this.clock=clock;
    }
    public Result calculate(CalculationRequest r) {
        YearMonth now = YearMonth.now(clock), birth = YearMonth.parse(r.birthMonth()), first = YearMonth.parse(r.firstInsuredMonth()), asOf = YearMonth.parse(r.dataAsOf());
        if (birth.getYear() < 1900 || birth.isAfter(now)) fail("出生年月不在支持范围内");
        if (!first.isAfter(birth) || first.isAfter(asOf)) fail("首次参保年月必须晚于出生年月且不晚于权益截至年月");
        if (asOf.isAfter(now) || asOf.isBefore(birth)) fail("权益截至年月不能在未来或早于出生年月");
        if (r.actualContributionMonths() > ChronoUnit.MONTHS.between(first, asOf) + 1) fail("实际缴费月数超过首次参保至权益截至年月的可用月份");
        if (r.deemedMonths() > ChronoUnit.MONTHS.between(birth, first)) fail("视同缴费月数与出生/参保时间不一致");
        if (r.historyStatus() != CalculationRequest.HistoryStatus.CONFIRMED && r.deemedMonths() != 0) fail("未核定视同权益时，请勿填写猜测的视同月数");
        if (r.historyStatus() == CalculationRequest.HistoryStatus.NONE && (r.deemedIndex() != null || r.pre1998AverageIndex() != null || (r.pre1998ActualMonths() != null && r.pre1998ActualMonths() > 0))) fail("无历史权益与已填历史数据矛盾，请选择已核定");
        boolean early = !first.isAfter(YearMonth.of(1998,6));
        if (!early && (r.pre1998AverageIndex() != null || (r.pre1998ActualMonths() != null && r.pre1998ActualMonths() > 0))) fail("首次参保在1998年7月以后，不能填写此前实际参保缴费");
        if (r.pre1998ActualMonths() != null && (r.pre1998ActualMonths() > r.actualContributionMonths()
                || (early && r.pre1998ActualMonths() > ChronoUnit.MONTHS.between(first, YearMonth.of(1998,6)) + 1))) fail("1998年前实际缴费月数超出累计实际缴费或历史时间范围");
        var retirement = age.calculate(birth, r.category());
        if (retirement.month().getYear() < 2026 || retirement.month().getYear() > 2200) fail("MVP支持法定退休年月在2026—2200年范围内的普通人员");
        if (asOf.isAfter(retirement.month())) fail("权益截至年月不能晚于本次法定退休年月；已退休待遇调整不在MVP范围内");
        var base = policy.select(retirement.month().getYear(), r.baseMode(), r.assumedBase());
        int total = r.actualContributionMonths() + r.deemedMonths();
        if (total > ChronoUnit.MONTHS.between(birth, asOf) + 1) fail("总缴费月数超过可用生存月份");
        int min = contribution.minimumMonths(retirement.month().getYear());
        boolean unknown = r.historyStatus() == CalculationRequest.HistoryStatus.UNKNOWN;
        List<String> warnings = new ArrayList<>();
        warnings.add("此结果仅用于测算，不代表社保部门最终核定待遇。");
        warnings.add(base.message());
        warnings.add("使用权益截至" + asOf + "已提供的缴费月数、余额等数据，未预测未来缴费、账户利息或年度基数增长。");
        if (total < min || unknown) warnings.add("尚不能确认达到缴费条件；分项金额只是静态公式演示，不能作为可领取待遇。");
        if (early) warnings.add("1998年前参保需要经核定历史权益；不知道时请向社保经办机构查询。");
        if (r.averageIndex() == null) warnings.add("尚未填写本人平均缴费指数：已计算退休时间和缴费要求，基础养老金及合计需补充指数后再算。无需猜填0.6或1.0。");
        PensionComponent b = unknown ? PensionComponent.pending("基础养老金", "视同年限尚不确定，完整累计月数和平均指数需核定。", "basic")
                : r.averageIndex() == null ? PensionComponent.pending("基础养老金", "尚未提供本人平均缴费指数。先查看个人权益记录；如未显示，可向社保经办机构咨询该项数据。", "basic")
                : PensionComponent.known("基础养老金", basic.calculate(base.value(), r.averageIndex(), total),
                        base.value().toPlainString() + " × (" + basic.correction(r.averageIndex()).stripTrailingZeros().toPlainString() + " + "
                                + r.averageIndex().toPlainString() + ") ÷ 2 × " + total + " ÷ 12 × 1%", "basic");
        List<PensionComponent> parts = List.of(b, personal.calculate(r.accountBalance(), retirement.ageMonths(), policy.catalog().accountMonths()), transition.calculate(r, base.value()));
        BigDecimal sum = parts.stream().anyMatch(p -> p.amount() == null) ? null : parts.stream().map(PensionComponent::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        String receipt = !unknown && total >= min ? retirement.month().plusMonths(1).toString() : null;
        return new Result("STATIC_RIGHTS", LocalDate.now(clock).toString(), policy.catalog().version(), r, retirement,
                (int)Math.max(0, ChronoUnit.MONTHS.between(now, retirement.month())), receipt, total, min, Math.max(0,min-total),
                !unknown && total>=min, unknown, null, base, parts, sum, List.copyOf(warnings), policy.catalog().policies());
    }
    private void fail(String message) { throw new IllegalArgumentException(message); }
}

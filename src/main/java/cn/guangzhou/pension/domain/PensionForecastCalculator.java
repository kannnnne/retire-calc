package cn.guangzhou.pension.domain;

import cn.guangzhou.pension.api.ForecastRequest;
import cn.guangzhou.pension.api.CalculationRequest;
import cn.guangzhou.pension.policy.PensionPolicyService;
import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;

/** Constant-price scenario, not an official award or a future wage forecast. */
@Service
public class PensionForecastCalculator {
    private static final BigDecimal MINIMUM = new BigDecimal("5510"), MIN_INDEX = new BigDecimal("0.6");
    private final RetirementAgeCalculator ages;
    private final ContributionYearCalculator years;
    private final BasicPensionCalculator basic;
    private final PensionPolicyService policy;
    private final Clock clock;
    public PensionForecastCalculator(RetirementAgeCalculator ages, ContributionYearCalculator years,
        BasicPensionCalculator basic, PensionPolicyService policy, Clock clock) {
        this.ages=ages; this.years=years; this.basic=basic; this.policy=policy; this.clock=clock;
    }
    public record Scenario(ForecastRequest.Plan plan, YearMonth receiptMonth, YearMonth lastPaymentMonth,
        int futureMonths, int totalMonths, int minimumMonths, BigDecimal monthlyBase,
        BigDecimal index, BigDecimal account, BigDecimal basic, BigDecimal personalLow,
        BigDecimal personalHigh, BigDecimal totalLow, BigDecimal totalHigh, boolean divisorRange,
        boolean qualified, int shortMonths, BigDecimal monthlyPersonalPayment, BigDecimal futurePersonalCost,
        BigDecimal futureAccountCredit, Integer recoveryMonthsFast, Integer recoveryMonthsSlow,
        BigDecimal incrementalLow, BigDecimal incrementalHigh, Integer incrementalRecoveryFast,
        Integer incrementalRecoverySlow) {}
    public record Result(RetirementAgeCalculator.Retirement retirement, ForecastRequest.Plan selected,
        List<Scenario> scenarios, List<String> assumptions, PensionPolicyService.BaseSnapshot pensionBase,
        ForecastRequest.ContributionType contributionType, int pauseMonths) {}
    private BigDecimal round(BigDecimal n) { return n.setScale(2,RoundingMode.HALF_UP); }
    private YearMonth parse(String text) {
        try { return YearMonth.parse(text); }
        catch (java.time.format.DateTimeParseException e) { throw new IllegalArgumentException("月份应为有效的YYYY-MM年月"); }
    }
    private Integer recover(BigDecimal cost, BigDecimal monthly) {
        return monthly==null || monthly.signum()<=0 ? null : cost.divide(monthly,0,RoundingMode.CEILING).intValueExact();
    }
    public Result calculate(ForecastRequest r) {
        var birth=parse(r.birthMonth()); var first=parse(r.firstInsuredMonth());
        var asof=parse(r.dataAsOf()); var retirement=ages.calculate(birth,r.category());
        if (birth.isAfter(first) || first.isAfter(asof) || asof.isAfter(YearMonth.now(clock))
            || asof.isAfter(retirement.month()) || r.paidMonths()>ChronoUnit.MONTHS.between(first,asof)+1)
            throw new IllegalArgumentException("请检查出生、首次参保、截至月份与实际缴费月数");
        if (first.isBefore(YearMonth.of(1998,7))) throw new IllegalArgumentException("1998年7月前参保可能涉及历史待遇，请使用历史权益核算；简易预测暂不适用");
        if (retirement.month().getYear()>2200) throw new IllegalArgumentException("出生年月超出支持范围");
        var snapshot=policy.select(retirement.month().getYear(),CalculationRequest.BaseMode.LATEST_OFFICIAL,null);
        BigDecimal current=r.currentBase()==null?MINIMUM:r.currentBase();
        BigDecimal historic=r.historicalIndex()==null?MIN_INDEX:r.historicalIndex();
        var type=r.contributionType()==null?ForecastRequest.ContributionType.FLEXIBLE:r.contributionType();
        int pause=r.pauseMonths()==null?0:r.pauseMonths();
        BigDecimal paymentRate=new BigDecimal(type==ForecastRequest.ContributionType.FLEXIBLE?"0.20":"0.08");
        BigDecimal startingAccount=r.principal().add(r.interest()==null?BigDecimal.ZERO:r.interest());
        List<Scenario> results=new ArrayList<>();
        for (var plan:ForecastRequest.Plan.values()) {
            BigDecimal base=plan==ForecastRequest.Plan.CURRENT || plan==ForecastRequest.Plan.CUSTOM?current:MINIMUM;
            // Proxy preserves the known minimum 0.6 ratio; it is not a historical official index.
            BigDecimal futureIndex=MIN_INDEX.multiply(base).divide(MINIMUM,BasicPensionCalculator.MC);
            int target=years.minimumMonths(retirement.month().getYear());
            int gap=Math.max(0,target-r.paidMonths());
            int until=Math.max(0,(int)ChronoUnit.MONTHS.between(asof,retirement.month())-pause);
            int future=plan==ForecastRequest.Plan.CUSTOM?(r.customMonths()==null?60:r.customMonths()):
                plan==ForecastRequest.Plan.MINIMUM_STOP?gap:Math.max(until,gap);
            int total=r.paidMonths()+future;
            YearMonth last=future==0?asof:asof.plusMonths(pause+future);
            YearMonth eligible=last.isAfter(retirement.month())?last:retirement.month();
            int age=(int)ChronoUnit.MONTHS.between(birth,eligible);
            int lowerAge=age/12, upperAge=(age+11)/12;
            if(lowerAge<40 || upperAge>70) throw new IllegalArgumentException("领取年龄超出40—70岁计发月数表，暂不支持此情景");
            BigDecimal index=total==0?historic:historic.multiply(BigDecimal.valueOf(r.paidMonths())).add(futureIndex.multiply(BigDecimal.valueOf(future)))
                .divide(BigDecimal.valueOf(total),BasicPensionCalculator.MC);
            BigDecimal credit=base.multiply(new BigDecimal("0.08")).multiply(BigDecimal.valueOf(future));
            BigDecimal account=startingAccount.add(credit);
            BigDecimal b=basic.calculate(snapshot.value(),index,total);
            BigDecimal low=account.divide(BigDecimal.valueOf(policy.catalog().accountMonths().get(lowerAge)),BasicPensionCalculator.MC);
            BigDecimal high=account.divide(BigDecimal.valueOf(policy.catalog().accountMonths().get(upperAge)),BasicPensionCalculator.MC);
            boolean qualified=total>=target;
            BigDecimal monthlyPayment=future==0?BigDecimal.ZERO:base.multiply(paymentRate), cost=monthlyPayment.multiply(BigDecimal.valueOf(future));
            BigDecimal totalLow=qualified?b.add(low):null, totalHigh=qualified?b.add(high):null;
            BigDecimal incrementalLow=null,incrementalHigh=null;
            // Only compare to a legally qualified no-further-payment baseline, at the same receipt age.
            if(qualified && r.paidMonths()>=target) {
                BigDecimal baseBasic=basic.calculate(snapshot.value(),historic,r.paidMonths());
                incrementalLow=b.subtract(baseBasic).add(credit.divide(BigDecimal.valueOf(policy.catalog().accountMonths().get(lowerAge)),BasicPensionCalculator.MC));
                incrementalHigh=b.subtract(baseBasic).add(credit.divide(BigDecimal.valueOf(policy.catalog().accountMonths().get(upperAge)),BasicPensionCalculator.MC));
            }
            results.add(new Scenario(plan,qualified?eligible.plusMonths(1):null,last,future,total,target,base,index,round(account),round(b),round(low),round(high),
                totalLow==null?null:round(totalLow),totalHigh==null?null:round(totalHigh),lowerAge!=upperAge,qualified,Math.max(0,target-total),
                round(monthlyPayment),round(cost),round(credit),recover(cost,totalHigh),recover(cost,totalLow),
                incrementalLow==null?null:round(incrementalLow),incrementalHigh==null?null:round(incrementalHigh),recover(cost,incrementalHigh),recover(cost,incrementalLow)));
        }
        List<String> assumptions=new ArrayList<>(List.of("按当前价格比较：未来缴费基数、计发基数和工资水平保持不变，未来记账利率按0计算。",
            "计发基数沿用"+snapshot.parameterYear()+"年已录入值"+snapshot.value()+"元；未来官方参数尚未知。",
            "最低档采用已录入广州2025年7月起缴费基数5510元；不是最低工资，未来最低档可能调整。",
            "未来指数以最低档0.6为情景锚点，按缴费基数比例估算，并非社保核定指数。",
            "从权益截至次月起暂停"+pause+"个月后再连续缴费；暂停月份不计年限，不假设允许补缴。",
            "不足年限按法定退休年份门槛模拟延长缴费，实际手续须由社保确认。2030年起最低年限逐步增加，不固定为15年。",
            "灵活就业按20%全额自付，其中基数的8%入个人账户、12%入统筹；单位职工这里只计本人8%，未计单位费用、医保和补贴。",
            "费用回收月数从养老金开始领取后计算：未来自付总额÷每月总养老金。含已有权益，不是续交投资收益或完整养老保险回本。",
            "新增待遇回收只在不续交也满足门槛时比较，使用相同领取年龄参数，不含资金时间价值、领取期间调整、等待退休时间和死亡待遇。",
            "不含视同缴费、1998年前权益及其他特殊历史待遇；停止缴费方案仅作比较，在职缴费义务仍按规定执行。",
            "非整岁领取时使用相邻整岁计发月数给出金额区间，不自行插值；待遇从符合条件次月估计。"));
        assumptions.add(r.historicalIndex()==null?"历史平均缴费指数未知，按0.6估算；可在更多设置中填入核定指数提高准确度。":"历史平均缴费指数采用你的输入。");
        if(r.interest()==null) assumptions.add("账户利息未填写，现有利息按0估算，结果可能偏低。");
        if(r.currentBase()==null) assumptions.add("当前缴费基数未知，继续当前方案暂按最低档5510元估算。");
        return new Result(retirement,r.plan(),results,assumptions,snapshot,type,pause);
    }
}

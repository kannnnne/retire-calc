package cn.guangzhou.pension;

import cn.guangzhou.pension.api.ForecastRequest;
import cn.guangzhou.pension.domain.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
class ForecastTest {
    @Autowired PensionForecastCalculator calculator;
    private ForecastRequest renewal(int paid, int pause, int custom, ForecastRequest.ContributionType type, ForecastRequest.Plan plan) {
        return new ForecastRequest("1985-06",RetirementCategory.MALE,"2005-07","2026-10",paid,
            new BigDecimal("80000"),null,new BigDecimal("5510"),null,plan,type,pause,custom);
    }
    @Test void fiveYearFlexibleRenewalHasFullTwentyPercentCostButOnlyEightPercentCredit() {
        var s=calculator.calculate(renewal(180,0,60,ForecastRequest.ContributionType.FLEXIBLE,ForecastRequest.Plan.MINIMUM_STOP)).scenarios().get(2);
        assertThat(s.monthlyPersonalPayment()).isEqualByComparingTo("1102");
        assertThat(s.futurePersonalCost()).isEqualByComparingTo("66120");
        assertThat(s.futureAccountCredit()).isEqualByComparingTo("26448");
        assertThat(s.account()).isEqualByComparingTo("106448");
        assertThat(s.totalLow()).isEqualByComparingTo("2428.69");
        assertThat(s.recoveryMonthsSlow()).isEqualTo(28);
        assertThat(s.receiptMonth().toString()).isEqualTo("2048-07");
        assertThat(s.incrementalLow()).isNull();
        assertThat(s.incrementalRecoverySlow()).isNull();
    }
    @Test void employeePersonalCostDiffersButPensionRightsDoNot() {
        var flex=calculator.calculate(renewal(180,0,60,ForecastRequest.ContributionType.FLEXIBLE,ForecastRequest.Plan.MINIMUM_STOP)).scenarios().get(2);
        var employee=calculator.calculate(renewal(180,0,60,ForecastRequest.ContributionType.EMPLOYEE,ForecastRequest.Plan.MINIMUM_STOP)).scenarios().get(2);
        assertThat(employee.futurePersonalCost()).isEqualByComparingTo("26448");
        assertThat(employee.totalLow()).isEqualByComparingTo(flex.totalLow());
        assertThat(employee.monthlyPersonalPayment()).isEqualByComparingTo("440.80");
    }
    @Test void pauseDoesNotEarnMonthsAndMovesStopDateOnly() {
        var baseline=calculator.calculate(renewal(180,0,60,ForecastRequest.ContributionType.FLEXIBLE,ForecastRequest.Plan.MINIMUM_STOP));
        var paused=calculator.calculate(renewal(180,12,60,ForecastRequest.ContributionType.FLEXIBLE,ForecastRequest.Plan.MINIMUM_STOP));
        assertThat(paused.scenarios().get(2).futureMonths()).isEqualTo(60);
        assertThat(paused.scenarios().get(2).lastPaymentMonth()).isEqualTo(baseline.scenarios().get(2).lastPaymentMonth().plusMonths(12));
        assertThat(paused.scenarios().get(0).futureMonths()).isEqualTo(baseline.scenarios().get(0).futureMonths()-12);
    }
    @Test void customTooShortCannotClaimPensionOrPayback() {
        var s=calculator.calculate(renewal(121,0,60,ForecastRequest.ContributionType.FLEXIBLE,ForecastRequest.Plan.CUSTOM)).scenarios().get(3);
        assertThat(s.qualified()).isFalse();assertThat(s.shortMonths()).isEqualTo(59);
        assertThat(s.futurePersonalCost()).isEqualByComparingTo("66120");
        assertThat(s.receiptMonth()).isNull();assertThat(s.totalLow()).isNull();assertThat(s.recoveryMonthsSlow()).isNull();
    }
    @Test void incrementalRecoveryUsesOnlyNewRightsWhenBaselineQualified() {
        var s=calculator.calculate(renewal(240,0,60,ForecastRequest.ContributionType.FLEXIBLE,ForecastRequest.Plan.CUSTOM)).scenarios().get(3);
        assertThat(s.incrementalLow()).isEqualByComparingTo("605.77");
        assertThat(s.incrementalRecoverySlow()).isEqualTo(110);
        assertThat(s.recoveryMonthsSlow()).isEqualTo(24);
    }
    @Test void alreadyQualifiedMinimumStopDoesNotChargeNewPayments() {
        var s=calculator.calculate(renewal(240,0,0,ForecastRequest.ContributionType.FLEXIBLE,ForecastRequest.Plan.MINIMUM_STOP)).scenarios().get(2);
        assertThat(s.futureMonths()).isZero();assertThat(s.monthlyPersonalPayment()).isZero();assertThat(s.futurePersonalCost()).isZero();assertThat(s.recoveryMonthsSlow()).isZero();
    }
    private ForecastRequest sample(BigDecimal interest, BigDecimal base, BigDecimal index) {
        return new ForecastRequest("1992-10",RetirementCategory.MALE,"2016-07","2026-09",121,
            new BigDecimal("95000.00"),interest,base,index,ForecastRequest.Plan.CURRENT);
    }
    @Test void projectsSyntheticExampleAndMinimumStop() {
        var r=calculator.calculate(sample(null,null,null));
        assertThat(r.retirement().month().toString()).isEqualTo("2055-10");
        var current=r.scenarios().get(0);var stop=r.scenarios().get(2);
        assertThat(current.futureMonths()).isEqualTo(349);
        assertThat(current.totalMonths()).isEqualTo(470);
        assertThat(current.account()).isEqualByComparingTo("248839.20");
        assertThat(current.basic()).isEqualByComparingTo("2974.47");
        assertThat(current.totalLow()).isEqualByComparingTo("5101.30");
        assertThat(current.receiptMonth().toString()).isEqualTo("2055-11");
        assertThat(stop.futureMonths()).isEqualTo(119);
        assertThat(stop.totalMonths()).isEqualTo(240);
        assertThat(stop.lastPaymentMonth().toString()).isEqualTo("2036-08");
        assertThat(stop.account()).isEqualByComparingTo("147455.20");
        assertThat(stop.totalLow()).isEqualByComparingTo("2779.18");
    }
    @Test void suppliedInterestAddedOnceAndHigherBaseOnlyChangesCurrentPlan() {
        var baseline=calculator.calculate(sample(null,null,null));
        var adjusted=calculator.calculate(sample(new BigDecimal("11700"),new BigDecimal("10000"),new BigDecimal("1")));
        assertThat(adjusted.scenarios().get(0).totalLow()).isGreaterThan(baseline.scenarios().get(0).totalLow());
        assertThat(adjusted.scenarios().get(1).account().subtract(baseline.scenarios().get(1).account())).isEqualByComparingTo("11700");
        assertThat(adjusted.scenarios().get(1).index()).isGreaterThan(new BigDecimal("0.6"));
    }
    @Test void nonIntegerAgeGivesAdjacentOfficialDivisorRange() {
        var r=calculator.calculate(new ForecastRequest("1965-01",RetirementCategory.MALE,"2000-01","2025-01",240,
            new BigDecimal("100000"),null,null,null,ForecastRequest.Plan.MINIMUM));
        var s=r.scenarios().get(0);
        assertThat(s.divisorRange()).isTrue();
        assertThat(s.personalLow()).isEqualByComparingTo("722.60");
        assertThat(s.personalHigh()).isEqualByComparingTo("760.92");
    }
    @Test void insufficientYearsExtendsPaymentsPastRetirement() {
        var r=calculator.calculate(new ForecastRequest("1965-01",RetirementCategory.MALE,"2020-01","2025-01",60,
            new BigDecimal("10000"),null,null,null,ForecastRequest.Plan.MINIMUM));
        assertThat(r.scenarios().get(0).futureMonths()).isEqualTo(120);
        assertThat(r.scenarios().get(0).receiptMonth().toString()).isEqualTo("2035-02");
    }
    @Test void rejectsImpossibleMonthsAndPre1998History() {
        assertThatThrownBy(()->calculator.calculate(new ForecastRequest("1992-10",RetirementCategory.MALE,"2016-07","2026-09",500,
            BigDecimal.ZERO,null,null,null,ForecastRequest.Plan.CURRENT))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->calculator.calculate(new ForecastRequest("1970-01",RetirementCategory.MALE,"1995-01","2026-09",300,
            BigDecimal.ZERO,null,null,null,ForecastRequest.Plan.CURRENT))).hasMessageContaining("历史待遇");
    }
}



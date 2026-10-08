package cn.guangzhou.pension;

import cn.guangzhou.pension.api.CalculationRequest;
import cn.guangzhou.pension.domain.*;
import java.math.*;
import java.time.YearMonth;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import static org.assertj.core.api.Assertions.*;

class CalculatorTest {
    private final RetirementAgeCalculator age = new RetirementAgeCalculator();
    private final BasicPensionCalculator basic = new BasicPensionCalculator();
    private final ContributionYearCalculator contribution = new ContributionYearCalculator();
    @ParameterizedTest @CsvFileSource(resources="/official-retirement.csv", numLinesToSkip=1)
    void matchesEveryOfficialTableRow(RetirementCategory category, String birth, String retirement, int delay) {
        var actual = age.calculate(YearMonth.parse(birth), category);
        assertThat(actual.month()).isEqualTo(YearMonth.parse(retirement));
        assertThat(actual.delayMonths()).isEqualTo(delay);
    }
    @ParameterizedTest @CsvSource({"MALE,1964-12,2024-12,720", "MALE,1977-01,2040-01,756", "MALE,1985-06,2048-06,756", "FEMALE_55,1969-12,2024-12,660", "FEMALE_55,1982-01,2040-01,696", "FEMALE_50,1974-12,2024-12,600", "FEMALE_50,1985-01,2040-01,660"})
    void beforeReformAndAtCaps(RetirementCategory category, String birth, String expected, int months) {
        var result=age.calculate(YearMonth.parse(birth),category);
        assertThat(result.month()).isEqualTo(YearMonth.parse(expected));assertThat(result.ageMonths()).isEqualTo(months);
        assertThat(result.earliestFlexibleMonth().compareTo(YearMonth.parse(birth).plusYears(category.originalAge))).isGreaterThanOrEqualTo(0);
    }
    @ParameterizedTest @CsvSource({"2026,180","2029,180","2030,186","2031,192","2032,198","2033,204","2034,210","2035,216","2036,222","2037,228","2038,234","2039,240","2048,240"})
    void officialMinimumContributionTable(int year,int expected) { assertThat(contribution.minimumMonths(year)).isEqualTo(expected); }
    @ParameterizedTest @CsvSource({"360,0.6,2278.32","420,1.0,3322.55","480,1.5,4746.50","360,0.3,1139.16"})
    void requestedCasesAndLowIndex(int months,String index,String expected) {
        assertThat(basic.calculate(new BigDecimal("9493"),new BigDecimal(index),months).setScale(2,RoundingMode.HALF_UP)).isEqualByComparingTo(expected);
    }
    @Test void correctionBoundaryIsContinuous() {
        assertThat(basic.correction(new BigDecimal("0.6"))).isEqualByComparingTo("1");
        assertThat(basic.correction(new BigDecimal("0.5999"))).isLessThan(BigDecimal.ONE);
        assertThat(basic.calculate(new BigDecimal("9493"),new BigDecimal("0.5999"),360)).isLessThan(basic.calculate(new BigDecimal("9493"),new BigDecimal("0.6"),360));
    }
    @Test void officialJiangmenCaseCrossCheck() {
        BigDecimal b=basic.calculate(new BigDecimal("8682"),new BigDecimal("0.6"),180).setScale(2,RoundingMode.HALF_UP);
        var p=new PersonalAccountPensionCalculator().calculate(new BigDecimal("55600"),720,Map.of(60,139));
        assertThat(b).isEqualByComparingTo("1041.84"); assertThat(p.amount()).isEqualByComparingTo("400.00");
        assertThat(b.add(p.amount())).isEqualByComparingTo("1441.84");
        assertThat(basic.calculate(new BigDecimal("8682"),new BigDecimal("0.6"),240).setScale(2,RoundingMode.HALF_UP)).isEqualByComparingTo("1389.12");
    }
    @ParameterizedTest @CsvSource({"600,195,1000","660,170,1147.06","720,139,1402.88","756,117,1666.67"})
    void personalAccountUsesOfficialAgeTable(int ageMonths,int divisor,String expected) {
        var p=new PersonalAccountPensionCalculator().calculate(new BigDecimal("195000"),ageMonths,Map.of(ageMonths/12,divisor));
        assertThat(p.amount()).isEqualByComparingTo(expected);
    }
    @Test void noInterpolationOrRoundingAge() {
        assertThat(new PersonalAccountPensionCalculator().calculate(new BigDecimal("195000"),723,Map.of(60,139,61,132)).amount()).isNull();
    }
    private CalculationRequest historical(String first,int deemed,Integer actual,String oldIndex,String deemedIndex,CalculationRequest.HistoryStatus status) {
        return new CalculationRequest("1966-09",RetirementCategory.MALE,first,"2026-10",400,new BigDecimal("180000"),BigDecimal.ONE,status,deemed,actual,oldIndex==null?null:new BigDecimal(oldIndex),deemedIndex==null?null:new BigDecimal(deemedIndex),CalculationRequest.BaseMode.LATEST_OFFICIAL,null);
    }
    @Test void pre1998TransitionIncludesBothKindsOfMonths() {
        var p=new TransitionalPensionCalculator().calculate(historical("1990-01",60,96,"1.1",null,CalculationRequest.HistoryStatus.CONFIRMED),new BigDecimal("9493"));
        assertThat(p.amount()).isEqualByComparingTo("1629.00");
    }
    @Test void post1998TransitionOnlyUsesDeemed() {
        var p=new TransitionalPensionCalculator().calculate(historical("1998-07",60,null,null,"1.2",CalculationRequest.HistoryStatus.CONFIRMED),new BigDecimal("9493"));
        assertThat(p.amount()).isEqualByComparingTo("683.50");
    }
    @Test void historyMissingDoesNotSilentlyBecomeZero() {
        var t=new TransitionalPensionCalculator();
        assertThat(t.calculate(historical("1998-06",0,null,null,null,CalculationRequest.HistoryStatus.NONE),new BigDecimal("9493")).amount()).isNull();
        assertThat(t.calculate(historical("2000-01",0,null,null,null,CalculationRequest.HistoryStatus.UNKNOWN),new BigDecimal("9493")).amount()).isNull();
        assertThat(t.calculate(historical("1998-07",0,null,null,null,CalculationRequest.HistoryStatus.NONE),new BigDecimal("9493")).amount()).isEqualByComparingTo("0");
    }
}


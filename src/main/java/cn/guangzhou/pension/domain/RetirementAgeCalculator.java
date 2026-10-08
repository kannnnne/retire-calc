package cn.guangzhou.pension.domain;

import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;

@Component
public class RetirementAgeCalculator {
    public record Retirement(YearMonth month, int ageMonths, int delayMonths, YearMonth earliestFlexibleMonth) {}
    public Retirement calculate(YearMonth birth, RetirementCategory category) {
        long offset = ChronoUnit.MONTHS.between(YearMonth.of(category.startYear, 1), birth);
        int delay = offset < 0 ? 0 : (int) Math.min(category.maximumDelay, offset / category.groupMonths + 1);
        int age = category.originalAge * 12 + delay;
        YearMonth month = birth.plusMonths(age);
        YearMonth earliest = month.minusMonths(36);
        YearMonth original = birth.plusYears(category.originalAge);
        return new Retirement(month, age, delay, earliest.isBefore(original) ? original : earliest);
    }
}

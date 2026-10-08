package cn.guangzhou.pension.domain;

import org.springframework.stereotype.Component;

@Component
public class ContributionYearCalculator {
    public int minimumMonths(int retirementYear) {
        return retirementYear < 2030 ? 180 : 180 + Math.min(10, retirementYear - 2029) * 6;
    }
}

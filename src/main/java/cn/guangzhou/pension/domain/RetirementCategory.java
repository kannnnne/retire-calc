package cn.guangzhou.pension.domain;

public enum RetirementCategory {
    MALE(60, 1965, 4, 36), FEMALE_55(55, 1970, 4, 36), FEMALE_50(50, 1975, 2, 60);
    public final int originalAge, startYear, groupMonths, maximumDelay;
    RetirementCategory(int age, int start, int group, int max) {
        originalAge = age; startYear = start; groupMonths = group; maximumDelay = max;
    }
}

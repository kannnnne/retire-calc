package cn.guangzhou.pension.api;

import cn.guangzhou.pension.domain.RetirementCategory;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record ForecastRequest(
    @NotBlank @Pattern(regexp="\\d{4}-\\d{2}") String birthMonth,
    @NotNull RetirementCategory category,
    @NotBlank @Pattern(regexp="\\d{4}-\\d{2}") String firstInsuredMonth,
    @NotBlank @Pattern(regexp="\\d{4}-\\d{2}") String dataAsOf,
    @NotNull @Min(0) @Max(960) Integer paidMonths,
    @NotNull @DecimalMin("0") @DecimalMax("100000000") @Digits(integer=9,fraction=2) BigDecimal principal,
    @DecimalMin("0") @DecimalMax("100000000") @Digits(integer=9,fraction=2) BigDecimal interest,
    @DecimalMin("5510") @DecimalMax("100000") @Digits(integer=6,fraction=2) BigDecimal currentBase,
    @DecimalMin("0.0001") @DecimalMax("10") @Digits(integer=2,fraction=4) BigDecimal historicalIndex,
    @NotNull Plan plan,
    ContributionType contributionType,
    @Min(0) @Max(480) Integer pauseMonths,
    @Min(0) @Max(960) Integer customMonths) {
    public enum Plan { CURRENT, MINIMUM, MINIMUM_STOP, CUSTOM }
    public enum ContributionType { EMPLOYEE, FLEXIBLE }
    public ForecastRequest(String birthMonth, RetirementCategory category, String firstInsuredMonth, String dataAsOf,
        Integer paidMonths, BigDecimal principal, BigDecimal interest, BigDecimal currentBase,
        BigDecimal historicalIndex, Plan plan) {
        this(birthMonth,category,firstInsuredMonth,dataAsOf,paidMonths,principal,interest,currentBase,historicalIndex,plan,null,null,null);
    }
}

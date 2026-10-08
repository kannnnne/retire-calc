package cn.guangzhou.pension.api;

import cn.guangzhou.pension.domain.RetirementCategory;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CalculationRequest(
        @NotBlank @Pattern(regexp="\\d{4}-(0[1-9]|1[0-2])") String birthMonth,
        @NotNull RetirementCategory category,
        @NotBlank @Pattern(regexp="\\d{4}-(0[1-9]|1[0-2])") String firstInsuredMonth,
        @NotBlank @Pattern(regexp="\\d{4}-(0[1-9]|1[0-2])") String dataAsOf,
        @NotNull @Min(0) @Max(960) Integer actualContributionMonths,
        @NotNull @DecimalMin("0") @DecimalMax("100000000") @Digits(integer=9, fraction=2) BigDecimal accountBalance,
        @DecimalMin("0.0001") @DecimalMax("10") @Digits(integer=2, fraction=4) BigDecimal averageIndex,
        @NotNull HistoryStatus historyStatus,
        @NotNull @Min(0) @Max(720) Integer deemedMonths,
        @Min(0) @Max(720) Integer pre1998ActualMonths,
        @DecimalMin("0.0001") @DecimalMax("10") @Digits(integer=2, fraction=4) BigDecimal pre1998AverageIndex,
        @DecimalMin("0.0001") @DecimalMax("10") @Digits(integer=2, fraction=4) BigDecimal deemedIndex,
        @NotNull BaseMode baseMode,
        @DecimalMin("1") @DecimalMax("1000000") @Digits(integer=7, fraction=2) BigDecimal assumedBase
) {
    public enum HistoryStatus { NONE, CONFIRMED, UNKNOWN }
    public enum BaseMode { LATEST_OFFICIAL, ASSUMED }
}

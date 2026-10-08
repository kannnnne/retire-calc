package cn.guangzhou.pension;

import cn.guangzhou.pension.domain.*;
import cn.guangzhou.pension.policy.PensionPolicyService;
import cn.guangzhou.pension.api.CalculationRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class ApiTest {
    @Test void tutorialUsesMaskedReplacementAndOriginalBalanceImageIsNotServed() throws Exception {
        mvc.perform(get("/guide/step4.png")).andExpect(status().isOk());
        mvc.perform(get("/guide/step4.jpg")).andExpect(status().isNotFound());
        mvc.perform(get("/")).andExpect(status().isOk())
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("95000.00"))));
    }
    @Test void customUnderpaidApiNeverReturnsReceiptOrRecovery() throws Exception {
        var r=forecastSample();r.put("plan","CUSTOM");r.put("contributionType","FLEXIBLE");r.put("customMonths",60);r.put("pauseMonths",12);
        mvc.perform(post("/api/forecast").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(r)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.scenarios[3].qualified").value(false))
            .andExpect(jsonPath("$.scenarios[3].receiptMonth").isEmpty()).andExpect(jsonPath("$.scenarios[3].totalLow").isEmpty())
            .andExpect(jsonPath("$.scenarios[3].futurePersonalCost").value(66120));
    }
    @ParameterizedTest @ValueSource(ints={-1,481})
    void badPauseIsRejected(int pause) throws Exception {
        var r=forecastSample();r.put("pauseMonths",pause);
        mvc.perform(post("/api/forecast").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(r))).andExpect(status().isBadRequest());
    }
    private Map<String,Object> forecastSample() {
        var r=new LinkedHashMap<String,Object>();
        r.put("birthMonth","1992-10");r.put("category","MALE");r.put("firstInsuredMonth","2016-07");
        r.put("dataAsOf","2026-09");r.put("paidMonths",121);r.put("principal","95000.00");r.put("plan","MINIMUM_STOP");return r;
    }
    @Test void forecastWithUnknownOptionalDataStillReturnsMoney() throws Exception {
        mvc.perform(post("/api/forecast").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(forecastSample())))
            .andExpect(status().isOk()).andExpect(jsonPath("$.selected").value("MINIMUM_STOP"))
            .andExpect(jsonPath("$.scenarios[2].totalLow").value(2779.18))
            .andExpect(jsonPath("$.scenarios[0].receiptMonth").value("2055-11"));
    }
    @ParameterizedTest @ValueSource(strings={"1992-13","0000-01","2099-01"})
    void forecastRejectsBadBirthMonths(String month) throws Exception {
        var r=forecastSample();r.put("birthMonth",month);
        mvc.perform(post("/api/forecast").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(r))).andExpect(status().isBadRequest());
    }
    @Test void forecastRejectsExcessDecimalPrecision() throws Exception {
        var r=forecastSample();r.put("principal","95000.001");
        mvc.perform(post("/api/forecast").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(r))).andExpect(status().isBadRequest());
    }
    @TestConfiguration static class FixedClock {
        @Bean @Primary Clock fixedClock() { return Clock.fixed(Instant.parse("2026-10-08T12:00:00Z"), ZoneId.of("Asia/Shanghai")); }
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired PensionPolicyService policy;
    private Map<String,Object> sample() {
        Map<String,Object> r=new LinkedHashMap<>();
        r.put("birthMonth","1985-06");r.put("category","MALE");r.put("firstInsuredMonth","2005-07");r.put("dataAsOf","2026-10");
        r.put("actualContributionMonths",240);r.put("accountBalance","180000");r.put("averageIndex","1.0000");r.put("historyStatus","NONE");
        r.put("deemedMonths",0);r.put("baseMode","LATEST_OFFICIAL");return r;
    }
    private org.springframework.test.web.servlet.ResultActions postRequest(Map<String,Object> r) throws Exception {
        return mvc.perform(post("/api/calculate").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(r)));
    }
    @Test void endToEndStaticResultAndAudit() throws Exception {
        postRequest(sample()).andExpect(status().isOk()).andExpect(jsonPath("$.retirement.month").value("2048-06"))
            .andExpect(jsonPath("$.retirement.ageMonths").value(756)).andExpect(jsonPath("$.monthsUntilRetirement").value(260))
            .andExpect(jsonPath("$.minimumContributionMonths").value(240)).andExpect(jsonPath("$.totalContributionMonths").value(240))
            .andExpect(jsonPath("$.base.parameterYear").value(2025)).andExpect(jsonPath("$.base.mode").value("LATEST_OFFICIAL_DEMO"))
            .andExpect(jsonPath("$.components[0].amount").value(1898.60)).andExpect(jsonPath("$.components[1].amount").value(1538.46))
            .andExpect(jsonPath("$.monthlyTotal").value(3437.06)).andExpect(jsonPath("$.input.accountBalance").value(180000))
            .andExpect(jsonPath("$.projectedContributionMonths").isEmpty()).andExpect(jsonPath("$.policies[0].source").isNotEmpty());
    }
    @Test void contributionShortageCannotClaimReceipt() throws Exception {
        var r=sample();r.put("actualContributionMonths",192);
        postRequest(r).andExpect(status().isOk()).andExpect(jsonPath("$.contributionSatisfied").value(false))
            .andExpect(jsonPath("$.missingContributionMonths").value(48)).andExpect(jsonPath("$.earliestReceiptIfApproved").isEmpty());
    }
    @Test void fractionalRetirementAgeBlocksTotal() throws Exception {
        var r=sample();r.put("birthMonth","1966-09");r.put("firstInsuredMonth","2000-01");
        postRequest(r).andExpect(status().isOk()).andExpect(jsonPath("$.retirement.month").value("2027-03"))
            .andExpect(jsonPath("$.components[1].status").value("PENDING")).andExpect(jsonPath("$.monthlyTotal").isEmpty());
    }
    @Test void unknownHistoryBlocksBasicAndTotal() throws Exception {
        var r=sample();r.put("historyStatus","UNKNOWN");
        postRequest(r).andExpect(status().isOk()).andExpect(jsonPath("$.components[0].status").value("PENDING"))
            .andExpect(jsonPath("$.components[2].status").value("PENDING")).andExpect(jsonPath("$.monthlyTotal").isEmpty());
    }
    @Test void unknownIndexStillCalculatesRetirementAndContributions() throws Exception {
        var r=sample();r.remove("averageIndex");
        postRequest(r).andExpect(status().isOk()).andExpect(jsonPath("$.retirement.month").value("2048-06"))
            .andExpect(jsonPath("$.minimumContributionMonths").value(240)).andExpect(jsonPath("$.contributionSatisfied").value(true))
            .andExpect(jsonPath("$.components[0].status").value("PENDING")).andExpect(jsonPath("$.components[1].amount").value(1538.46))
            .andExpect(jsonPath("$.monthlyTotal").isEmpty()).andExpect(jsonPath("$.input.averageIndex").isEmpty());
    }
    @Test void unknownIndexAndHistoryBothKeepTotalPending() throws Exception {
        var r=sample();r.put("averageIndex",null);r.put("historyStatus","UNKNOWN");
        postRequest(r).andExpect(status().isOk()).andExpect(jsonPath("$.retirement.month").value("2048-06"))
            .andExpect(jsonPath("$.contributionSatisfied").value(false)).andExpect(jsonPath("$.monthlyTotal").isEmpty());
    }
    @Test void historicalTotalsDoNotDoubleCount() throws Exception {
        var r=sample();r.put("firstInsuredMonth","1997-01");r.put("birthMonth","1966-09");r.put("historyStatus","CONFIRMED");
        r.put("deemedMonths",60);r.put("pre1998ActualMonths",12);r.put("pre1998AverageIndex","1.2");
        postRequest(r).andExpect(status().isOk()).andExpect(jsonPath("$.totalContributionMonths").value(300))
            .andExpect(jsonPath("$.components[2].amount").value(820.20));
    }
    @Test void assumedBaseIsExplicit() throws Exception {
        var r=sample();r.put("baseMode","ASSUMED");r.put("assumedBase","10000");
        postRequest(r).andExpect(status().isOk()).andExpect(jsonPath("$.base.mode").value("ASSUMED"))
            .andExpect(jsonPath("$.base.parameterYear").isEmpty()).andExpect(jsonPath("$.components[0].amount").value(2000));
    }
    @ParameterizedTest @ValueSource(strings={"birthFuture","birthInvalid","firstBeforeBirth","futureAsOf","tooManyMonths","negativeBalance","fractionalMonths","zeroIndex","assumptionMissing","contradictoryHistory","oldRetirement","historicalOverflow","unknownField","tooManyDecimals","afterRetirement"})
    void rejectsInvalidData(String kind) throws Exception {
        var r=sample();
        switch(kind){
            case "birthFuture" -> r.put("birthMonth","2027-01");
            case "birthInvalid" -> r.put("birthMonth","1985-13");
            case "firstBeforeBirth" -> r.put("firstInsuredMonth","1980-01");
            case "futureAsOf" -> r.put("dataAsOf","2026-11");
            case "tooManyMonths" -> r.put("actualContributionMonths",400);
            case "negativeBalance" -> r.put("accountBalance","-1");
            case "fractionalMonths" -> r.put("actualContributionMonths",240.5);
            case "zeroIndex" -> r.put("averageIndex","0");
            case "assumptionMissing" -> r.put("baseMode","ASSUMED");
            case "contradictoryHistory" -> r.put("deemedMonths",12);
            case "oldRetirement" -> r.put("birthMonth","1964-12");
            case "historicalOverflow" -> {r.put("pre1998ActualMonths",300);r.put("historyStatus","CONFIRMED");}
            case "unknownField" -> r.put("identityNumber","not-needed");
            case "tooManyDecimals" -> r.put("accountBalance","180000.123");
            case "afterRetirement" -> r.put("birthMonth","1966-01");
        }
        postRequest(r).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }
    @Test void officialTableIsCompleteAndUses208At47() {
        assertThat(policy.catalog().accountMonths()).hasSize(31);
        assertThat(policy.catalog().accountMonths().get(47)).isEqualTo(208);
        assertThat(policy.catalog().accountMonths().get(50)).isEqualTo(195);
        assertThat(policy.catalog().accountMonths().get(55)).isEqualTo(170);
        assertThat(policy.catalog().accountMonths().get(60)).isEqualTo(139);
    }
    @Test void configurationIsFailClosed() {
        var c=policy.catalog();
        var bad=new PensionPolicyService.Catalog(c.schemaVersion(),c.version(),c.verifiedAt(),c.policies(),c.pensionParameters(),Map.of(60,139));
        assertThatThrownBy(()->PensionPolicyService.validate(bad)).isInstanceOf(IllegalArgumentException.class);
        var unofficial=new PensionPolicyService.Parameter(2026,"广东",new BigDecimal("9999"),null,null,null,"NOT_VERIFIED");
        assertThatThrownBy(()->PensionPolicyService.validate(new PensionPolicyService.Catalog(1,c.version(),c.verifiedAt(),c.policies(),List.of(unofficial),c.accountMonths()))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void publishedYearAndAssumptionSelection() {
        assertThat(policy.select(2025,CalculationRequest.BaseMode.LATEST_OFFICIAL,null).mode()).isEqualTo("OFFICIAL");
        assertThat(policy.select(2026,CalculationRequest.BaseMode.LATEST_OFFICIAL,null).targetStatus()).isEqualTo("NOT_VERIFIED");
        assertThatThrownBy(()->policy.select(2026,CalculationRequest.BaseMode.ASSUMED,null)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void servesPageAndPolicyCatalog() throws Exception {
        mvc.perform(get("/index.html")).andExpect(status().isOk());
        mvc.perform(get("/api/policies")).andExpect(status().isOk()).andExpect(jsonPath("$.schemaVersion").value(1));
    }
}


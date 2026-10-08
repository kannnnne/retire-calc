package cn.guangzhou.pension.policy;

import cn.guangzhou.pension.api.CalculationRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

@Service
public class PensionPolicyService {
    public record Policy(String id, String name, String policyNumber, String source, String effectiveFrom, String status) {}
    public record Parameter(int year, String province, BigDecimal pensionBase, String source, String policyNumber, String publishDate, String status) {}
    public record Catalog(int schemaVersion, String version, String verifiedAt, List<Policy> policies,
                          List<Parameter> pensionParameters, Map<Integer,Integer> accountMonths) {}
    public record BaseSnapshot(int targetYear, Integer parameterYear, BigDecimal value, String mode,
                               String targetStatus, String source, String policyNumber, String message) {}
    private final Catalog catalog;
    public PensionPolicyService(ObjectMapper mapper, ResourceLoader loader, @Value("${pension.policy-file}") String file) throws IOException {
        try (var stream = loader.getResource(file).getInputStream()) { catalog = mapper.readValue(stream, Catalog.class); }
        validate(catalog);
    }
    public static void validate(Catalog c) {
        if (c == null || c.schemaVersion() != 1 || c.version() == null || c.verifiedAt() == null || c.policies() == null
                || c.pensionParameters() == null || c.accountMonths() == null) throw new IllegalArgumentException("政策配置结构不完整");
        Set<String> ids = new HashSet<>();
        for (Policy p : c.policies()) {
            if (p.id() == null || !ids.add(p.id()) || p.name() == null || p.policyNumber() == null || p.effectiveFrom() == null
                    || p.status() == null || !officialUrl(p.source())) throw new IllegalArgumentException("政策出处不完整或重复");
        }
        if (!ids.containsAll(List.of("retirement", "flexible", "basic", "account", "transition", "cleanup", "base2025")))
            throw new IllegalArgumentException("缺少公式引用的政策");
        Set<Integer> years = new HashSet<>();
        for (Parameter p : c.pensionParameters()) {
            if (!years.add(p.year()) || p.year() < 2006 || p.year() > 2200 || !"广东".equals(p.province())
                    || !Set.of("OFFICIAL","NOT_VERIFIED","NOT_PUBLISHED").contains(p.status())) throw new IllegalArgumentException("年度参数错误");
            if ("OFFICIAL".equals(p.status()) && (p.pensionBase() == null || p.pensionBase().signum() <= 0
                    || !officialUrl(p.source()) || p.policyNumber() == null || p.publishDate() == null)) throw new IllegalArgumentException("正式参数缺少依据");
            if (!"OFFICIAL".equals(p.status()) && p.pensionBase() != null) throw new IllegalArgumentException("未核验参数不能包含金额");
        }
        if (c.accountMonths().size() != 31) throw new IllegalArgumentException("计发月数表必须完整40—70岁");
        for (int age = 40; age <= 70; age++) if (c.accountMonths().get(age) == null || c.accountMonths().get(age) <= 0)
            throw new IllegalArgumentException("计发月数表错误");
    }
    private static boolean officialUrl(String url) {
        if (url == null) return false;
        try { var u = java.net.URI.create(url); return "https".equals(u.getScheme()) && u.getHost() != null && u.getHost().endsWith(".gov.cn"); }
        catch (IllegalArgumentException e) { return false; }
    }
    public Catalog catalog() { return catalog; }
    public BaseSnapshot select(int year, CalculationRequest.BaseMode mode, BigDecimal assumed) {
        String status = catalog.pensionParameters().stream().filter(p -> p.year() == year).findFirst().map(Parameter::status).orElse("NOT_VERIFIED");
        if (mode == CalculationRequest.BaseMode.ASSUMED) {
            if (assumed == null) throw new IllegalArgumentException("请填写假设计发基数");
            return new BaseSnapshot(year, null, assumed, "ASSUMED", status, null, null, "用户假设参数，并非官方核定值。");
        }
        Parameter p = catalog.pensionParameters().stream().filter(v -> v.year() <= year && "OFFICIAL".equals(v.status()))
                .max(Comparator.comparingInt(Parameter::year)).orElseThrow(() -> new IllegalArgumentException("没有可用正式年度参数，请选择假设模式"));
        return new BaseSnapshot(year, p.year(), p.pensionBase(), p.year() == year ? "OFFICIAL" : "LATEST_OFFICIAL_DEMO", status, p.source(), p.policyNumber(),
                p.year() == year ? "使用目标年度已录入正式参数。" : year + "年计发基数尚未核验/录入，暂按" + p.year() + "年参数演示测算；不代表未来待遇。");
    }
}

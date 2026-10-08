package cn.guangzhou.pension.api;

import cn.guangzhou.pension.domain.RetirementCalculator;
import cn.guangzhou.pension.domain.PensionForecastCalculator;
import cn.guangzhou.pension.policy.PensionPolicyService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PensionController {
    private final RetirementCalculator calculator;
    private final PensionPolicyService policy;
    private final PensionForecastCalculator forecast;
    public PensionController(RetirementCalculator calculator, PensionPolicyService policy, PensionForecastCalculator forecast) { this.calculator=calculator; this.policy=policy; this.forecast=forecast; }
    @GetMapping("/policies") public PensionPolicyService.Catalog policies() { return policy.catalog(); }
    @PostMapping("/calculate") public RetirementCalculator.Result calculate(@Valid @RequestBody CalculationRequest request) { return calculator.calculate(request); }
    @PostMapping("/forecast") public PensionForecastCalculator.Result forecast(@Valid @RequestBody ForecastRequest request) { return forecast.calculate(request); }
}

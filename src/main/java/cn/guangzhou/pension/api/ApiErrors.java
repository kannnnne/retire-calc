package cn.guangzhou.pension.api;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(IllegalArgumentException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String,Object> invalid(IllegalArgumentException e) { return Map.of("message", e.getMessage()); }
    @ExceptionHandler(MethodArgumentNotValidException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String,Object> fields(MethodArgumentNotValidException e) {
        Map<String,String> errors = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(v -> errors.putIfAbsent(v.getField(), v.getDefaultMessage()));
        return Map.of("message", "请检查输入范围、格式及小数位数", "fields", errors);
    }
    @ExceptionHandler(HttpMessageNotReadableException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String,Object> malformed() { return Map.of("message", "输入格式错误：月份应为YYYY-MM，缴费月数为整数，金额最多两位小数，指数最多四位小数。"); }
}

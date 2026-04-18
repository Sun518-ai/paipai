"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * 参数值类型
 */
export type ParamValues = Record<string, string | number | boolean>;

/**
 * useVariableBinding 配置
 */
export interface UseVariableBindingOptions {
  /** 防抖延迟 (ms)，默认 500 */
  debounceMs?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
}

/**
 * useVariableBinding 返回类型
 */
export interface UseVariableBindingResult {
  /** 替换后的 HTML */
  renderedHtml: string;
  /** 手动刷新（立即执行替换） */
  refresh: () => void;
  /** 是否正在防抖中 */
  isPending: boolean;
  /** 上次渲染使用的参数快照 */
  lastValues: ParamValues;
}

/**
 * 核心替换函数
 * 将 template 中的 {var} 替换为 paramValues 中对应的值
 * 支持嵌套语法: {user.name} → 直接替换完整 key
 */
export function replaceVariables(
  template: string,
  paramValues: ParamValues
): string {
  let result = template;

  for (const [key, value] of Object.entries(paramValues)) {
    // 构建完整的占位符，如 {username} 或 {user.name}
    const placeholder = `{${key}}`;
    // 替换所有出现的该占位符
    // 使用 String() 确保数字和布尔值被正确转换为字符串
    result = result.split(placeholder).join(String(value));
  }

  return result;
}

/**
 * useVariableBinding
 *
 * 将参数表单值替换到 HTML 模板的 {变量名} 占位符中。
 * - 参数变化后 500ms 无变化再触发更新（防抖）
 * - 支持手动 refresh() 立即触发
 * - 支持 {user.name} 等嵌套 key（直接按完整 key 匹配替换）
 */
export function useVariableBinding(
  template: string,
  paramValues: ParamValues,
  options: UseVariableBindingOptions = {}
): UseVariableBindingResult {
  const { debounceMs = 500, debug = false } = options;

  const [renderedHtml, setRenderedHtml] = useState<string>(() =>
    replaceVariables(template, paramValues)
  );
  const [isPending, setIsPending] = useState(false);
  const [lastValues, setLastValues] = useState<ParamValues>(paramValues);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const templateRef = useRef(template);
  const valuesRef = useRef(paramValues);

  // 同步最新值到 ref（避免闭包问题）
  templateRef.current = template;
  valuesRef.current = paramValues;

  const log = useCallback(
    (msg: string, ...args: unknown[]) => {
      if (debug) console.debug(`[useVariableBinding] ${msg}`, ...args);
    },
    [debug]
  );

  // 执行替换并更新状态
  const doReplace = useCallback(() => {
    const tpl = templateRef.current;
    const vals = valuesRef.current;
    const result = replaceVariables(tpl, vals);
    setRenderedHtml(result);
    setLastValues({ ...vals });
    setIsPending(false);
    log("replaced", { template: tpl, values: vals, result });
  }, [log]);

  // 清理防抖定时器
  const cancelPending = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 参数变化时，防抖触发替换
  useEffect(() => {
    // 快速路径：值未变化则跳过
    const valueChanged =
      Object.keys(paramValues).length !== Object.keys(lastValues).length ||
      Object.entries(paramValues).some(
        ([k, v]) => String(lastValues[k]) !== String(v)
      );

    if (!valueChanged) {
      log("values unchanged, skip");
      return;
    }

    cancelPending();
    setIsPending(true);
    log("scheduling replace in", debounceMs, "ms");

    timerRef.current = setTimeout(() => {
      doReplace();
    }, debounceMs);

    return cancelPending;
  }, [paramValues, debounceMs, lastValues, cancelPending, doReplace, log]);

  // 模板变化时立即替换
  useEffect(() => {
    if (template !== templateRef.current) {
      // 模板变了，取消防抖，立即替换
      cancelPending();
      doReplace();
    }
  }, [template, cancelPending, doReplace]);

  // 手动刷新：立即执行替换（取消防抖）
  const refresh = useCallback(() => {
    log("manual refresh triggered");
    cancelPending();
    doReplace();
  }, [log, cancelPending, doReplace]);

  // 组件卸载时清理
  useEffect(() => {
    return cancelPending;
  }, [cancelPending]);

  return { renderedHtml, refresh, isPending, lastValues };
}

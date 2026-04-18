/**
 * useVariableParser
 * 解析功能描述文本中的 {变量名} 占位符，提取结构化变量列表。
 * 变量名规则: {字母或下划线开头，后接字母数字下划线}
 */

export interface ParsedVariable {
  name: string;          // 变量名，如 "username"
  raw: string;          // 原始匹配，如 "{username}"
  start: number;         // 在原文中的起始位置
  end: number;           // 在原文中的结束位置
}

export interface ParserResult {
  variables: ParsedVariable[];
  /** 去除所有变量占位符后的纯文本 */
  plainText: string;
  /** 去重后的变量名列表 */
  uniqueNames: string[];
  /** 重复的变量名（出现次数 > 1） */
  duplicates: string[];
}

const VARIABLE_REGEX = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

/**
 * 从文本中解析所有变量占位符
 */
export function parseVariables(text: string): ParserResult {
  const variables: ParsedVariable[] = [];
  let match: RegExpExecArray | null;

  // 重置正则状态
  VARIABLE_REGEX.lastIndex = 0;

  while ((match = VARIABLE_REGEX.exec(text)) !== null) {
    variables.push({
      name: match[1],
      raw: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  const uniqueNames = [...new Set(variables.map((v) => v.name))];
  const nameCount = variables.reduce<Record<string, number>>((acc, v) => {
    acc[v.name] = (acc[v.name] || 0) + 1;
    return acc;
  }, {});
  const duplicates = uniqueNames.filter((name) => nameCount[name] > 1);

  // 去除所有 {变量名} 后的纯文本
  const plainText = text.replace(VARIABLE_REGEX, "");

  return { variables, plainText, uniqueNames, duplicates };
}

/**
 * 检查变量名是否合法（字母或下划线开头，后接字母数字下划线）
 */
export function isValidVariableName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * 从变量名列表推断字段类型（智能推断）
 * 规则:
 *   - 包含 password/pass/secret → password
 *   - 包含 email → email
 *   - 包含 url/link → url
 *   - 包含 count/num/number/age/year/price → number
 *   - 包含 boolean/bool/enable/disabled/visible → boolean
 *   - 包含 select/choice/option/mode/type → select
 *   - 默认 → text
 */
export type InferredType = "text" | "number" | "password" | "email" | "url" | "boolean" | "select";

export function inferVariableType(varName: string): InferredType {
  const lower = varName.toLowerCase();
  if (/password|pass|secret|key/.test(lower)) return "password";
  if (/email|mail/.test(lower)) return "email";
  if (/url|link|href|src/.test(lower)) return "url";
  if (/count|num|number|age|year|price|size|width|height/.test(lower)) return "number";
  if (/boolean|bool|enable|disabled|visible|active|checked/.test(lower)) return "boolean";
  if (/select|choice|option|mode|type|category|role|status|level/.test(lower)) return "select";
  return "text";
}

/**
 * 根据推断类型生成默认控件配置
 */
export interface ParamControl {
  name: string;
  type: InferredType;
  label: string;
  default: string | number | boolean;
  options?: string[]; // for select type
}

export function defaultControls(uniqueNames: string[]): ParamControl[] {
  return uniqueNames.map((name) => {
    const type = inferVariableType(name);
    return {
      name,
      type,
      label: name.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim(),
      default: type === "boolean" ? false : type === "number" ? 0 : "",
      options: type === "select" ? ["选项1", "选项2", "选项3"] : undefined,
    };
  });
}

/**
 * 生成 JSON 入参声明
 */
export function generateJsonParams(controls: ParamControl[]): string {
  const obj: Record<string, Record<string, unknown>> = {};
  for (const ctrl of controls) {
    obj[ctrl.name] = {
      type: ctrl.type,
      label: ctrl.label,
      default: ctrl.default,
      ...(ctrl.options ? { options: ctrl.options } : {}),
    };
  }
  return JSON.stringify(obj, null, 2);
}

// =============================================================================
// 集中错误消息（中文）
// =============================================================================
// 所有面向用户的错误消息统一在此维护，路由层只引用常量不直接写字符串。
// 这样后续要做 i18n 时只改这一个文件。
// =============================================================================

export const ErrorMessages = {
  // ---- 通用 ----
  INTERNAL: '服务器内部错误，请稍后重试',
  NOT_FOUND: (method: string, path: string) => `接口不存在: ${method} ${path}`,

  // ---- 校验 ----
  VALIDATION_INVALID_PAYLOAD: '请求数据格式不正确',
  VALIDATION_INVALID_QUERY: '查询参数格式不正确',
  VALIDATION_NO_FIELDS_TO_UPDATE: '没有可更新的字段',
  VALIDATION_OWNERID_NOT_SALES: '指定的所有者必须是销售角色',
  VALIDATION_TRANSFER_TARGET_INVALID: '目标用户必须是销售角色',
  VALIDATION_TRANSFER_SAME_OWNER: '客户已经属于该销售，无需转移',

  // ---- 认证 ----
  UNAUTHORIZED_NO_SESSION: '未登录或会话已过期',
  UNAUTHORIZED_INVALID_CREDENTIALS: '邮箱或密码错误',
  UNAUTHORIZED_CURRENT_PASSWORD: '当前密码不正确',
  UNAUTHORIZED_SESSION_EXPIRED: '会话已过期，请重新登录',
  UNAUTHORIZED_USER_NOT_FOUND: '用户不存在',

  // ---- 权限 ----
  FORBIDDEN_ADMIN_ONLY: '仅管理员可执行此操作',
  FORBIDDEN_NOT_YOUR_CUSTOMER: '无权操作此客户',
  FORBIDDEN_NOT_YOUR_VISIT: '无权操作此拜访',
  FORBIDDEN_SALES_CREATE_OWNER: '销售只能为自己创建客户',

  // ---- 改密 ----
  PASSWORD_CHANGE_REQUIRED: '请先修改初始密码后再使用系统',
  PASSWORD_TOO_WEAK: (errors: string[]) => `密码强度不足：${errors.join('；')}`,

  // ---- 资源不存在 ----
  RESOURCE_CUSTOMER_NOT_FOUND: '客户不存在',
  RESOURCE_VISIT_NOT_FOUND: '拜访记录不存在',
  RESOURCE_VISIT_ALREADY_DELETED: '拜访记录已删除',
  RESOURCE_USER_NOT_FOUND: '用户不存在',
} as const

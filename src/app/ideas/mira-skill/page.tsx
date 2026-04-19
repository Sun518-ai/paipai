'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { submitRegistration, MiraSkillRegistration } from '@/lib/miraSkillStore';

const TECH_DIRECTIONS = [
  '数据处理 / 报表自动化 (Python, SQL)',
  '文档 / 内容生成 (模板、格式转换)',
  '流程自动化 (审批、通知、定时任务)',
  'API 集成 / 外部数据源对接',
  '其他',
];

const DEPARTMENTS = [
  '产品',
  '研发',
  '设计',
  '运营',
  '市场',
  'HR/行政',
  '财务',
  '战略/投资',
  '其他',
];

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export default function MiraSkillPage() {
  const [form, setForm] = useState({
    name: '',
    employeeId: '',
    department: '',
    feishuEmail: '',
    techDirections: [] as string[],
    firstSkill: '',
  });
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState('');

  // Load saved draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem('paipai-mira-draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm(parsed);
      }
    } catch {}
  }, []);

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem('paipai-mira-draft', JSON.stringify(form));
  }, [form]);

  const toggleTech = (dir: string) => {
    setForm((f) => ({
      ...f,
      techDirections: f.techDirections.includes(dir)
        ? f.techDirections.filter((d) => d !== dir)
        : [...f.techDirections, dir],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.employeeId.trim() || !form.department || !form.feishuEmail.trim()) {
      setSubmitError('请填写所有必填项');
      setSubmitState('error');
      return;
    }
    if (!form.feishuEmail.includes('@')) {
      setSubmitError('飞书邮箱格式不正确');
      setSubmitState('error');
      return;
    }
    setSubmitState('loading');
    setSubmitError('');

    const data: MiraSkillRegistration = {
      name: form.name.trim(),
      employeeId: form.employeeId.trim(),
      department: form.department,
      feishuEmail: form.feishuEmail.trim(),
      techDirection: form.techDirections.join(' | '),
      firstSkill: form.firstSkill.trim(),
    };

    const result = await submitRegistration(data);
    if (result.ok) {
      setSubmitState('success');
      localStorage.removeItem('paipai-mira-draft');
    } else {
      setSubmitState('error');
      setSubmitError(result.error || '提交失败，请稍后重试');
    }
  };

  const handleReset = () => {
    setForm({ name: '', employeeId: '', department: '', feishuEmail: '', techDirections: [], firstSkill: '' });
    setSubmitState('idle');
    setSubmitError('');
    localStorage.removeItem('paipai-mira-draft');
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-white" />
        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-bold px-4 py-1.5 rounded-full mb-6">
            <span className="text-base">⭐</span>
            Mira Skill 贡献计划
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 leading-tight">
            你的创造力 让 <span className="text-purple-600">Mira</span> 更强大
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            将你的代码和工具封装成 Skill，帮助非技术团队提升效率——<br className="hidden md:block" />
            同时为自己解锁更多 Token 额度。
          </p>
          <div className="w-16 h-1 bg-purple-500 mx-auto mt-8 rounded-full" />
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-black text-gray-800 text-center mb-12">如何运作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              num: '01',
              icon: '📦',
              title: '封装你的代码为 Skill',
              desc: '选择工作中反复使用的脚本、工具或流程，使用 Mira Skill SDK 封装。支持 Python、TypeScript 等主流语言。',
            },
            {
              num: '02',
              icon: '📋',
              title: '提交审核',
              desc: '提交到 Skill Market 后，团队在 3 个工作日内完成安全审查和功能测试。审核通过后自动上架。',
            },
            {
              num: '03',
              icon: '🎁',
              title: '获得奖励，持续收益',
              desc: 'Skill 上架即获得基础 Token 奖励。后续每月根据 Skill 的调用量持续发放额外 Token，使用者越多，收益越高。',
            },
          ].map((step) => (
            <div key={step.num} className="relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{step.icon}</div>
              <div className="text-xs font-bold text-purple-500 mb-2 tracking-widest">STEP {step.num}</div>
              <h3 className="font-black text-gray-800 mb-2 text-lg">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Rewards ─── */}
      <section className="bg-gradient-to-br from-purple-50 to-indigo-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-black text-gray-800 text-center mb-4">奖励机制</h2>
          <p className="text-gray-500 text-center mb-12">贡献越多，上限越高</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {[
              {
                icon: '📁',
                title: '50K 上架奖励',
                desc: '每个 Skill 通过审核上架后，立即获得 50K Token/月',
                color: 'bg-white border-purple-200',
                accent: 'text-purple-600',
              },
              {
                icon: '📈',
                title: '+10K 调用量加成',
                desc: '每 100 次月调用额外获得 10K Token，上不封顶',
                color: 'bg-white border-green-200',
                accent: 'text-green-600',
              },
              {
                icon: '🌟',
                title: 'x2 热门翻倍',
                desc: '月调用量 Top 10 的 Skill，全部奖励翻倍',
                color: 'bg-amber-50 border-amber-200',
                accent: 'text-amber-600',
              },
            ].map((card) => (
              <div key={card.title} className={`${card.color} rounded-2xl border p-6 shadow-sm`}>
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className={`font-black ${card.accent} mb-2`}>{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Level table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 font-black text-gray-700">贡献等级</th>
                  <th className="text-left px-6 py-4 font-black text-gray-700">条件</th>
                  <th className="text-left px-6 py-4 font-black text-gray-700">月额外 Token</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '入门', tag: 'bg-sky-100 text-sky-700', tagText: '入门', condition: '1 个 Skill 上架', token: '50K' },
                  { label: '进阶', tag: 'bg-purple-100 text-purple-700', tagText: '进阶', condition: '3 个 Skill 上架', token: '200K' },
                  { label: '核心贡献者', tag: 'bg-orange-100 text-orange-700', tagText: '核心', condition: '5 个 Skill 上架 + 累计调用 1K 次', token: '500K+' },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${row.tag}`}>{row.tagText}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{row.condition}</td>
                    <td className="px-6 py-4 font-black text-purple-600">{row.token}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Registration Form ─── */}
      <section className="max-w-2xl mx-auto px-6 py-20" id="join">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-gray-800 mb-2">报名参加</h2>
          <p className="text-gray-400 text-sm">填写以下信息，我们会在 1 个工作日内联系你</p>
        </div>

        {submitState === 'success' ? (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl border border-purple-100 p-10 text-center shadow-sm">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">报名成功！</h3>
            <p className="text-gray-500 mb-6">感谢你的参与，Mira 团队会在 1 个工作日内联系你～</p>
            <p className="text-sm text-gray-400 mb-6">接下来准备好你的第一个 Skill 吧！</p>
            <button onClick={handleReset}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full text-sm transition-colors">
              再填一份
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-5">
            {/* 姓名 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                姓名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="你的姓名"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-all"
                required
              />
            </div>

            {/* 工号 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                工号 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                placeholder="例如: A12345"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-all"
                required
              />
            </div>

            {/* 部门 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                部门 <span className="text-red-400">*</span>
              </label>
              <select
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-all bg-white"
                required
              >
                <option value="">选择你的部门</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* 飞书邮箱 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                飞书邮箱 <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={form.feishuEmail}
                onChange={(e) => setForm((f) => ({ ...f, feishuEmail: e.target.value }))}
                placeholder="name@bytedance.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-all"
                required
              />
            </div>

            {/* 技术方向 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                你擅长的技术方向 <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {TECH_DIRECTIONS.map((dir) => {
                  const checked = form.techDirections.includes(dir);
                  return (
                    <label key={dir} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0
                        ${checked ? 'bg-purple-600 border-purple-600' : 'border-gray-300 group-hover:border-purple-400'}`}>
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleTech(dir)}
                      />
                      <span className={`text-sm ${checked ? 'text-gray-800 font-medium' : 'text-gray-500'} group-hover:text-gray-700`}>
                        {dir}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 第一个 Skill */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                你想封装的第一个 Skill 是什么？
              </label>
              <textarea
                value={form.firstSkill}
                onChange={(e) => setForm((f) => ({ ...f, firstSkill: e.target.value }))}
                placeholder="简单描述即可，例如: 自动从飞书文档提取表格并生成周报 PDF"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition-all resize-none"
              />
              <p className="text-xs text-gray-400 mt-1.5">选填，但填写后可优先获得 1:1 技术指导 ✨</p>
            </div>

            {/* Error */}
            {submitState === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {submitError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitState === 'loading'}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-purple-200 shadow-lg text-base"
            >
              {submitState === 'loading' ? '⏳ 提交中...' : '🚀 提交报名'}
            </button>
            <p className="text-xs text-gray-400 text-center">提交即表示同意 Skill 贡献计划条款</p>
          </form>
        )}
      </section>

      {/* ─── FAQ ─── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-black text-gray-800 text-center mb-10">常见问题</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Skill 需要什么技术水平？',
                a: '不需要复杂的工程能力，只要有脚本或自动化流程即可封装。提供 SDK 和模板，几个小时内可完成。',
              },
              {
                q: 'Token 奖励是永久的吗？',
                a: '只要 Skill 保持上架并持续有调用，奖励每月自动发放。若连续 3 个月零调用，进入休眠状态，重新激活后可恢复奖励。',
              },
              {
                q: '审核标准是什么？',
                a: '主要审核安全性（无敏感数据泄露风险）、稳定性（基础错误处理）和实用性。不要求代码精美，重点是对用户有价值。',
              },
              {
                q: '我的 Skill 被其他人使用时，我能看到什么？',
                a: '可以在 Skill Dashboard 查看调用次数、活跃用户数和使用趋势，但无法看到具体的输入输出内容，确保用户隐私。',
              },
            ].map((item) => (
              <div key={item.q} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-2 text-sm">🙋 {item.q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="text-center py-8 text-gray-400 text-xs border-t border-gray-100">
        Mira Skill 贡献计划 · Mira Product Team · 联系我们：mira-skill@bytedance.com
      </footer>

      {/* Back link */}
      <div className="max-w-4xl mx-auto px-6 pb-10">
        <Link href="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors">
          ← 返回派派点子站
        </Link>
      </div>
    </div>
  );
}

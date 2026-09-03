import { useState, type ReactNode } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { api } from '../api';
import { Logo } from '../components/logo';
import { AnalysisList, EmptyState, PageHeader } from '../components/page-elements';
import { useAgentEventStream } from '../hooks/use-agent-event-stream';
import {
  useAgentMessagesQuery,
  useAgentThreadsQuery,
  useApplicationsQuery,
  useDashboardQuery,
  useInterviewQuery,
  useJobQuery,
  useJobsQuery,
  useResumesQuery,
  useTasksQuery,
} from '../hooks/use-jobpilot-queries';
import {
  FileText,
  BriefcaseBusiness,
  CalendarCheck2,
  Bot,
  Plus,
  Search,
  MapPin,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Circle,
  Send,
  ChevronRight,
  Clock,
  Building2,
} from 'lucide-react';
const labels: any = {
  WISHLIST: '收藏',
  APPLIED: '已投递',
  WRITTEN_TEST: '笔试',
  FIRST_INTERVIEW: '一面',
  SECOND_INTERVIEW: '二面',
  HR_INTERVIEW: 'HR 面',
  OFFER: 'Offer',
  REJECTED: '已拒绝',
  WITHDRAWN: '已撤回',
};
const Title = ({ title, desc, action }: { title: string; desc: string; action?: ReactNode }) => (
  <PageHeader title={title} description={desc} action={action} />
);
const Empty = ({ text }: { text: string }) => <EmptyState>{text}</EmptyState>;
const List = AnalysisList;
export function Auth({ register = false }: { register?: boolean }) {
  const nav = useNavigate(),
    {
      register: field,
      handleSubmit,
      formState: { isSubmitting },
    } = useForm();
  const submit = async (d: any) => {
    try {
      const r = await api.post(`/auth/${register ? 'register' : 'login'}`, d);
      localStorage.setItem('token', r.data.accessToken);
      nav('/');
    } catch (e: any) {
      alert(e.response?.data?.message || '操作失败');
    }
  };
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex bg-brand text-white p-16 flex-col justify-between">
        <Logo light />
        <div>
          <p className="text-5xl font-bold leading-tight">
            让每一次投递，
            <br />
            都有准备。
          </p>
          <p className="mt-6 text-green-100 text-lg max-w-md">
            从简历解析到模拟面试，用 AI 把求职过程变成清晰、可执行的计划。
          </p>
        </div>
        <p className="text-sm text-green-200">JobPilot · Built for your next opportunity</p>
      </div>
      <div className="flex items-center justify-center p-7">
        <form onSubmit={handleSubmit(submit)} className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold">{register ? '创建账号' : '欢迎回来'}</h1>
          <p className="text-muted mt-2 mb-8">
            {register ? '开启你的智能求职旅程' : '继续推进你的求职计划'}
          </p>
          {register && (
            <label className="label">
              昵称
              <input className="input mt-1" {...field('nickname', { required: true })} />
            </label>
          )}
          <label className="label mt-4">
            邮箱
            <input className="input mt-1" type="email" {...field('email', { required: true })} />
          </label>
          <label className="label mt-4">
            密码
            <input
              className="input mt-1"
              type="password"
              {...field('password', { required: true, minLength: 6 })}
            />
          </label>
          <button className="btn-primary w-full mt-6" disabled={isSubmitting}>
            {register ? '注册并开始' : '登录'}
          </button>
          <p className="text-center text-sm text-muted mt-6">
            {register ? '已有账号？' : '还没有账号？'}{' '}
            <Link className="text-brand font-semibold" to={register ? '/login' : '/register'}>
              {register ? '登录' : '立即注册'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
export function Dashboard() {
  const { data } = useDashboardQuery();
  const stats = [
    ['收藏职位', data?.jobs || 0, BriefcaseBusiness],
    ['全部投递', data?.applications || 0, Send],
    ['面试中', data?.interviews || 0, CalendarCheck2],
    ['收到 Offer', data?.offers || 0, Sparkles],
  ];
  return (
    <>
      <div>
        <p className="subtle">早上好 👋</p>
        <h1 className="page-title mt-1">今天也向理想工作靠近一步</h1>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-7">
        {stats.map(([l, n, I]: any) => (
          <div className="card p-5" key={l}>
            <div className="flex justify-between">
              <span className="subtle">{l}</span>
              <I className="text-brand" size={19} />
            </div>
            <p className="text-3xl font-bold mt-4">{n}</p>
          </div>
        ))}
      </div>
      <div className="grid xl:grid-cols-[1.4fr_1fr] gap-5 mt-5">
        <section className="card p-6">
          <div className="flex justify-between">
            <h2 className="font-semibold text-lg">今日任务</h2>
            <Link to="/tasks" className="subtle">
              查看全部
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {data?.tasks?.length ? (
              data.tasks.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-cream">
                  <Circle size={19} className="text-muted" />
                  <div>
                    <p className="font-medium text-sm">{t.title}</p>
                    <p className="text-xs text-muted mt-1">
                      {t.estimatedMinutes} 分钟 · {t.priority}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <Empty text="还没有今日任务" />
            )}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="font-semibold text-lg">下一步建议</h2>
          <div className="mt-5 rounded-2xl bg-brand p-5 text-white">
            <Sparkles />
            <h3 className="font-semibold mt-4">完善你的求职画像</h3>
            <p className="text-sm text-green-100 mt-2">
              上传简历并添加一个目标职位，即可生成个性化匹配分析。
            </p>
            <Link to="/resume" className="btn mt-4 bg-white text-brand">
              开始完善 <ChevronRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
export function Resume() {
  const qc = useQueryClient(),
    { data = [] } = useResumesQuery();
  const upload = useMutation({
    mutationFn: (f: File) => {
      const d = new FormData();
      d.append('file', f);
      return api.post('/resumes', d);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  });
  const parse = useMutation({
    mutationFn: (id: string) => api.post(`/resumes/${id}/parse`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resumes'] }),
  });
  return (
    <>
      <Title title="我的简历" desc="上传 PDF 或 DOCX，生成可编辑的结构化能力画像。" />
      <label className="card mt-7 border-dashed border-2 p-8 flex flex-col items-center text-center hover:border-green-400 transition">
        <UploadCloud className="text-brand" size={34} />
        <b className="mt-3">点击上传简历</b>
        <span className="subtle mt-1">PDF / DOCX，最大 10MB</span>
        <input
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])}
        />
      </label>
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        {data.map((r: any) => (
          <div className="card p-6" key={r.id}>
            <div className="flex gap-4">
              <span className="bg-red-50 text-red-600 rounded-xl p-3 h-fit">
                <FileText />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{r.name}</h3>
                <p className="subtle mt-1">
                  {r.fileType.toUpperCase()} ·{' '}
                  {r.parseStatus === 'COMPLETED' ? '已解析' : '等待解析'}
                </p>
              </div>
              {r.isPrimary && (
                <span className="badge bg-mint text-brand ml-auto h-fit">主简历</span>
              )}
            </div>
            {r.skills?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-5">
                {r.skills.slice(0, 8).map((s: any) => (
                  <span className="badge bg-gray-100" key={s.id}>
                    {s.name}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <button
                className="btn-primary"
                onClick={() => parse.mutate(r.id)}
                disabled={parse.isPending}
              >
                <Sparkles size={16} />
                {r.parseStatus === 'COMPLETED' ? '重新解析' : 'AI 解析'}
              </button>
              {!r.isPrimary && (
                <button
                  className="btn-secondary"
                  onClick={() =>
                    api
                      .put(`/resumes/${r.id}/primary`)
                      .then(() => qc.invalidateQueries({ queryKey: ['resumes'] }))
                  }
                >
                  设为主简历
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
export function Jobs() {
  const [search, setSearch] = useState('');
  const { data = [] } = useJobsQuery(search);
  return (
    <>
      <Title
        title="职位管理"
        desc="集中管理目标岗位，并追踪每一次匹配分析。"
        action={
          <Link className="btn-primary" to="/jobs/new">
            <Plus size={17} />
            添加职位
          </Link>
        }
      />
      <div className="relative mt-7 max-w-md">
        <Search className="absolute left-3 top-3 text-muted" size={18} />
        <input
          className="input pl-10"
          placeholder="搜索公司或职位"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-5">
        {data.map((j: any) => (
          <Link
            to={`/jobs/${j.id}`}
            className="card p-6 hover:-translate-y-0.5 hover:shadow-md transition"
            key={j.id}
          >
            <div className="flex justify-between">
              <span className="w-11 h-11 bg-mint text-brand rounded-xl grid place-items-center">
                <Building2 />
              </span>
              <span className="badge bg-gray-100 h-fit">
                {labels[j.application?.status] || '收藏'}
              </span>
            </div>
            <h3 className="font-semibold text-lg mt-5">{j.title}</h3>
            <p className="text-muted mt-1">{j.company}</p>
            <div className="flex justify-between items-end mt-6">
              <span className="subtle flex gap-1">
                <MapPin size={16} />
                {j.city || '城市不限'}
              </span>
              <span>
                <b className="text-2xl text-brand">{j.matches?.[0]?.totalScore ?? '--'}</b>
                <small className="text-muted"> / 100</small>
              </span>
            </div>
          </Link>
        ))}
        {!data.length && (
          <div className="card col-span-full">
            <Empty text="还没有职位，添加第一个目标岗位吧" />
          </div>
        )}
      </div>
    </>
  );
}
export function JobForm() {
  const nav = useNavigate(),
    {
      register,
      handleSubmit,
      formState: { isSubmitting },
    } = useForm();
  const submit = async (d: any) => {
    const r = await api.post('/jobs', d);
    nav(`/jobs/${r.data.id}`);
  };
  return (
    <>
      <Title title="添加目标职位" desc="粘贴完整 JD，后续 AI 会为你拆解岗位要求。" />
      <form className="card p-6 mt-7 max-w-3xl space-y-5" onSubmit={handleSubmit(submit)}>
        <div className="grid md:grid-cols-2 gap-5">
          <label className="label">
            公司
            <input className="input mt-1" {...register('company', { required: true })} />
          </label>
          <label className="label">
            职位名称
            <input className="input mt-1" {...register('title', { required: true })} />
          </label>
          <label className="label">
            城市
            <input className="input mt-1" {...register('city')} />
          </label>
          <label className="label">
            来源
            <input
              className="input mt-1"
              placeholder="Boss / 官网 / 内推"
              {...register('source')}
            />
          </label>
        </div>
        <label className="label">
          职位描述
          <textarea
            className="input mt-1 min-h-56 resize-y"
            {...register('description', { required: true })}
          />
        </label>
        <label className="label">
          职位链接
          <input className="input mt-1" {...register('sourceUrl')} />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => nav(-1)}>
            取消
          </button>
          <button className="btn-primary" disabled={isSubmitting}>
            保存职位
          </button>
        </div>
      </form>
    </>
  );
}
export function JobDetail() {
  const { id } = useParams(),
    qc = useQueryClient(),
    nav = useNavigate();
  const { data: j } = useJobQuery(id);
  const act = async (type: string) => {
    await api.post(`/jobs/${id}/${type}`);
    qc.invalidateQueries({ queryKey: ['job', id] });
  };
  if (!j) return <Empty text="加载中..." />;
  const m = j.matches?.[0];
  return (
    <>
      <Link to="/jobs" className="subtle">
        ← 返回职位列表
      </Link>
      <div className="flex flex-wrap justify-between gap-4 mt-4">
        <div>
          <h1 className="page-title">
            {j.company} · {j.title}
          </h1>
          <p className="subtle mt-2 flex gap-2">
            <MapPin size={16} />
            {j.city || '城市不限'} · {labels[j.application?.status]}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => act('analyze')}>
            <Sparkles size={16} />
            解析 JD
          </button>
          <button className="btn-primary" onClick={() => act('match')}>
            <Sparkles size={16} />
            匹配简历
          </button>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-7">
        <section className="card p-6">
          <h2 className="font-semibold text-lg">职位描述</h2>
          <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted max-h-[560px] overflow-auto">
            {j.description}
          </div>
          {j.skills?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold">已识别技能</h3>
              <div className="flex flex-wrap gap-2 mt-3">
                {j.skills.map((s: any) => (
                  <span
                    key={s.id}
                    className={`badge ${s.type === 'REQUIRED' ? 'bg-mint text-brand' : 'bg-gray-100'}`}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="space-y-5">
          <div className="card p-6">
            <div className="flex justify-between">
              <h2 className="font-semibold text-lg">AI 匹配分析</h2>
              <span className="text-brand">
                <b className="text-3xl">{m?.totalScore ?? '--'}</b> / 100
              </span>
            </div>
            {m ? (
              <>
                <div className="grid grid-cols-5 gap-2 mt-6">
                  {[
                    ['技能', m.skillScore, 40],
                    ['项目', m.projectScore, 30],
                    ['经验', m.experienceScore, 15],
                    ['教育', m.educationScore, 5],
                    ['关键词', m.keywordScore, 10],
                  ].map(([l, n, max]: any) => (
                    <div key={l}>
                      <div className="h-20 bg-gray-100 rounded-lg flex items-end overflow-hidden">
                        <div
                          className="w-full bg-green-500"
                          style={{ height: `${(n / max) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-center mt-2">
                        {l}
                        <br />
                        <b>{n}</b>
                      </p>
                    </div>
                  ))}
                </div>
                <List title="待补技能" items={m.missingSkills} />
                <List title="面试风险" items={m.risks} />
                <List title="优化建议" items={m.suggestions} />
              </>
            ) : (
              <Empty text="点击“匹配简历”生成分析" />
            )}
          </div>
          <div className="card p-6">
            <h2 className="font-semibold">准备下一步</h2>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                className="btn-primary"
                onClick={() =>
                  api
                    .post('/preparation/plans', { jobId: id, days: 5, hoursPerDay: 2 })
                    .then(() => nav('/tasks'))
                }
              >
                生成 5 天计划
              </button>
              <button
                className="btn-secondary"
                onClick={() =>
                  api
                    .post('/interviews', { jobId: id })
                    .then((r) => nav(`/interviews/${r.data.id}`))
                }
              >
                开始模拟面试
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
const boardStatuses = [
  'WISHLIST',
  'APPLIED',
  'WRITTEN_TEST',
  'FIRST_INTERVIEW',
  'SECOND_INTERVIEW',
  'HR_INTERVIEW',
  'OFFER',
];
function Card({ a }: { a: any }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: a.id,
    data: { status: a.status },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
      }}
      className="bg-white border border-line rounded-xl p-3 shadow-sm touch-none"
    >
      <b className="text-sm">{a.job.company}</b>
      <p className="text-xs text-muted mt-1">{a.job.title}</p>
      {a.job.matches?.[0] && (
        <span className="text-xs text-brand mt-3 block">匹配 {a.job.matches[0].totalScore}%</span>
      )}
    </div>
  );
}
function Column({ status, items }: { status: string; items: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl p-3 min-h-[420px] transition ${isOver ? 'bg-green-100' : 'bg-[#f0f2ee]'}`}
    >
      <div className="flex justify-between p-1 mb-3">
        <b className="text-sm">{labels[status]}</b>
        <span className="text-xs text-muted">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id} a={a} />
        ))}
      </div>
    </div>
  );
}
export function Applications() {
  const qc = useQueryClient(),
    { data = [] } = useApplicationsQuery();
  const drop = async (e: DragEndEvent) => {
    if (!e.over) return;
    await api.patch(`/applications/${e.active.id}/status`, { status: e.over.id });
    qc.invalidateQueries({ queryKey: ['applications'] });
  };
  return (
    <>
      <Title title="投递看板" desc="拖动卡片，更新每一个求职机会的进度。" />
      <div className="overflow-x-auto mt-7 pb-4">
        <DndContext onDragEnd={drop}>
          <div className="grid grid-cols-7 gap-3 min-w-[1180px]">
            {boardStatuses.map((s) => (
              <Column key={s} status={s} items={data.filter((a: any) => a.status === s)} />
            ))}
          </div>
        </DndContext>
      </div>
    </>
  );
}
export function Tasks() {
  const qc = useQueryClient(),
    { data = [] } = useTasksQuery();
  const grouped = data.reduce((a: any, t: any) => {
    const d = new Date(t.scheduledDate).toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    (a[d] ||= []).push(t);
    return a;
  }, {});
  const toggle = (t: any) =>
    api
      .patch(`/preparation/tasks/${t.id}`, { completed: !t.completed })
      .then(() => qc.invalidateQueries({ queryKey: ['tasks'] }));
  return (
    <>
      <Title title="准备计划" desc="把技能差距转化为每天可以完成的小任务。" />
      <div className="space-y-5 mt-7">
        {Object.entries(grouped).map(([day, items]: any) => (
          <section className="card p-6" key={day}>
            <h2 className="font-semibold">{day}</h2>
            <div className="mt-4 divide-y divide-line">
              {items.map((t: any) => (
                <button
                  onClick={() => toggle(t)}
                  key={t.id}
                  className="w-full flex text-left items-center gap-4 py-4"
                >
                  <span className={t.completed ? 'text-brand' : 'text-gray-400'}>
                    {t.completed ? <CheckCircle2 /> : <Circle />}
                  </span>
                  <div className="flex-1">
                    <p
                      className={`font-medium text-sm ${t.completed ? 'line-through text-muted' : ''}`}
                    >
                      {t.title}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {t.plan.job.company} · {t.category}
                    </p>
                  </div>
                  <span className="subtle flex gap-1">
                    <Clock size={15} />
                    {t.estimatedMinutes} 分钟
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {!data.length && (
          <div className="card">
            <Empty text="从职位详情生成一份准备计划吧" />
          </div>
        )}
      </div>
    </>
  );
}
export function Agent() {
  const qc = useQueryClient(),
    [thread, setThread] = useState<string>(),
    [input, setInput] = useState('');
  const { data: threads = [] } = useAgentThreadsQuery();
  const { data: messages = [] } = useAgentMessagesQuery(thread);
  const { streamedText: stream, connect } = useAgentEventStream(() => {
    void qc.invalidateQueries({ queryKey: ['messages', thread] });
  });
  const ensure = async () => {
    if (thread) return thread;
    const r = await api.post('/agent/threads', { title: '求职规划' });
    setThread(r.data.id);
    qc.invalidateQueries({ queryKey: ['threads'] });
    return r.data.id;
  };
  const send = async () => {
    if (!input.trim()) return;
    const tid = await ensure(),
      question = input;
    setInput('');
    const r = await api.post('/agent/runs', { threadId: tid, input: question });
    connect(r.data.id);
  };
  return (
    <>
      <Title title="AI 求职助手" desc="让 Agent 基于真实简历、岗位和任务数据协助你。" />
      <div className="card mt-7 h-[calc(100vh-190px)] min-h-[600px] grid md:grid-cols-[240px_1fr] overflow-hidden">
        <aside className="border-r border-line p-4 hidden md:block">
          <button className="btn-primary w-full" onClick={() => setThread(undefined)}>
            <Plus size={16} />
            新对话
          </button>
          <div className="mt-4 space-y-1">
            {threads.map((t: any) => (
              <button
                key={t.id}
                onClick={() => setThread(t.id)}
                className={`w-full text-left p-3 rounded-xl text-sm truncate ${thread === t.id ? 'bg-mint text-brand' : 'hover:bg-gray-50'}`}
              >
                {t.title}
              </button>
            ))}
          </div>
        </aside>
        <div className="flex flex-col min-w-0">
          <div className="flex-1 overflow-auto p-5 lg:p-8 space-y-5">
            {!messages.length && !stream ? (
              <div className="h-full grid place-items-center text-center">
                <div>
                  <span className="w-14 h-14 rounded-2xl bg-mint text-brand grid place-items-center mx-auto">
                    <Bot size={28} />
                  </span>
                  <h2 className="font-semibold text-lg mt-4">今天想推进什么？</h2>
                  <p className="subtle mt-2">试试：“我有哪些正在面试的职位？”</p>
                </div>
              </div>
            ) : (
              messages.map((m: any) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-2xl p-4 text-sm whitespace-pre-wrap ${m.role === 'USER' ? 'ml-auto bg-brand text-white' : 'bg-gray-100'}`}
                >
                  {m.content}
                </div>
              ))
            )}
            {stream && (
              <div className="max-w-[80%] rounded-2xl p-4 text-sm whitespace-pre-wrap bg-gray-100">
                {stream}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-line">
            <div className="flex gap-2">
              <textarea
                className="input min-h-12 max-h-32 resize-none"
                placeholder="问问你的求职助手..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button className="btn-primary px-4" onClick={send}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export function Interview() {
  const { id } = useParams(),
    qc = useQueryClient(),
    { data: s } = useInterviewQuery(id);
  const [answer, setAnswer] = useState('');
  if (!s) return <Empty text="正在准备面试题..." />;
  const current = s.questions.find((q: any) => !q.userAnswer) || s.questions.at(-1);
  const submit = async () => {
    await api.post(`/interviews/${id}/answer`, { questionId: current.id, answer });
    setAnswer('');
    qc.invalidateQueries({ queryKey: ['interview', id] });
  };
  return (
    <>
      <Title
        title={`${s.job.company} 模拟面试`}
        desc={`${s.job.title} · ${s.questions.filter((q: any) => q.userAnswer).length}/${s.questions.length} 已回答`}
      />
      <div className="grid lg:grid-cols-[1fr_300px] gap-5 mt-7">
        <section className="card p-7">
          <span className="badge bg-mint text-brand">{current.category}</span>
          <h2 className="text-xl font-semibold leading-relaxed mt-5">{current.question}</h2>
          {current.userAnswer ? (
            <div className="mt-7">
              <div className="bg-cream rounded-xl p-4 text-sm">{current.userAnswer}</div>
              <div className="border-l-4 border-green-500 pl-4 mt-5">
                <b className="text-brand">评分 {Number(current.score).toFixed(1)} / 10</b>
                <p className="text-sm text-muted mt-2">{current.aiFeedback}</p>
              </div>
            </div>
          ) : (
            <>
              <textarea
                className="input min-h-52 mt-7"
                placeholder="输入你的回答，尽量结合真实项目经历..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <button className="btn-primary mt-4" onClick={submit}>
                提交回答
              </button>
            </>
          )}
        </section>
        <aside className="card p-5">
          <h3 className="font-semibold">题目列表</h3>
          <div className="mt-4 space-y-2">
            {s.questions.map((q: any) => (
              <div
                key={q.id}
                className={`p-3 rounded-xl text-sm flex gap-3 ${q.id === current.id ? 'bg-mint text-brand' : 'bg-gray-50'}`}
              >
                {q.userAnswer ? <CheckCircle2 size={17} /> : <Circle size={17} />}第{' '}
                {q.questionIndex} 题
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
export function SettingsPage() {
  return (
    <>
      <Title title="设置" desc="配置本地 JobPilot 的使用偏好。" />
      <div className="card p-6 mt-7 max-w-xl">
        <h2 className="font-semibold">模型配置</h2>
        <p className="subtle mt-2">
          模型密钥由后端环境变量管理，不会暴露给浏览器。请修改根目录 .env 后重启 API。
        </p>
      </div>
    </>
  );
}

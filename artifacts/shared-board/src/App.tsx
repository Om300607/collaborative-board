import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Check,
  CircleHelp,
  Clock3,
  Compass,
  FileText,
  Heart,
  Lightbulb,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  getGetBoardSummaryQueryKey,
  getListBoardActivityQueryKey,
  getListBoardItemsQueryKey,
  useCreateBoardItem,
  useDeleteBoardItem,
  useGetBoardSummary,
  useListBoardActivity,
  useListBoardItems,
  useToggleBoardItemReaction,
} from '@workspace/api-client-react';
import type { BoardActivity, BoardItem } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import type { FormEvent, ReactNode } from 'react';

const queryClient = new QueryClient();
const CURRENT_USER = 'Om';
type Category = 'idea' | 'question' | 'update';
type Filter = 'all' | Category;

const categoryMeta: Record<Category, {
  label: string;
  eyebrow: string;
  icon: typeof Lightbulb;
  tint: string;
  iconClass: string;
}> = {
  idea: {
    label: 'Idea',
    eyebrow: 'A spark worth keeping',
    icon: Lightbulb,
    tint: 'bg-[#f7dfbc] text-[#8e5624]',
    iconClass: 'text-[#c47631]',
  },
  question: {
    label: 'Question',
    eyebrow: 'Something to think through',
    icon: CircleHelp,
    tint: 'bg-[#dce8e6] text-[#2d6961]',
    iconClass: 'text-[#337e73]',
  },
  update: {
    label: 'Update',
    eyebrow: 'A little momentum',
    icon: TrendingUp,
    tint: 'bg-[#e8d9e8] text-[#775476]',
    iconClass: 'text-[#956b91]',
  },
};

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function activityCopy(activity: BoardActivity) {
  if (activity.action === 'created') return 'added a new note';
  if (activity.action === 'reacted') return 'reacted to';
  if (activity.action === 'unreacted') return 'removed a reaction from';
  return 'removed';
}

function BoardShell({ children }: { children: ReactNode }) {
  return (
    <div className="grain flex min-h-[100dvh] bg-background text-foreground">
      <aside className="hidden min-h-[100dvh] w-[252px] shrink-0 flex-col bg-sidebar px-5 py-6 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
            <Compass size={21} strokeWidth={2.6} />
          </div>
          <div>
            <p className="font-display text-[17px] font-bold tracking-[-.03em]">shared board</p>
            <p className="font-mono-custom mt-0.5 text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/55">team room / 01</p>
          </div>
        </div>
        <div className="mt-14 px-2">
          <p className="font-mono-custom text-[10px] uppercase tracking-[.19em] text-sidebar-foreground/40">Workspace</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-sidebar-accent px-3 py-3 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full bg-sidebar-primary" />
            Live board
            <span className="ml-auto font-mono-custom text-[10px] text-sidebar-foreground/40">01</span>
          </div>
        </div>
        <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-4">
          <div className="flex items-center gap-2 text-sidebar-foreground/70">
            <Users size={14} />
            <span className="font-mono-custom text-[10px] uppercase tracking-[.12em]">Good room energy</span>
          </div>
          <p className="mt-3 font-display text-[14px] leading-5 text-sidebar-foreground/90">Small notes become better work when they stay in the room.</p>
          <div className="mt-4 flex -space-x-2">
            {['OM', 'NK', 'AR'].map((person, index) => (
              <span key={person} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-sidebar ${index === 0 ? 'bg-[#e9a16f]' : index === 1 ? 'bg-[#9abdb4]' : 'bg-[#c6a7bd]'} text-[9px] font-bold text-[#213b3b]`}>
                {person}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-extrabold text-sidebar-primary-foreground">{initials(CURRENT_USER)}</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{CURRENT_USER}</p>
            <p className="font-mono-custom text-[9px] uppercase tracking-[.1em] text-sidebar-foreground/45">your profile</p>
          </div>
          <MoreHorizontal size={16} className="ml-auto text-sidebar-foreground/40" />
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function SummaryStrip({ summary, loading }: { summary?: { totalItems: number; ideas: number; questions: number; updates: number; reactions: number }; loading: boolean }) {
  const cells = [
    { label: 'Notes in the room', value: summary?.totalItems ?? 0, icon: FileText },
    { label: 'Ideas', value: summary?.ideas ?? 0, icon: Lightbulb },
    { label: 'Questions', value: summary?.questions ?? 0, icon: CircleHelp },
    { label: 'Updates', value: summary?.updates ?? 0, icon: TrendingUp },
    { label: 'Reactions shared', value: summary?.reactions ?? 0, icon: Heart },
  ];
  return (
    <section className="grid grid-cols-2 border-y border-border/80 sm:grid-cols-5" data-testid="summary-strip">
      {cells.map(({ label, value, icon: Icon }, index) => (
        <div key={label} className={`flex items-center gap-3 py-4 ${index > 0 ? 'border-l border-border/70 pl-4 sm:pl-6' : ''} ${index > 1 ? 'pt-3 sm:pt-4' : ''}`}>
          <Icon size={16} className="text-primary/65" strokeWidth={1.8} />
          <div>
            {loading ? <div className="skeleton h-6 w-8 rounded-md" /> : <p className="font-display text-[22px] font-bold tracking-[-.05em] text-foreground" data-testid={`summary-value-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p>}
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[.08em] text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function Composer({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>('idea');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const createItem = useCreateBoardItem();
  const queryClient = useQueryClient();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !body.trim() || createItem.isPending) return;
    createItem.mutate({ data: { title: title.trim(), body: body.trim(), category, authorName: CURRENT_USER } }, {
      onSuccess: () => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: getListBoardItemsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListBoardActivityQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetBoardSummaryQueryKey() }),
        ]);
        setTitle('');
        setBody('');
        setOpen(false);
        onCreated();
      },
    });
  };

  return (
    <section className={`overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-[var(--shadow-sm)] transition-all duration-300 ${open ? 'ring-1 ring-primary/20' : ''}`} data-testid="composer">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="focus-ring flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/45" data-testid="button-open-composer">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/60 text-primary"><Plus size={18} /></span>
          <span className="flex-1">
            <span className="block text-sm font-bold">What’s on your mind, Om?</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Share a thought, ask the room, or mark a little progress.</span>
          </span>
          <ArrowUpRight size={17} className="text-muted-foreground" />
        </button>
      ) : (
        <form onSubmit={submit} className="animate-pop-in p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-bold tracking-[-.03em]">Put it on the board</p>
              <p className="mt-1 text-xs text-muted-foreground">Keep it useful, keep it human.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="focus-ring rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close composer" data-testid="button-close-composer"><X size={17} /></button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Note category">
            {(Object.keys(categoryMeta) as Category[]).map((option) => {
              const meta = categoryMeta[option];
              const Icon = meta.icon;
              return (
                <button key={option} type="button" onClick={() => setCategory(option)} className={`focus-ring flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-all ${category === option ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'}`} aria-pressed={category === option} data-testid={`button-category-${option}`}>
                  <Icon size={14} /> {meta.label}
                </button>
              );
            })}
          </div>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} autoFocus placeholder="Give your note a clear headline" className="focus-ring mt-5 w-full border-0 border-b border-border bg-transparent px-0 py-3 font-display text-xl font-bold tracking-[-.035em] outline-none placeholder:text-muted-foreground/45" data-testid="input-item-title" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={3} placeholder="Add the useful bit of context..." className="focus-ring mt-3 w-full resize-none rounded-xl border border-border bg-background/65 px-3 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40" data-testid="input-item-body" />
          {createItem.isError && <p className="mt-2 text-xs font-semibold text-destructive" role="alert" data-testid="status-create-error">Couldn’t add that note. Try again.</p>}
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="font-mono-custom text-[10px] text-muted-foreground">{body.length}/1000</span>
            <button type="submit" disabled={!title.trim() || !body.trim() || createItem.isPending} className="focus-ring flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-submit-item">
              {createItem.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {createItem.isPending ? 'Posting…' : 'Post to board'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function ItemCard({ item, onDeleted }: { item: BoardItem; onDeleted: () => void }) {
  const queryClient = useQueryClient();
  const toggleReaction = useToggleBoardItemReaction();
  const deleteItem = useDeleteBoardItem();
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = categoryMeta[item.category as Category] ?? categoryMeta.idea;
  const Icon = meta.icon;
  const handleReaction = () => {
    if (toggleReaction.isPending) return;
    toggleReaction.mutate({ id: item.id, data: { authorName: CURRENT_USER } }, {
      onSuccess: () => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: getListBoardItemsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListBoardActivityQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetBoardSummaryQueryKey() }),
        ]);
      },
    });
  };
  const handleDelete = () => {
    if (!window.confirm(`Remove “${item.title}” from the board?`)) return;
    deleteItem.mutate({ id: item.id }, {
      onSuccess: () => {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: getListBoardItemsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getListBoardActivityQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetBoardSummaryQueryKey() }),
        ]);
        onDeleted();
      },
    });
  };

  return (
    <article className="group animate-rise-in rounded-2xl border border-card-border bg-card p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] sm:p-6" data-testid={`card-board-item-${item.id}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${meta.tint}`}><Icon size={19} className={meta.iconClass} strokeWidth={1.9} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono-custom text-[10px] font-medium uppercase tracking-[.15em] text-muted-foreground">{meta.label}</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className="text-[11px] text-muted-foreground">{relativeTime(item.createdAt)}</span>
          </div>
          <h3 className="mt-2 font-display text-[18px] font-bold leading-[1.2] tracking-[-.035em] text-foreground" data-testid={`text-item-title-${item.id}`}>{item.title}</h3>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} className="focus-ring rounded-lg p-1.5 text-muted-foreground opacity-60 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100" aria-label={`More options for ${item.title}`} data-testid={`button-item-menu-${item.id}`}><MoreHorizontal size={17} /></button>
          {menuOpen && <div className="animate-pop-in absolute right-0 top-8 z-10 w-32 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg">
            <button type="button" onClick={handleDelete} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10" data-testid={`button-delete-item-${item.id}`}><Trash2 size={14} /> Remove note</button>
          </div>}
        </div>
      </div>
      <p className="mt-4 text-[13px] leading-6 text-muted-foreground" data-testid={`text-item-body-${item.id}`}>{item.body}</p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-extrabold text-primary">{initials(item.authorName)}</span>
          <span className="text-xs font-semibold text-foreground/70">{item.authorName}</span>
          {item.updatedAt !== item.createdAt && <span className="hidden text-[10px] text-muted-foreground sm:inline">edited</span>}
        </div>
        <button type="button" onClick={handleReaction} disabled={toggleReaction.isPending} className={`focus-ring flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 ${item.reactedByCurrentUser ? 'border-accent/50 bg-accent/30 text-foreground' : 'border-border bg-background text-muted-foreground hover:border-accent/60 hover:text-foreground'} disabled:cursor-wait disabled:opacity-60`} aria-pressed={item.reactedByCurrentUser} data-testid={`button-react-item-${item.id}`}>
          <Heart size={14} fill={item.reactedByCurrentUser ? 'currentColor' : 'none'} className={item.reactedByCurrentUser ? 'text-[#ba6547]' : ''} />
          <span>{item.reactions}</span>
          <span className="hidden sm:inline">{item.reactedByCurrentUser ? 'In the room' : 'React'}</span>
        </button>
      </div>
    </article>
  );
}

function ActivityFeed({ activities, loading, error }: { activities?: BoardActivity[]; loading: boolean; error: boolean }) {
  return (
    <section className="rounded-2xl border border-card-border bg-card p-5 shadow-[var(--shadow-sm)] sm:p-6" data-testid="activity-panel">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2"><Clock3 size={16} className="text-primary" /><p className="font-display text-base font-bold tracking-[-.025em]">Room pulse</p></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">The latest signs of life on your board.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-1 font-mono-custom text-[9px] uppercase tracking-[.14em] text-primary">Live</span>
      </div>
      <div className="mt-5">
        {loading ? <div className="space-y-4">{[1, 2, 3, 4].map((row) => <div key={row} className="flex gap-3"><div className="skeleton h-7 w-7 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-3 w-4/5 rounded" /><div className="skeleton h-2 w-1/3 rounded" /></div></div>)}</div> :
          error ? <div className="rounded-xl bg-destructive/8 p-3 text-xs font-semibold text-destructive" role="alert" data-testid="status-activity-error">Room pulse is taking a pause.</div> :
            activities && activities.length > 0 ? <div className="space-y-4">{activities.slice(0, 7).map((activity) => <div key={activity.id} className="flex gap-3" data-testid={`activity-row-${activity.id}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-extrabold text-secondary-foreground">{initials(activity.actorName)}</span>
              <div className="min-w-0 pt-0.5">
                <p className="text-xs leading-5 text-foreground/80"><strong className="font-bold text-foreground">{activity.actorName}</strong> {activityCopy(activity)} {activity.action === 'deleted' ? <span className="text-foreground/70">a note</span> : <strong className="font-semibold text-foreground">“{activity.itemTitle}”</strong>}</p>
                <p className="mt-1 font-mono-custom text-[9px] uppercase tracking-[.08em] text-muted-foreground">{relativeTime(activity.createdAt)}</p>
              </div>
            </div>)}</div> :
            <div className="rounded-xl border border-dashed border-border bg-background/45 px-4 py-7 text-center" data-testid="empty-activity"><Sparkles size={18} className="mx-auto text-accent" /><p className="mt-2 text-xs font-bold">The room is quiet.</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">Your first post will start the pulse.</p></div>}
      </div>
    </section>
  );
}

function BoardPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const itemsQuery = useListBoardItems();
  const activityQuery = useListBoardActivity();
  const summaryQuery = useGetBoardSummary();
  const items = itemsQuery.data;
  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (items ?? []).filter((item) => (filter === 'all' || item.category === filter) && (!normalizedSearch || `${item.title} ${item.body} ${item.authorName}`.toLowerCase().includes(normalizedSearch)));
  }, [items, filter, search]);
  const counts = useMemo(() => ({
    idea: (items ?? []).filter((item) => item.category === 'idea').length,
    question: (items ?? []).filter((item) => item.category === 'question').length,
    update: (items ?? []).filter((item) => item.category === 'update').length,
  }), [items]);
  const handleCreated = () => {
    setNotice('Note added to the room');
    window.setTimeout(() => setNotice(''), 2600);
  };
  const handleDeleted = () => {
    setNotice('Note removed from the room');
    window.setTimeout(() => setNotice(''), 2600);
  };
  const refresh = () => {
    void Promise.all([itemsQuery.refetch(), activityQuery.refetch(), summaryQuery.refetch()]);
  };

  return (
    <div className="min-h-[100dvh]">
      <header className="border-b border-border/80 bg-background/90 px-5 py-5 backdrop-blur-md sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Compass size={18} /></div>
            <span className="font-display text-[16px] font-bold tracking-[-.04em]">shared board</span>
          </div>
          <div className="hidden lg:block"><p className="font-mono-custom text-[10px] uppercase tracking-[.18em] text-muted-foreground">Tuesday, October 22</p><p className="mt-1 text-xs font-semibold text-foreground/70">A good day to leave a useful thought behind.</p></div>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={refresh} className="focus-ring hidden items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex" data-testid="button-refresh-board"><RefreshCw size={14} className={itemsQuery.isFetching ? 'animate-spin' : ''} /> Refresh</button>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[10px] font-extrabold text-accent-foreground lg:hidden">{initials(CURRENT_USER)}</span>
            <span className="hidden rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold sm:inline-flex" data-testid="text-current-user">Hi, {CURRENT_USER}</span>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-12">
          <div className="min-w-0">
            <div className="animate-rise-in">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /><span className="font-mono-custom text-[10px] font-medium uppercase tracking-[.2em] text-primary">The living workspace</span></div><h1 className="mt-3 max-w-[680px] font-display text-[42px] font-bold leading-[.96] tracking-[-.065em] text-foreground sm:text-[58px]">Make space for<br /><span className="text-primary">the good stuff.</span></h1><p className="mt-5 max-w-[470px] text-sm leading-6 text-muted-foreground">Ideas, open questions, and small wins — all in one place for the team to pick up and carry forward.</p></div>
                <div className="hidden rounded-2xl border border-border bg-card px-4 py-3 text-right sm:block"><p className="font-mono-custom text-[9px] uppercase tracking-[.16em] text-muted-foreground">Your contribution</p><p className="mt-1 font-display text-2xl font-bold tracking-[-.05em] text-primary">Always welcome</p></div>
              </div>
            </div>
            <div className="mt-9"><SummaryStrip summary={summaryQuery.data} loading={summaryQuery.isLoading} /></div>
            <div className="mt-8"><Composer onCreated={handleCreated} /></div>
            {notice && <div className="animate-pop-in fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg" role="status" data-testid="status-board-notice"><Check size={15} /> {notice}</div>}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h2 className="font-display text-xl font-bold tracking-[-.04em]">What’s happening</h2><p className="mt-1 text-xs text-muted-foreground">{filteredItems.length} {filteredItems.length === 1 ? 'note' : 'notes'} in view</p></div>
              <div className="flex items-center gap-2"><div className="relative flex-1 sm:w-48"><MessageCircle size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" className="focus-ring h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground/65 focus:border-primary/45" data-testid="input-search-items" /></div><button type="button" onClick={refresh} className="focus-ring flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-muted-foreground hover:bg-muted sm:hidden" data-testid="button-refresh-board-mobile"><RefreshCw size={14} /></button></div>
            </div>
            <div className="mt-5 flex items-center gap-1 overflow-x-auto border-b border-border/80 pb-3" role="tablist" aria-label="Filter board notes">
              {(['all', 'idea', 'question', 'update'] as Filter[]).map((option) => <button key={option} type="button" onClick={() => setFilter(option)} className={`focus-ring shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${filter === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} role="tab" aria-selected={filter === option} data-testid={`button-filter-${option}`}>{option === 'all' ? 'All notes' : categoryMeta[option].label}<span className={`ml-1.5 font-mono-custom text-[10px] ${filter === option ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{option === 'all' ? items?.length ?? 0 : counts[option]}</span></button>)}
            </div>
            <div className="mt-5 space-y-4">
              {itemsQuery.isLoading ? <div className="space-y-4">{[1, 2, 3].map((row) => <div key={row} className="rounded-2xl border border-card-border bg-card p-6"><div className="flex gap-4"><div className="skeleton h-10 w-10 rounded-[13px]" /><div className="flex-1 space-y-3"><div className="skeleton h-3 w-24 rounded" /><div className="skeleton h-5 w-3/5 rounded" /></div></div><div className="skeleton mt-5 h-10 w-full rounded" /></div>)}</div> :
                itemsQuery.isError ? <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center" role="alert" data-testid="status-items-error"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"><RefreshCw size={18} /></div><p className="mt-3 font-display text-base font-bold">The board needs a minute.</p><p className="mt-1 text-xs text-muted-foreground">We couldn’t load the notes right now.</p><button type="button" onClick={refresh} className="focus-ring mt-4 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground" data-testid="button-retry-items">Try again</button></div> :
                  filteredItems.length > 0 ? filteredItems.map((item) => <ItemCard key={item.id} item={item} onDeleted={handleDeleted} />) :
                    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center" data-testid="empty-board"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/50 text-primary"><Sparkles size={22} /></div><h3 className="mt-4 font-display text-lg font-bold tracking-[-.03em]">{search || filter !== 'all' ? 'Nothing matches that view' : 'The board is ready for its first note'}</h3><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-muted-foreground">{search || filter !== 'all' ? 'Try another search or filter to find the thread you’re looking for.' : 'Start with the thought you keep bringing up in conversation.'}</p>{search || filter !== 'all' ? <button type="button" onClick={() => { setSearch(''); setFilter('all'); }} className="focus-ring mt-5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted" data-testid="button-clear-filters">Clear filters</button> : null}</div>}
            </div>
          </div>
          <aside className="xl:pt-[226px]">
            <ActivityFeed activities={activityQuery.data} loading={activityQuery.isLoading} error={activityQuery.isError} />
            <div className="mt-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-[var(--shadow-md)]"><div className="flex items-center justify-between"><span className="font-mono-custom text-[9px] uppercase tracking-[.18em] text-primary-foreground/60">A gentle nudge</span><ArrowUpRight size={16} className="text-sidebar-primary" /></div><p className="mt-5 font-display text-[19px] font-bold leading-[1.15] tracking-[-.035em]">The best contribution is often the one that gets the next person unstuck.</p><p className="mt-4 text-[11px] leading-5 text-primary-foreground/65">No polish needed. Just leave enough signal for someone else to pick up.</p></div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <ErrorBoundary resetKey={useLocation()[0]}>
      <BoardShell>
        <Switch>
          <Route path="/" component={BoardPage} />
          <Route component={NotFound} />
        </Switch>
      </BoardShell>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
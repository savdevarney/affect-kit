import type { CheckinRepository, ExtractionRun, NewCheckin, ReviewChange, StoredCheckin, StoredWord, WordFeedback } from '../src/ports.ts';

/** The repository port in memory, for service tests: same contract as the D1 adapter, rows superseded not edited. */
export class MemoryCheckinRepository implements CheckinRepository {
  readonly checkins = new Map<string, Omit<StoredCheckin, 'words' | 'unmatched'>>();
  readonly words: (StoredWord & { checkinId: string; supersededAt: string | null })[] = [];
  readonly unmatched: { checkinId: string; said: string; runId: string }[] = [];
  readonly runs: (ExtractionRun & { checkinId: string })[] = [];
  readonly feedback: (WordFeedback & { checkinId: string })[] = [];

  async create(userId: string, record: NewCheckin): Promise<void> {
    if (this.checkins.has(record.checkin.id)) throw new Error('duplicate id');
    this.checkins.set(record.checkin.id, { ...record.checkin, userId, reviewedAt: null });
    const checkinId = record.checkin.id;
    this.runs.push(...record.runs.map((r) => ({ ...r, checkinId })));
    this.words.push(...record.words.map((w) => ({ ...w, checkinId, supersededAt: null })));
    this.unmatched.push(...record.unmatched.map((u) => ({ checkinId, said: u.said, runId: u.runId })));
  }

  async find(userId: string, id: string): Promise<StoredCheckin | null> {
    const c = this.checkins.get(id);
    if (!c || c.userId !== userId) return null;
    return {
      ...c,
      words: this.words.filter((w) => w.checkinId === id && w.supersededAt === null).map(({ checkinId: _c, supersededAt: _s, ...w }) => w),
      unmatched: this.unmatched.filter((u) => u.checkinId === id).map((u) => u.said),
    };
  }

  async review(userId: string, id: string, change: ReviewChange): Promise<void> {
    const c = this.checkins.get(id);
    if (!c || c.userId !== userId) throw new Error('not found');
    for (const w of this.words) if (change.supersede.includes(w.id)) w.supersededAt = change.reviewedAt;
    this.words.push(...change.insert.map((w) => ({ ...w, checkinId: id, supersededAt: null })));
    this.feedback.push(...change.feedback.map((f) => ({ ...f, checkinId: id })));
    c.reviewedAt = change.reviewedAt;
  }

  async days(userId: string, from: string, to: string): Promise<StoredCheckin[]> {
    const ids = [...this.checkins.values()]
      .filter((c) => c.userId === userId && c.localDate >= from && c.localDate <= to)
      .sort((x, y) => x.createdAt.localeCompare(y.createdAt))
      .map((c) => c.id);
    return Promise.all(ids.map(async (id) => (await this.find(userId, id))!));
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const c = this.checkins.get(id);
    if (!c || c.userId !== userId) return false;
    this.checkins.delete(id);
    return true;
  }
}

"use client";

import { Button } from "@/components/ui/button";
import { addComment } from "@/app/(dashboard)/projects/[id]/actions";

export type Comment = { id: string; body: string; created_at: string; author: string | null };
export type Activity = { id: number; action: string; created_at: string; actor: string | null };

function when(ts: string) {
  return new Date(ts).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

export function DiscussionTab({ projectId, comments, activity, canPost }: {
  projectId: string; comments: Comment[]; activity: Activity[]; canPost: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-semibold">พูดคุย</h3>
        {canPost && (
          <form action={async (fd) => { await addComment(projectId, fd); }} className="space-y-2">
            <textarea name="body" required placeholder="พิมพ์ข้อความ..."
              className="w-full min-h-20 rounded-md border bg-transparent px-3 py-2 text-sm" />
            <Button type="submit" size="sm">ส่ง</Button>
          </form>
        )}
        <div className="space-y-3">
          {comments.length === 0 && <p className="text-muted-foreground text-sm">ยังไม่มีความคิดเห็น</p>}
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{c.author ?? "ไม่ทราบ"}</span><span>{when(c.created_at)}</span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Activity Log</h3>
        <ol className="space-y-2 border-l pl-4">
          {activity.length === 0 && <p className="text-muted-foreground text-sm">ยังไม่มีกิจกรรม</p>}
          {activity.map((a) => (
            <li key={a.id} className="text-sm">
              <span className="font-medium">{a.actor ?? "ระบบ"}</span> {a.action}
              <div className="text-xs text-muted-foreground">{when(a.created_at)}</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Badge } from "@/components/ui/badge";

const ROLES = ["admin", "engineer", "viewer"] as const;
type Role = typeof ROLES[number];

async function changeRole(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") return;

  const id = String(formData.get("id"));
  const role = String(formData.get("role")) as Role;
  await supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: me }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("role,full_name").eq("id", user!.id).single(),
    supabase.from("profiles").select("id,full_name,role,email:id").order("full_name"),
  ]);
  const isAdmin = me?.role === "admin";

  const ROLE_COLOR: Record<string, string> = {
    admin: "bg-red-100 text-red-700", engineer: "bg-blue-100 text-blue-700", viewer: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team & Settings</h1>
        <p className="text-sm text-muted-foreground">คุณเข้าสู่ระบบเป็น: <strong>{me?.full_name}</strong> ({me?.role})</p>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">ชื่อ</th>
              <th className="text-left px-4 py-2 font-medium">บทบาท</th>
              {isAdmin && <th className="text-left px-4 py-2 font-medium">เปลี่ยนสิทธิ์</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {(members ?? []).map((m) => (
              <tr key={m.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{m.full_name || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[m.role] ?? ""}`}>
                    {m.role}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    {m.id === user!.id ? (
                      <span className="text-xs text-muted-foreground">คุณเอง</span>
                    ) : (
                      <form action={changeRole} className="flex gap-2 items-center">
                        <input type="hidden" name="id" value={m.id} />
                        <select name="role" defaultValue={m.role}
                          className="h-8 rounded border bg-transparent px-2 text-xs">
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button type="submit"
                          className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs">บันทึก</button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border p-4 text-sm space-y-1 text-muted-foreground">
        <p><strong className="text-foreground">admin</strong> — เพิ่ม/แก้ไขโครงการ งาน เอกสาร เคส และจัดการทีม</p>
        <p><strong className="text-foreground">engineer</strong> — เพิ่ม/แก้ไขได้ ยกเว้นจัดการสิทธิ์ทีม</p>
        <p><strong className="text-foreground">viewer</strong> — ดูได้อย่างเดียว</p>
      </div>
    </div>
  );
}

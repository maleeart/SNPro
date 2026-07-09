import { login } from "./actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">SNPro — เข้าสู่ระบบ</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <Input name="email" type="email" placeholder="อีเมล" required autoComplete="email" />
            <Input name="password" type="password" placeholder="รหัสผ่าน" required autoComplete="current-password" />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full">เข้าสู่ระบบ</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
